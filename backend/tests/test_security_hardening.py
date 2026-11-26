"""تستهای سختسازی امنیتی: رمز هششده، بازنشانی زماندار، CSRF، ادمین و برابر بودن مبلغ."""
from __future__ import annotations

import re
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.checks import run_checks
from django.test import Client
from django.test.utils import override_settings

from apps.accounts.models import SmsOutbox
from apps.accounts.sms import RecordingSms
from apps.core.checks import _bad
from apps.core.security import fingerprint
from apps.orders.services import OrderError, place_order, verify_order_totals
from apps.payments.services import PaymentError, start_payment
from tests.factories import ProductFactory, UserFactory
from tests.helpers import API, jpost

pytestmark = pytest.mark.django_db
STRONG = "Str0ng!Passw0rd#2026"


def login_client(user):
    c = Client()
    c.force_login(user)
    return c


def test_password_set_change_and_hashing():
    u = UserFactory()
    c = login_client(u)
    assert jpost(c, "/auth/password/set", {"new_password": STRONG}).status_code == 200
    u.refresh_from_db()
    assert u.has_usable_password() and u.password != STRONG and u.check_password(STRONG)

    # تغییر هش رمز، نشست قبلی را باطل میکند (محافظت در برابر سرقت نشست)
    c.force_login(u)
    bad = jpost(c, "/auth/password/change", {"current_password": "wrong", "new_password": STRONG + "x"})
    assert bad.status_code == 403 and bad.json()["code"] == "invalid_current_password"

    weak = jpost(c, "/auth/password/change", {"current_password": STRONG, "new_password": "123"})
    assert weak.status_code == 422 and weak.json()["code"] == "weak_password"

    new = STRONG + "-new"
    assert jpost(c, "/auth/password/change", {"current_password": STRONG, "new_password": new}).status_code == 200
    u.refresh_from_db()
    assert u.check_password(new) and not u.check_password(STRONG)


def test_password_reset_request_is_non_disclosing_and_reset_token_single_use():
    u = UserFactory()
    known = jpost(Client(), "/auth/password/reset/request", {"phone": u.phone})
    unknown = jpost(Client(), "/auth/password/reset/request", {"phone": "09129999999"})
    assert known.status_code == unknown.status_code == 200 and known.json() == unknown.json()

    outbox = SmsOutbox.objects.filter(kind="reset").get()
    assert outbox.status == "sent" and outbox.text == ""  # متن پیام پس از ارسال پاک میشود
    assert u.phone not in fingerprint(u.phone, "x")
    text = RecordingSms.sent[-1][1]
    match = re.search(r"uid=([^&\s]+)&token=([^\s]+)", text)
    assert match
    uid, token = match.group(1), match.group(2)

    confirm = jpost(Client(), "/auth/password/reset/confirm", {"uid": uid, "token": token, "new_password": STRONG})
    assert confirm.status_code == 200, confirm.content
    u.refresh_from_db()
    assert u.check_password(STRONG)

    # تغییر رمز، توکن قبلی را باطل میکند (پیوند به هش رمز گره خورده است)
    again = jpost(Client(), "/auth/password/reset/confirm", {"uid": uid, "token": token, "new_password": STRONG + "x"})
    assert again.status_code == 400 and again.json()["code"] == "invalid_reset_token"


def test_csrf_middleware_protects_guest_cart_writes(rate):
    p = ProductFactory(slug="csrf-item")
    c = Client(enforce_csrf_checks=True)
    r = c.put(f"{API}/cart/items/{p.slug}", data="{\"qty\": 1}", content_type="application/json")
    assert r.status_code == 403 and r.json()["code"] == "csrf_failed"

    token = c.get(f"{API}/auth/csrf").json()["csrf_token"]
    ok = c.put(f"{API}/cart/items/{p.slug}", data="{\"qty\": 1}", content_type="application/json", HTTP_X_CSRFTOKEN=token)
    assert ok.status_code == 200, ok.content


@override_settings(ADMIN_ALLOWED_IPS=["10.0.0.0/8"], NINJA_NUM_PROXIES=0)
def test_admin_is_locked_by_ip_and_staff():
    c = Client()
    denied = c.get("/admin/", REMOTE_ADDR="127.0.0.1")
    assert denied.status_code == 403

    user = get_user_model().objects.create_superuser(phone="09121112222", password=STRONG)
    c.force_login(user)
    allowed = c.get("/admin/", REMOTE_ADDR="10.1.2.3")
    assert allowed.status_code in {200, 302}

    staff_denied = Client()
    u = UserFactory()
    staff_denied.force_login(u)
    assert staff_denied.get("/admin/", REMOTE_ADDR="10.1.2.3").status_code == 403


def test_order_totals_are_verified_before_payment(rate):
    p = ProductFactory(price_usd_cents=1000, stock=3)
    order = place_order(UserFactory(), [(p.pk, 1)], str(uuid.uuid4()))
    verify_order_totals(order)  # سالم
    order.total_toman += 500
    order.save(update_fields=["total_toman"])
    with pytest.raises(OrderError):
        verify_order_totals(order)
    with pytest.raises(PaymentError) as exc:
        start_payment(order)
    assert exc.value.code == "amount_mismatch"


def test_payment_callback_accepts_gateway_post_without_csrf_but_never_trusts_params(rate):
    from urllib.parse import parse_qsl, urlparse

    from apps.payments.services import start_payment

    p = ProductFactory(price_usd_cents=1000, stock=3)
    order = place_order(UserFactory(), [(p.pk, 1)], str(uuid.uuid4()))
    params = dict(parse_qsl(urlparse(start_payment(order, scenario="success")).query))
    c = Client(enforce_csrf_checks=True)
    r = c.post("/payments/callback/fake", data=params)
    assert r.status_code == 302 and "payment=success" in r["Location"]

    # authority جعلی حتی بدون CSRF هم نمیتواند پرداخت را تأیید کند
    forged = {**params, "authority": "FAKE0000000000000000.unknown"}
    assert Client(enforce_csrf_checks=True).post("/payments/callback/fake", data=forged).status_code == 404


def test_placeholder_detector_and_prod_checks(monkeypatch):
    assert _bad("change-me-long-secret") and not _bad("9d8c4b1a76e25f03c9a148db5e072f6b")
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings.prod")
    with override_settings(SECRET_KEY="short", OTP_SECRET="", METRICS_TOKEN="", DEBUG=True):
        ids = {e.id for e in run_checks(tags=["security"]) if e.id.startswith("security.E")}
    assert {"security.E001", "security.E002", "security.E003", "security.E004"} <= ids
