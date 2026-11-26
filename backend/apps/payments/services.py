"""پرداخت: شروع، پردازش callback (idempotent)، مغایرت‌گیری. منطق تصمیم در gateway/states/reconcile (خالص).

اصول: ۱) به callback مرورگر اعتماد نکن؛ همیشه verify سمت سرور ۲) مبلغ تأییدشده باید دقیقاً برابر باشد، وگرنه needs_review
۳) callback تکراری اثر دوباره ندارد ۴) پرداختِ سفارش لغو/پرداخت‌شده ⇒ needs_review (پول گرفته شده؛ بازپرداخت دستی).
"""
from __future__ import annotations

from datetime import timedelta

import structlog
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone

from apps.core import metrics
from apps.core.models import AuditLog
from apps.core.notifications import notify
from apps.core.security import fingerprint, log_security
from apps.orders.models import Order
from apps.orders.services import InvalidTransition, OrderError, change_status, verify_order_totals
from apps.orders.states import OrderStatus

from .gateway import SCENARIOS, FakeGateway, Gateway, GatewayError, HttpGateway, VerifyResult
from .models import Payment
from .reconcile import MIN_AGE_SECONDS, reconcile_action
from .states import InvalidPaymentTransition, PaymentStatus, ensure_transition, is_settled

log = structlog.get_logger(__name__)


class PaymentError(Exception):
    def __init__(self, code: str, message: str = ""):
        super().__init__(code)
        self.code, self.message = code, message


def get_gateway(name: str | None = None, scenario: str | None = None) -> Gateway:
    name = name or settings.PAYMENT_GATEWAY
    if name == "fake":
        sc = scenario if (scenario and settings.PAYMENT_SANDBOX) else settings.FAKE_GATEWAY_SCENARIO
        return FakeGateway(sc if sc in SCENARIOS else "success")
    if name == "http":
        return HttpGateway(
            start_url=settings.PAYMENT_START_URL,
            verify_url=settings.PAYMENT_VERIFY_URL,
            api_key=settings.PAYMENT_API_KEY,
            secret=settings.PAYMENT_CALLBACK_SECRET,
            amount_unit=settings.PAYMENT_AMOUNT_UNIT,
            refund_url=settings.PAYMENT_REFUND_URL,
        )
    raise ImproperlyConfigured(f"درگاه «{name}» تنظیم نشده است")


def callback_url(gateway: str) -> str:
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/payments/callback/{gateway}"


def start_payment(order: Order, scenario: str | None = None) -> str:
    """URL درگاه (ریدایرکت کاربر). PaymentError: not_payable | order_expired | payment_in_progress."""
    now = timezone.now()
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status != OrderStatus.PENDING.value:
            raise PaymentError("not_payable", "این سفارش قابل پرداخت نیست.")
        if order.expires_at and order.expires_at <= now:
            raise PaymentError("order_expired", "مهلت پرداخت این سفارش تمام شده است.")
        recent = Payment.objects.filter(order=order, status=PaymentStatus.REDIRECTED.value, created_at__gt=now - timedelta(seconds=settings.PAYMENT_RETRY_AFTER_SECONDS)).exists()
        if recent:
            raise PaymentError("payment_in_progress", "پرداخت قبلی هنوز در حال انجام است.")
        try:
            verify_order_totals(order)  # برابر بودن جمع ذخیرهشده با محاسبهٔ سرور
        except OrderError as exc:
            log_security("payment_amount_inconsistent", None, order_fp=fingerprint(order.number or "", settings.SECRET_KEY))
            raise PaymentError("amount_mismatch", "مبلغ سفارش قابل تأیید نیست؛ با پشتیبانی تماس بگیرید.") from exc
        gw = get_gateway(scenario=scenario)
        try:
            started = gw.start(order_number=order.number, amount_toman=order.total_toman, callback_url=callback_url(gw.name))
        except GatewayError as exc:
            raise PaymentError("gateway_unavailable", "درگاه پرداخت در دسترس نیست.") from exc
        Payment.objects.create(order=order, gateway=gw.name, amount_toman=order.total_toman, authority=started.authority, status=PaymentStatus.REDIRECTED.value)
        metrics.inc("codex_payments_started_total", gateway=gw.name)
        # در جریان پرداخت، سفارش نباید زیر دست کاربر منقضی شود
        hold = now + timedelta(minutes=settings.PAYMENT_HOLD_MINUTES)
        if order.expires_at is None or order.expires_at < hold:
            order.expires_at = hold
            order.save(update_fields=["expires_at", "updated_at"])
        AuditLog.record(order.user, "payment.start", "order", order.pk, after={"authority_prefix": started.authority[:12], "amount_toman": order.total_toman})
    return started.redirect_url


def _set(payment: Payment, status: PaymentStatus, result: VerifyResult | None = None, params: dict | None = None) -> None:
    ensure_transition(PaymentStatus(payment.status), status)
    payment.status = status.value
    if result and result.ref_id:
        payment.ref_id = result.ref_id
    if params is not None:
        payment.raw_callback = {str(k)[:40]: str(v)[:200] for k, v in list(params.items())[:20]}
    if status is PaymentStatus.VERIFIED:
        payment.verified_at = timezone.now()
    payment.save()
    if status is PaymentStatus.VERIFIED:
        metrics.inc("codex_orders_paid_total")
        notify(payment.order.user, "order.paid", "پرداخت موفق", f"سفارش {payment.order.number} پرداخت شد.", payload={"order": payment.order.number})
    elif status is PaymentStatus.FAILED:
        metrics.inc("codex_payments_failed_total", reason="verify")
    elif status is PaymentStatus.NEEDS_REVIEW:
        metrics.inc("codex_payments_failed_total", reason="needs_review")
    AuditLog.record(None, f"payment.{status.value}", "payment", payment.pk, after={"order_id": payment.order_id, "amount_toman": payment.amount_toman})


def _apply(payment: Payment, result: VerifyResult, params: dict | None = None) -> Payment:
    """نتیجهٔ تأییدشدهٔ درگاه را اعمال می‌کند (داخل تراکنش و با payment قفل‌شده)."""
    if result.status == "pending":
        return payment  # هنوز مبهم؛ مغایرت‌گیری بعداً
    if result.status == "failed":
        _set(payment, PaymentStatus.FAILED, result, params)
        return payment
    order = Order.objects.select_for_update().get(pk=payment.order_id)
    if result.paid_toman != payment.amount_toman:
        _set(payment, PaymentStatus.NEEDS_REVIEW, result, params)
        if order.status == OrderStatus.PENDING.value:
            change_status(order.pk, OrderStatus.NEEDS_REVIEW)
        log.warning("payment_amount_mismatch", payment=payment.pk, expected=payment.amount_toman, paid=result.paid_toman)
        return payment
    if order.status != OrderStatus.PENDING.value:
        # پول گرفته شده ولی سفارش دیگر pending نیست (لغو/منقضی یا قبلاً با تلاش دیگری پرداخت شده) ⇒ بازبینی/بازپرداخت دستی
        _set(payment, PaymentStatus.NEEDS_REVIEW, result, params)
        log.warning("payment_for_non_pending_order", payment=payment.pk, order_status=order.status)
        return payment
    _set(payment, PaymentStatus.VERIFIED, result, params)
    change_status(order.pk, OrderStatus.PAID)
    return payment


def handle_callback(gateway_name: str, params: dict[str, str]) -> Payment:
    """بازگشت کاربر از درگاه. PaymentError(unknown_payment) اگر authority ناشناخته. تکرار callback بی‌اثر است."""
    authority = (params.get("authority") or "").strip()
    if not authority:
        raise PaymentError("unknown_payment")
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related("order").filter(authority=authority, gateway=gateway_name).first()
        if payment is None:
            raise PaymentError("unknown_payment")
        if is_settled(PaymentStatus(payment.status)) or payment.status == PaymentStatus.NEEDS_REVIEW.value:
            return payment  # idempotent
        gw = get_gateway(gateway_name)
        try:
            result = gw.verify(authority=authority, amount_toman=payment.amount_toman, params=params)
        except GatewayError as exc:
            # پاسخ نامعتبر/امضای اشتباه ⇒ پرداخت را «نیاز به بازبینی» میکنیم، هرگز موفق فرض نمیشود.
            log.warning("gateway_verify_failed", payment=payment.pk, error=str(exc))
            result = VerifyResult("pending")
        return _apply(payment, result, params)


def reconcile_payments(now=None, batch: int = 100) -> dict[str, int]:
    """پرداخت‌های ریدایرکت‌شدهٔ جامانده را از درگاه استعلام می‌کند و بر پایهٔ reconcile_action تعیین تکلیف می‌کند."""
    now = now or timezone.now()
    counts = {"verified": 0, "failed": 0, "needs_review": 0, "kept": 0}
    cutoff = now - timedelta(seconds=MIN_AGE_SECONDS)
    ids = list(Payment.objects.filter(status=PaymentStatus.REDIRECTED.value, created_at__lte=cutoff).order_by("id").values_list("pk", flat=True)[:batch])
    for pk in ids:
        with transaction.atomic():
            payment = Payment.objects.select_for_update(skip_locked=True).filter(pk=pk, status=PaymentStatus.REDIRECTED.value).first()
            if payment is None:
                continue
            try:
                inquiry = get_gateway(payment.gateway).inquire(authority=payment.authority, amount_toman=payment.amount_toman)
            except Exception:  # noqa: BLE001 — قطعی درگاه: تصمیم بر پایهٔ سن پرداخت
                log.exception("payment_inquire_failed", payment=payment.pk)
                inquiry = None
            age = (now - payment.created_at).total_seconds()
            action = reconcile_action(PaymentStatus(payment.status), age, inquiry, payment.amount_toman)
            try:
                if action == "mark_verified" and inquiry:
                    _apply(payment, inquiry)
                    counts["verified" if payment.status == PaymentStatus.VERIFIED.value else "needs_review"] += 1
                elif action == "needs_review" and inquiry:
                    _apply(payment, inquiry)
                    counts["needs_review"] += 1
                elif action == "mark_failed":
                    _set(payment, PaymentStatus.FAILED)
                    counts["failed"] += 1
                else:
                    counts["kept"] += 1
            except (InvalidPaymentTransition, InvalidTransition):
                counts["kept"] += 1
    return counts


class _RefundGatewayFailure(Exception):
    """شکست در gateway.refund؛ بیرون از تراکنش به AuditLog تبدیل میشود."""

    def __init__(self, detail: str, after: dict):
        super().__init__(detail)
        self.detail, self.after = detail, after


def refund_payment(payment_id: int, actor=None) -> Payment:
    """بازپرداخت دستی (ادمین). درگاه آزمایشی فقط وضعیت را ثبت می‌کند؛ درگاه واقعی API بازپرداخت خودش را صدا میزند."""
    try:
        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(pk=payment_id)
            ensure_transition(PaymentStatus(payment.status), PaymentStatus.REFUNDED)
            try:
                result = get_gateway(payment.gateway).refund(
                    authority=payment.authority,
                    amount_toman=payment.amount_toman,
                    ref_id=payment.ref_id or "",
                )
            except Exception as exc:  # noqa: BLE001 — هر خطای درگاه/شبکه نباید وضعیت محلی را دروغین کند
                raise _RefundGatewayFailure(f"{type(exc).__name__}: {exc}", {"error": str(exc)[:200]}) from exc
            if result.status == "failed":
                raise _RefundGatewayFailure("gateway_refund_rejected", {"gateway_status": "failed"})
            payment.status = PaymentStatus.REFUNDED.value
            payment.save(update_fields=["status", "updated_at"])
            AuditLog.record(
                actor, "payment.refund", "payment", payment.pk,
                after={"amount_toman": payment.amount_toman, "gateway_status": result.status, "gateway_ref_id": result.ref_id or ""},
            )
            metrics.inc("codex_payments_refunded_total", gateway=payment.gateway)
            order = Order.objects.select_for_update().get(pk=payment.order_id)
            try:
                change_status(order.pk, OrderStatus.REFUNDED, actor=actor)
            except InvalidTransition:
                log.warning("refund_order_transition_not_allowed", order=order.pk, status=order.status)  # سفارش لغو بوده؛ فقط پرداخت بازپرداخت شد
    except _RefundGatewayFailure as exc:
        # خارج از تراکنش ثبت میشود تا با rollback آن پاک نشود.
        log.warning("gateway_refund_failed", payment=payment_id, detail=exc.detail)
        AuditLog.record(actor, "payment.refund_failed", "payment", payment_id, after=exc.after)
        raise PaymentError("refund_failed", "بازپرداخت درگاه ناموفق بود؛ وضعیت پرداخت تغییری نکرد.") from exc
    return payment
