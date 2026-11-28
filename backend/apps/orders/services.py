"""منطق سفارش: ثبت اتمی، idempotency، تغییر وضعیت و آزادسازی موجودی."""
from __future__ import annotations

from datetime import timedelta

import structlog
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.catalog.models import Product, StockMovement
from apps.catalog.rules import is_hidden_brand
from apps.core import metrics
from apps.core.models import AuditLog
from apps.core.notifications import notify
from apps.pricing.models import Coupon, CouponUse, ExchangeRate
from apps.pricing.money import to_toman
from apps.pricing.totals import compute_totals

from .idempotency import InvalidIdempotencyKey, request_fingerprint, validate_key
from .models import Order, OrderItem, ReturnRequest, Shipment, ShippingMethod
from .numbering import new_order_number
from .shipping import quote
from .states import InvalidTransition, OrderStatus, ensure_transition

log = structlog.get_logger(__name__)


class OrderError(Exception):
    pass


class EmptyOrder(OrderError):
    pass


class OutOfStock(OrderError):
    def __init__(self, slug: str):
        super().__init__(f"موجودی کافی نیست: {slug}")
        self.slug = slug


class IdempotencyConflict(OrderError):
    """همان کلید idempotency با محتوای متفاوت دوباره استفاده شده است (در API: ۴۰۹)."""

    def __init__(self) -> None:
        super().__init__("این کلید idempotency قبلاً با درخواست دیگری استفاده شده است")


class ShippingUnavailable(OrderError):
    """روش ارسال وجود ندارد یا برای این استان/مبلغ در دسترس نیست."""


class NotPurchasable(OrderError):
    def __init__(self, ref: str):
        super().__init__(f"این محصول قابل خرید نیست: {ref}")
        self.ref = ref


class ShipmentError(OrderError):
    """انتقال نامجاز در وضعیت ارسال."""


class CouponError(OrderError):
    """کوپن نامعتبر/منقضی/مصرف‌شده؛ کد در API به پیام فارسی نگاشت می‌شود."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _coupon_discount(user, code: str | None, subtotal: int) -> tuple[Coupon | None, int]:
    """کوپن را با قفل ردیف اعتبارسنجی می‌کند تا دو سفارش هم‌زمان سقف مصرف را رد نکنند.

    مقدار تخفیف فقط از subtotal سمت سرور محاسبه می‌شود؛ عدد ارسالی کلاینت هرگز استفاده نمی‌شود.
    """
    normalized = (code or "").strip()
    if not normalized:
        return None, 0
    coupon = Coupon.objects.select_for_update().filter(code__iexact=normalized).first()
    if coupon is None:
        raise CouponError("not_found")
    try:
        discount = coupon.discount_for(subtotal)
    except ValueError as exc:
        raise CouponError(str(exc)) from exc
    if coupon.max_uses_per_user is not None and user is not None:
        used = CouponUse.objects.filter(coupon=coupon, user=user).count()
        if used >= coupon.max_uses_per_user:
            raise CouponError("user_limit")
    return coupon, discount


def _merge(items) -> dict[int, int]:
    merged: dict[int, int] = {}
    for pid, qty in items:
        if isinstance(qty, bool) or not isinstance(qty, int) or qty <= 0:
            raise OrderError("تعداد باید عدد صحیح مثبت باشد")
        merged[int(pid)] = merged.get(int(pid), 0) + qty
    return merged


def _replay(existing: Order, fingerprint: str) -> Order:
    """سفارش قبلیِ همین کاربر با همین کلید: اگر محتوا یکی است همان را برگردان، وگرنه ۴۰۹."""
    if existing.request_hash and existing.request_hash != fingerprint:
        raise IdempotencyConflict()
    return existing


def place_order(
    user,
    items,
    idempotency_key: str,
    address: dict | None = None,
    shipping_code: str | None = None,
    coupon_code: str | None = None,
) -> Order:
    """ثبت سفارش. قیمت همیشه از دیتابیس می‌آید؛ کلاینت فقط (شناسهٔ محصول، تعداد) می‌فرستد.

    - کلید idempotency باید UUID باشد و فقط در محدودهٔ **همین کاربر** یکتاست؛ کاربر دیگر هرگز سفارش را نمی‌بیند.
    - ارسال تکراری با همان کلید و همان محتوا (اقلام، نشانی، روش ارسال، کوپن) همان سفارش را برمی‌گرداند؛ محتوای متفاوت ⇒ IdempotencyConflict.
    - محصولات به ترتیب شناسه قفل می‌شوند (جلوگیری از deadlock).
    - کوپن با قفل ردیف اعتبارسنجی می‌شود و تخفیف فقط سمت سرور محاسبه/ثبت می‌شود (CouponUse + used_count).
    - جمع: کالاها − تخفیف + ارسال + مالیات (settings.VAT_PERCENT) به‌صورت ردیف‌های جدا.
    - هر خطا کل تراکنش را برمی‌گرداند: نه سفارشی می‌ماند و نه موجودی کم می‌شود.
    """
    try:
        idempotency_key = validate_key(idempotency_key)
    except InvalidIdempotencyKey as exc:
        raise OrderError(str(exc)) from exc
    merged = _merge(items)
    if not merged:
        raise EmptyOrder("سبد خالی است")
    meta = {}
    if shipping_code:
        meta["shipping"] = shipping_code
    if coupon_code and coupon_code.strip():
        meta["coupon"] = coupon_code.strip().upper()
    fingerprint = request_fingerprint(merged.items(), address, meta or None)
    with transaction.atomic():
        existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
        if existing:
            return _replay(existing, fingerprint)
        rate = ExchangeRate.current()
        order = None
        for _attempt in range(5):  # برخورد شمارهٔ عمومی (۳۲^۸ حالت) تقریباً غیرممکن است؛ ولی امن می‌مانیم
            try:
                with transaction.atomic():  # savepoint: برخورد کلید/شماره تراکنش اصلی را خراب نکند
                    order = Order.objects.create(
                        user=user, idempotency_key=idempotency_key, request_hash=fingerprint, number=new_order_number(), rate_used=rate.toman_per_usd,
                        address=address or {}, shipping_code=shipping_code or "", expires_at=timezone.now() + timedelta(minutes=settings.ORDER_EXPIRY_MINUTES),
                    )
                break
            except IntegrityError:
                existing = Order.objects.filter(user=user, idempotency_key=idempotency_key).first()
                if existing:  # درخواست هم‌زمان با همان کلید برنده شد
                    return _replay(existing, fingerprint)
        if order is None:
            raise OrderError("ثبت سفارش ممکن نشد؛ دوباره تلاش کنید")

        total_usd = subtotal = 0
        for pid in sorted(merged):
            qty = merged[pid]
            product = Product.objects.select_for_update().filter(pk=pid).first()
            if product is None or product.status != Product.Status.ACTIVE or product.price_usd_cents is None:
                raise NotPurchasable(product.slug if product else str(pid))
            # برند ممکن است پس از افزوده شدن به سبد پنهان شده باشد؛ هنگام ثبت سفارش دوباره بررسی میشود.
            if is_hidden_brand(product.brand, settings.HIDDEN_BRANDS):
                raise NotPurchasable(product.slug)
            if product.stock < qty:
                raise OutOfStock(product.slug)
            product.stock -= qty
            product.save(update_fields=["stock", "updated_at"])
            StockMovement.objects.create(
                product=product,
                delta=-qty,
                reason=StockMovement.Reason.ORDER,
                note=order.number or "",
                actor=user if getattr(user, "pk", None) else None,
            )
            unit_usd = product.final_usd_cents
            unit_toman = to_toman(unit_usd, rate.toman_per_usd)
            OrderItem.objects.create(order=order, product=product, qty=qty, unit_usd_cents=unit_usd, unit_toman=unit_toman)
            total_usd += unit_usd * qty
            subtotal += unit_toman * qty

        coupon, discount = _coupon_discount(user, coupon_code, subtotal)

        shipping = 0
        if shipping_code:
            method = ShippingMethod.objects.filter(code=shipping_code).first()
            # آستانهٔ ارسال رایگان روی مبلغ پس از تخفیف سنجیده می‌شود (هم‌راستا با نمایش تسویه).
            cost = quote(method.as_rule(), (address or {}).get("province", ""), subtotal - discount) if method else None
            if cost is None:
                raise ShippingUnavailable(shipping_code)
            shipping = cost
        t = compute_totals(subtotal, shipping, settings.VAT_PERCENT, discount)
        order.total_usd_cents = total_usd
        order.subtotal_toman = t.subtotal
        order.shipping_toman = t.shipping
        order.tax_toman = t.tax
        order.discount_toman = t.discount
        order.coupon_code = coupon.code if coupon else ""
        order.total_toman = t.total
        order.save(
            update_fields=[
                "total_usd_cents", "subtotal_toman", "shipping_toman", "tax_toman",
                "discount_toman", "coupon_code", "total_toman", "updated_at",
            ]
        )
        if coupon:
            coupon.used_count += 1
            coupon.save(update_fields=["used_count"])
            CouponUse.objects.create(
                coupon=coupon,
                order_number=order.number or "",
                user=user if getattr(user, "pk", None) else None,
                discount_toman=t.discount,
            )
            metrics.inc("digital_shopping_coupon_applied_total", kind=coupon.kind)
        metrics.inc("digital_shopping_orders_created_total", status=order.status)
        AuditLog.record(
            user, "order.create", "order", order.pk,
            after={
                "number": order.number,
                "total_toman": t.total,
                "discount_toman": t.discount,
                "coupon": order.coupon_code,
                "rate_used": rate.toman_per_usd,
            },
        )
    return order


def replay_for(user, idempotency_key: str, address: dict, shipping_code: str | None, coupon_code: str | None = None) -> Order | None:
    """اگر برای (کاربر، کلید) سفارشی هست: همان را برگردان (تکرار/دوبار کلیک پس از خالی‌شدن سبد)، یا IdempotencyConflict اگر
    نشانی/روش ارسال/کوپن فرق کرده. اقلام را نمی‌توان مقایسه کرد (سبد مصرف شده)؛ اثر انگشت کامل در place_order برای درخواست‌های هم‌زمان است."""
    existing = Order.objects.filter(user=user, idempotency_key=validate_key(idempotency_key)).first()
    if existing is None:
        return None
    if (
        existing.shipping_code != (shipping_code or "")
        or existing.address != address
        or (existing.coupon_code or "").strip().upper() != (coupon_code or "").strip().upper()
    ):
        raise IdempotencyConflict()
    return existing


def create_order_from_cart(
    user,
    cart,
    idempotency_key: str,
    address: dict,
    shipping_code: str | None,
    coupon_code: str | None = None,
) -> Order:
    """سفارش از سبد **سمت سرور** (منبع حقیقت)؛ پس از موفقیت سبد خالی می‌شود. تکرار idempotent سفارش قبلی را برمی‌گرداند."""
    replay = replay_for(user, idempotency_key, address, shipping_code, coupon_code)
    if replay is not None:
        return replay
    items = [(i.product_id, i.qty) for i in cart.items.all()] if cart is not None else []
    with transaction.atomic():
        order = place_order(user, items, idempotency_key, address, shipping_code, coupon_code)
        cart.items.all().delete()
    return order


def verify_order_totals(order: Order) -> None:
    """دفاع در عمق پیش از پرداخت: جمع ذخیرهشده باید دقیقاً برابر محاسبهٔ سرور باشد.

    اگر دیتابیس دستکاری شده یا migration ناقصی جمع را جابجا کرده باشد، پرداخت آغاز نمیشود.
    """
    items = list(order.items.all())
    subtotal = sum(i.unit_toman * i.qty for i in items)
    usd = sum(i.unit_usd_cents * i.qty for i in items)
    if not items or subtotal != order.subtotal_toman or usd != order.total_usd_cents:
        raise OrderError("مبلغ سفارش با اقلام آن همخوانی ندارد.")
    if order.discount_toman < 0 or order.discount_toman > order.subtotal_toman:
        raise OrderError("تخفیف سفارش نامعتبر است.")
    if bool(order.coupon_code) != (order.discount_toman > 0):
        raise OrderError("کوپن سفارش نامعتبر است.")
    # نرخ ذخیرهشده باید همان نرخی باشد که تومان هر قلم بر اساس آن محاسبه شد.
    if isinstance(order.rate_used, bool) or not isinstance(order.rate_used, int) or order.rate_used <= 0:
        raise OrderError("نرخ ارز سفارش نامعتبر است.")
    if not ExchangeRate.objects.filter(toman_per_usd=order.rate_used).exists():
        raise OrderError("نرخ ارز ثبتشدهٔ سفارش در تاریخچهٔ نرخها وجود ندارد.")
    if any(i.unit_toman != to_toman(i.unit_usd_cents, order.rate_used) for i in items):
        raise OrderError("نرخ ارز ثبتشده با اقلام سفارش همخوانی ندارد.")
    # هزینهٔ ارسال باید دوباره از روی روش/استان/مبلغ پس از تخفیف محاسبه شود؛
    # در غیر این صورت یک دستکاری هماهنگ shipping/total از پرداخت عبور میکند.
    code = (order.shipping_code or "").strip()
    if not code:
        if order.shipping_toman != 0:
            raise OrderError("هزینهٔ ارسال سفارش نامعتبر است.")
    else:
        method = ShippingMethod.objects.filter(code=code).first()
        expected = quote(method.as_rule(), (order.address or {}).get("province", ""), order.subtotal_toman - order.discount_toman) if method else None
        if expected is None or expected != order.shipping_toman:
            raise OrderError("هزینهٔ ارسال سفارش نامعتبر است.")
    t = compute_totals(order.subtotal_toman, order.shipping_toman, settings.VAT_PERCENT, order.discount_toman)
    if (t.tax, t.total) != (order.tax_toman, order.total_toman):
        raise OrderError("جمع نهایی سفارش نامعتبر است.")
    if order.total_toman <= 0:
        raise OrderError("مبلغ قابل پرداخت نامعتبر است.")


def cancel_order(user, number: str) -> Order:
    """لغو توسط خود کاربر؛ فقط pending. مالکیت در همان query بررسی می‌شود."""
    order = Order.objects.filter(user=user, number=number).first()
    if order is None:
        raise Order.DoesNotExist(number)
    return change_status(order.pk, OrderStatus.CANCELLED)


def _restock(order: Order) -> None:
    for item in order.items.order_by("product_id"):
        product = Product.objects.select_for_update().get(pk=item.product_id)
        product.stock += item.qty
        product.save(update_fields=["stock", "updated_at"])
        StockMovement.objects.create(
            product=product,
            delta=item.qty,
            reason=StockMovement.Reason.CANCEL,
            note=order.number or "",
            actor=order.user if getattr(order, "user_id", None) else None,
        )


# ---------------- ارسال (Shipment) ----------------

SHIPMENT_TRANSITIONS: dict[Shipment.Status, frozenset[Shipment.Status]] = {
    Shipment.Status.PREPARING: frozenset({Shipment.Status.HANDED_OVER, Shipment.Status.IN_TRANSIT, Shipment.Status.DELIVERED, Shipment.Status.FAILED}),
    Shipment.Status.HANDED_OVER: frozenset({Shipment.Status.IN_TRANSIT, Shipment.Status.DELIVERED, Shipment.Status.FAILED}),
    Shipment.Status.IN_TRANSIT: frozenset({Shipment.Status.DELIVERED, Shipment.Status.FAILED}),
    Shipment.Status.DELIVERED: frozenset(),
    Shipment.Status.FAILED: frozenset(),
}


def ensure_shipment(order: Order, *, carrier: str = "", tracking_number: str = "", eta: str = "", actor=None) -> Shipment:
    """یک ردیف Shipment برای سفارش بسازد (اگر قبلاً هست همان را برگرداند؛ idempotent)."""
    with transaction.atomic():
        shipment, created = Shipment.objects.get_or_create(
            order=order,
            defaults={"carrier": carrier[:80], "tracking_number": tracking_number[:80], "eta": eta[:80]},
        )
        if not created:
            changes = {}
            for field, value in (("carrier", carrier), ("tracking_number", tracking_number), ("eta", eta)):
                value = value[:80]
                if value and not getattr(shipment, field):
                    changes[field] = value
            if changes:
                for field, value in changes.items():
                    setattr(shipment, field, value)
                shipment.save(update_fields=[*changes, "updated_at"])
        AuditLog.record(actor, "shipment.ensure" if created else "shipment.updated", "shipment", shipment.pk, after={"status": shipment.status, "order": order.number})
    return shipment


def advance_shipment(shipment_id: int, target: Shipment.Status, *, actor=None) -> Shipment:
    """پیشبرد وضعیت ارسال فقط از طریق گذارهای مجاز؛ زمانهای تحویل/ارسال تکمیل میشود."""
    with transaction.atomic():
        shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
        current = Shipment.Status(shipment.status)
        if target not in SHIPMENT_TRANSITIONS[current]:
            raise ShipmentError(f"انتقال {current.value} → {target.value} مجاز نیست")
        shipment.status = target.value
        now = timezone.now()
        if target in (Shipment.Status.HANDED_OVER, Shipment.Status.IN_TRANSIT, Shipment.Status.DELIVERED) and shipment.shipped_at is None:
            shipment.shipped_at = now
        if target is Shipment.Status.DELIVERED and shipment.delivered_at is None:
            shipment.delivered_at = now
        shipment.save(update_fields=["status", "shipped_at", "delivered_at", "updated_at"])
        AuditLog.record(actor, "shipment.status", "shipment", shipment.pk, before={"status": current.value}, after={"status": target.value})
    return shipment


def sync_shipment_for_order(order: Order | int, *, actor=None) -> Shipment | None:
    """هنگامی که سفارش shipped/delivered میشود، ردیف ارسال را بسازد و متناسب با آن پیش ببرد."""
    order = Order.objects.get(pk=order) if isinstance(order, int) else order
    if order.status == OrderStatus.SHIPPED.value:
        target = Shipment.Status.HANDED_OVER
    elif order.status == OrderStatus.DELIVERED.value:
        target = Shipment.Status.DELIVERED
    else:
        return None
    shipment = ensure_shipment(order, carrier=(order.shipping_code or "")[:80], actor=actor)
    if shipment.status != target.value and target in SHIPMENT_TRANSITIONS[Shipment.Status(shipment.status)]:
        return advance_shipment(shipment.pk, target, actor=actor)
    return shipment


def change_status(order_id: int, target: OrderStatus, actor=None) -> Order:
    """تغییر وضعیت فقط از گذارهای مجاز؛ لغو سفارش پرداخت‌نشده موجودی را برمی‌گرداند."""
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        current = OrderStatus(order.status)
        ensure_transition(current, target)
        order.status = target.value
        order.save(update_fields=["status", "updated_at"])
        if target is OrderStatus.CANCELLED and current in (OrderStatus.PENDING, OrderStatus.NEEDS_REVIEW):
            _restock(order)
        AuditLog.record(actor, "order.status", "order", order.pk, before={"status": current.value}, after={"status": target.value})
        sync_shipment_for_order(order, actor=actor)
    return order


def expire_pending_orders(now=None) -> int:
    """نام قدیمی؛ همان run_expiry (سازگاری با کدهای موجود)."""
    return run_expiry(now)


def run_expiry(now=None) -> int:
    """نقطهٔ ورود کارهای زمان‌بندی‌شده و دستور مدیریتی: لغو سفارش‌های منقضی + لاگ + ثبت خلاصه در AuditLog."""
    now = now or timezone.now()
    ids = list(Order.objects.filter(status=OrderStatus.PENDING.value, expires_at__lt=now).values_list("pk", flat=True))
    cancelled = []
    for pk in ids:
        try:
            change_status(pk, OrderStatus.CANCELLED)
            cancelled.append(pk)
        except InvalidTransition:
            continue  # در فاصلهٔ بین خواندن و قفل، پرداخت شده است
    if cancelled:
        AuditLog.record(None, "order.expire_batch", "order", "batch", after={"count": len(cancelled), "order_ids": cancelled})
    log.info("orders_expired", count=len(cancelled), candidates=len(ids))
    return len(cancelled)


# ---------------- مرجوعی ----------------


class ReturnError(OrderError):
    pass


def request_return(user, number: str, item_id: int, reason: str) -> ReturnRequest:
    """درخواست مرجوعی تنها برای سفارش تحویلشده و در مهلت ۷ روزه؛ هر قلم یکبار قابل درخواست است."""
    order = Order.objects.filter(user=user, number=number).first()
    if order is None:
        raise ReturnError("سفارش پیدا نشد.")
    if order.status != OrderStatus.DELIVERED.value:
        raise ReturnError("تنها سفارشهای تحویلشده قابل مرجوعیاند.")
    if timezone.now() - order.created_at > timedelta(days=settings.RETURN_WINDOW_DAYS):
        raise ReturnError("مهلت مرجوعی تمام شده است.")
    item = OrderItem.objects.filter(order=order, pk=item_id).first()
    if item is None:
        raise ReturnError("قلم انتخابشده متعلق به این سفارش نیست.")
    if ReturnRequest.objects.filter(item=item).exists():
        raise ReturnError("برای این قلم درخواست قبلی ثبت شده است.")
    text = (reason or "").strip()
    if not text or len(text) > 500:
        raise ReturnError("دلیل مرجوعی معتبر نیست.")
    row = ReturnRequest.objects.create(order=order, item=item, reason=text)
    AuditLog.record(user, "return.requested", "return_request", row.pk, after={"order": order.number, "item": item.pk})
    notify(user, "return.requested", "درخواست مرجوعی ثبت شد", f"شمارهٔ پیگیری {row.pk} — وضعیت: در انتظار بررسی")
    return row


def approve_return(row: ReturnRequest, actor=None) -> ReturnRequest:
    """تأیید مرجوعی: بازگشت موجودی و ثبت دفتر StockMovement."""
    with transaction.atomic():
        row = ReturnRequest.objects.select_for_update().select_related("item").get(pk=row.pk)
        if row.status != ReturnRequest.Status.REQUESTED:
            raise ReturnError("وضعیت درخواست قابل تأیید نیست.")
        row.status = ReturnRequest.Status.APPROVED
        row.save(update_fields=["status", "updated_at"])
        product = Product.objects.select_for_update().get(pk=row.item.product_id)
        product.stock += row.item.qty
        product.save(update_fields=["stock", "updated_at"])
        StockMovement.objects.create(product=product, delta=row.item.qty, reason=StockMovement.Reason.RETURN, note=row.order.number, actor=actor)
        AuditLog.record(actor, "return.approved", "return_request", row.pk, after={"stock_delta": row.item.qty})
        notify(row.order.user, "return.approved", "مرجوعی تأیید شد", "موجودی کالا بازگشت و مراحل بازپرداخت آغاز شد.")
    return row


def refund_return(row: ReturnRequest, actor=None) -> ReturnRequest:
    """بازپرداخت نهایی و تغییر وضعیت سفارش به refunded (در صورت مجاز بودن انتقال)."""
    with transaction.atomic():
        row = ReturnRequest.objects.select_for_update().get(pk=row.pk)
        if row.status not in {ReturnRequest.Status.REQUESTED, ReturnRequest.Status.APPROVED}:
            raise ReturnError("وضعیت درخواست قابل بازپرداخت نیست.")
        row.status = ReturnRequest.Status.REFUNDED
        row.save(update_fields=["status", "updated_at"])
        try:
            change_status(row.order_id, OrderStatus.REFUNDED, actor=actor)
        except InvalidTransition:
            pass  # سفارش از قبل refunded/cancelled است؛ وضعیت درخواست ثبت میشود
        AuditLog.record(actor, "return.refunded", "return_request", row.pk, after={"order": row.order.number})
        notify(row.order.user, "return.refunded", "بازپرداخت انجام شد", f"سفارش {row.order.number} بازپرداخت شد.")
    return row
