"""پرداخت sandbox: شروع، callback، تکرار، مبلغ نابرابر، timeout/مغایرت‌گیری، سفارش منقضی/لغو، مالکیت (نیاز به Postgres)."""
import uuid
from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.orders.models import Order
from apps.orders.services import place_order, run_expiry
from apps.orders.states import OrderStatus
from apps.payments.models import Payment
from apps.payments.services import PaymentError, handle_callback, reconcile_payments, refund_payment, start_payment
from tests.factories import ProductFactory, UserFactory
from tests.helpers import API, jpost

pytestmark = pytest.mark.django_db


@pytest.fixture
def pending(rate):
    user = UserFactory()
    p = ProductFactory(price_usd_cents=1000, stock=5)
    order = place_order(user, [(p.pk, 1)], str(uuid.uuid4()), {"province": "تهران"})
    return user, order


def params_of(url):
    from urllib.parse import parse_qsl, urlparse

    return dict(parse_qsl(urlparse(url).query))


def test_success_marks_payment_verified_and_order_paid(pending):
    _, order = pending
    url = start_payment(order, scenario="success")
    assert "/payments/callback/fake" in url
    pay = handle_callback("fake", params_of(url))
    order.refresh_from_db()
    assert (pay.status, order.status) == ("verified", "paid")
    assert pay.amount_toman == order.total_toman and pay.verified_at and pay.ref_id.startswith("REF-")


def test_duplicate_callback_has_no_second_effect(pending):
    _, order = pending
    params = params_of(start_payment(order, scenario="duplicate"))
    a = handle_callback("fake", params)
    b = handle_callback("fake", params)
    assert a.pk == b.pk and Payment.objects.count() == 1
    from apps.core.models import AuditLog

    assert AuditLog.objects.filter(action="payment.verified").count() == 1


def test_user_cancelled_payment_fails_and_order_stays_pending_for_retry(pending, settings):
    settings.PAYMENT_RETRY_AFTER_SECONDS = 0
    _, order = pending
    pay = handle_callback("fake", params_of(start_payment(order, scenario="failed")))
    order.refresh_from_db()
    assert (pay.status, order.status) == ("failed", "pending")
    pay2 = handle_callback("fake", params_of(start_payment(order, scenario="success")))  # تلاش دوباره
    order.refresh_from_db()
    assert pay2.status == "verified" and order.status == "paid" and Payment.objects.count() == 2


def test_wrong_amount_goes_to_review_and_order_needs_review(pending):
    _, order = pending
    pay = handle_callback("fake", params_of(start_payment(order, scenario="wrong_amount")))
    order.refresh_from_db()
    assert (pay.status, order.status) == ("needs_review", OrderStatus.NEEDS_REVIEW.value)


def test_callback_params_are_not_trusted_and_unknown_authority_rejected(pending):
    _, order = pending
    url = start_payment(order, scenario="success")
    forged = {**params_of(url), "status": "NOK"}  # کاربر وضعیت را دست‌کاری کرد
    pay = handle_callback("fake", forged)
    assert pay.status == "failed"
    with pytest.raises(PaymentError):
        handle_callback("fake", {"authority": "FAKEdeadbeef.success", "status": "OK"})
    with pytest.raises(PaymentError):
        handle_callback("fake", {})
    with pytest.raises(PaymentError):
        handle_callback("zarinpal", params_of(url))  # درگاه دیگر با همان authority


def test_payment_in_progress_blocks_second_start_until_window(pending, settings):
    settings.PAYMENT_RETRY_AFTER_SECONDS = 120
    _, order = pending
    start_payment(order)
    with pytest.raises(PaymentError) as e:
        start_payment(order)
    assert e.value.code == "payment_in_progress"
    Payment.objects.update(created_at=timezone.now() - timedelta(seconds=121))
    start_payment(order)  # حالا مجاز
    assert Payment.objects.count() == 2


def test_cannot_pay_expired_cancelled_or_paid_orders(pending):
    _, order = pending
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(seconds=1))
    with pytest.raises(PaymentError) as e:
        start_payment(order)
    assert e.value.code == "order_expired"
    run_expiry()
    order.refresh_from_db()
    assert order.status == "cancelled"
    with pytest.raises(PaymentError) as e:
        start_payment(order)
    assert e.value.code == "not_payable"


def test_starting_payment_extends_order_hold(pending, settings):
    settings.PAYMENT_HOLD_MINUTES = 30
    _, order = pending
    before = Order.objects.get(pk=order.pk).expires_at
    start_payment(order)
    after = Order.objects.get(pk=order.pk).expires_at
    assert after > before and after >= timezone.now() + timedelta(minutes=29)
    assert run_expiry(now=before + timedelta(minutes=1)) == 0  # در جریان پرداخت منقضی نمی‌شود


def test_payment_after_order_cancelled_needs_review_not_paid(pending):
    _, order = pending
    url = start_payment(order, scenario="success")
    Order.objects.filter(pk=order.pk).update(status="cancelled")  # مثلاً کاربر در تب دیگر لغو کرد
    pay = handle_callback("fake", params_of(url))
    order.refresh_from_db()
    assert pay.status == "needs_review" and order.status == "cancelled"  # پول گرفته شده؛ بازبینی دستی


def test_second_successful_payment_for_already_paid_order_needs_review(pending, settings):
    settings.PAYMENT_RETRY_AFTER_SECONDS = 0
    _, order = pending
    u1 = start_payment(order, scenario="success")
    u2 = start_payment(order, scenario="success")
    assert handle_callback("fake", params_of(u1)).status == "verified"
    assert handle_callback("fake", params_of(u2)).status == "needs_review"  # پرداخت تکراری ⇒ بازپرداخت دستی


def test_timeout_scenario_is_resolved_by_reconciliation(pending):
    _, order = pending
    pay = handle_callback("fake", params_of(start_payment(order, scenario="timeout")))
    assert pay.status == "redirected"  # نتیجهٔ مبهم
    assert reconcile_payments() == {"verified": 0, "failed": 0, "needs_review": 0, "kept": 0}  # هنوز زود است
    Payment.objects.update(created_at=timezone.now() - timedelta(minutes=11))
    assert reconcile_payments()["verified"] == 1
    order.refresh_from_db()
    assert order.status == "paid"
    assert reconcile_payments()["verified"] == 0  # دوباره اثری ندارد


def test_reconcile_gives_up_on_old_unresolved_payment(pending):
    _, order = pending
    start_payment(order, scenario="failed")  # callback هرگز نیامد؛ استعلام «failed» می‌گوید
    Payment.objects.update(created_at=timezone.now() - timedelta(minutes=15))
    assert reconcile_payments()["failed"] == 1


def test_refund_marks_payment_and_order(pending):
    _, order = pending
    pay = handle_callback("fake", params_of(start_payment(order)))
    refund_payment(pay.pk)
    pay.refresh_from_db()
    assert pay.status == "refunded"
    with pytest.raises(Exception):
        refund_payment(pay.pk)  # بازپرداخت دوباره مجاز نیست


def test_refund_success_is_audited_with_gateway_result(pending):
    from apps.core.models import AuditLog

    _, order = pending
    pay = handle_callback("fake", params_of(start_payment(order)))
    refund_payment(pay.pk)
    log = AuditLog.objects.get(action="payment.refund")
    assert log.after["gateway_status"] == "refunded"
    assert log.after["amount_toman"] == pay.amount_toman


def test_refund_failure_does_not_change_local_status_and_is_audited(pending, monkeypatch):
    from types import SimpleNamespace

    import apps.payments.services as svc
    from apps.core.models import AuditLog
    from apps.payments.gateway import GatewayError, RefundResult

    _, order = pending
    pay = handle_callback("fake", params_of(start_payment(order)))

    def boom(**kwargs):
        raise GatewayError("network down")

    monkeypatch.setattr(svc, "get_gateway", lambda name=None: SimpleNamespace(refund=boom))
    with pytest.raises(PaymentError) as exc:
        svc.refund_payment(pay.pk)
    assert exc.value.code == "refund_failed"
    pay.refresh_from_db()
    assert pay.status == "verified"
    assert AuditLog.objects.filter(action="payment.refund_failed").exists()

    monkeypatch.setattr(svc, "get_gateway", lambda name=None: SimpleNamespace(refund=lambda **kw: RefundResult("failed")))
    with pytest.raises(PaymentError):
        svc.refund_payment(pay.pk)
    pay.refresh_from_db()
    assert pay.status == "verified"
    assert AuditLog.objects.filter(action="payment.refund_failed").count() == 2


# ---------------- HTTP ----------------


def test_pay_endpoint_owner_only_and_returns_gateway_url(pending):
    user, order = pending
    c = Client()
    c.force_login(user)
    r = jpost(c, f"/orders/{order.number}/pay", {"scenario": "success"})
    assert r.status_code == 200 and "/payments/callback/fake" in r.json()["redirect_url"]
    other = Client()
    other.force_login(UserFactory())
    assert jpost(other, f"/orders/{order.number}/pay").status_code == 404
    assert jpost(Client(), f"/orders/{order.number}/pay").status_code == 401
    again = jpost(c, f"/orders/{order.number}/pay")
    assert again.status_code == 409 and again.json()["code"] == "payment_in_progress"


def test_scenario_ignored_outside_sandbox(pending, settings):
    settings.PAYMENT_SANDBOX = False
    settings.FAKE_GATEWAY_SCENARIO = "success"
    user, order = pending
    c = Client()
    c.force_login(user)
    url = jpost(c, f"/orders/{order.number}/pay", {"scenario": "failed"}).json()["redirect_url"]
    assert ".success" in params_of(url)["authority"]  # سناریوی کلاینت اثر نداشت


def test_callback_view_redirects_to_frontend_order_page(pending, settings):
    settings.FRONTEND_URL = "https://shop.example"
    user, order = pending
    c = Client()
    c.force_login(user)
    url = jpost(c, f"/orders/{order.number}/pay", {"scenario": "success"}).json()["redirect_url"]
    r = Client().get(url.replace("http://localhost:8000", ""))
    assert r.status_code == 302 and r["Location"] == f"https://shop.example/orders/{order.number}?payment=success"
    assert Client().get("/payments/callback/fake?authority=FAKEx.success&status=OK").status_code == 404
    order.refresh_from_db()
    assert order.status == "paid"
    assert c.get(f"{API}/orders/{order.number}").json()["payment_status"] == "verified"


def test_failed_callback_redirects_with_failed_outcome(pending, settings):
    settings.FRONTEND_URL = "https://shop.example"
    user, order = pending
    c = Client()
    c.force_login(user)
    url = jpost(c, f"/orders/{order.number}/pay", {"scenario": "failed"}).json()["redirect_url"]
    r = Client().get(url.replace("http://localhost:8000", ""))
    assert r["Location"].endswith("?payment=failed")
