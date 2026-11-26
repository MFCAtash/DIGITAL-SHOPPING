"""ورود با OTP: درخواست، تأیید، سقف‌ها، نشست، CSRF، عدم افشا (نیاز به Postgres)."""
from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.accounts.models import OtpChallenge, SmsOutbox, User
from apps.accounts.sms import RecordingSms
from tests.factories import UserFactory
from tests.helpers import API, jpost, last_otp_code

pytestmark = pytest.mark.django_db
PHONE = "09123456789"


@pytest.fixture(autouse=True)
def _reset_sms():
    RecordingSms.reset()
    yield
    RecordingSms.reset()


def request_code(c, phone=PHONE):
    return jpost(c, "/auth/otp/request", {"phone": phone})


def test_request_creates_hashed_challenge_and_sends_sms():
    r = request_code(Client())
    assert r.status_code == 200 and r.json() == {"ok": True, "expires_in": 120, "resend_in": 60}
    ch = OtpChallenge.objects.get()
    code = last_otp_code()
    assert code not in ch.code_hash and len(ch.code_hash) == 64  # کد خام ذخیره نمی‌شود
    assert RecordingSms.sent[0][0] == PHONE
    assert SmsOutbox.objects.get().text == ""  # متن حاوی کد پس از ارسال پاک می‌شود
    assert SmsOutbox.objects.get().status == "sent"


def test_response_does_not_reveal_whether_phone_is_registered():
    UserFactory(phone=PHONE)
    known = request_code(Client(), PHONE).json()
    RecordingSms.reset()
    unknown = request_code(Client(), "09129999999").json()
    assert known == unknown


def test_invalid_phone_is_422_with_code():
    r = request_code(Client(), "123")
    assert r.status_code == 422 and r.json()["code"] == "invalid_phone"


def test_resend_within_60s_is_429_with_retry_after():
    c = Client()
    request_code(c)
    r = request_code(c)
    assert r.status_code == 429
    assert r.json()["code"] == "resend_too_soon" and r.json()["retry_after"] > 0
    assert int(r["Retry-After"]) == r.json()["retry_after"]


def test_phone_hourly_limit_and_ip_limit():
    now = timezone.now()
    for i in range(5):
        OtpChallenge.objects.create(phone=PHONE, code_hash="x" * 64, expires_at=now, ip="1.1.1.1")
    OtpChallenge.objects.filter(phone=PHONE).update(created_at=now - timedelta(minutes=30))
    r = request_code(Client())
    assert r.status_code == 429 and r.json()["code"] == "phone_hourly_limit"
    OtpChallenge.objects.all().delete()
    for i in range(20):
        OtpChallenge.objects.create(phone=f"0912000{i:04d}", code_hash="x" * 64, expires_at=now, ip="127.0.0.1")
    OtpChallenge.objects.update(created_at=now - timedelta(minutes=30))
    r = request_code(Client(), "09125550000")
    assert r.status_code == 429 and r.json()["code"] == "ip_hourly_limit"


def test_verify_success_creates_user_rotates_session_and_returns_csrf():
    c = Client()
    request_code(c)
    before = c.session.session_key
    r = jpost(c, "/auth/otp/verify", {"phone": PHONE, "code": last_otp_code()})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["phone"] == PHONE and body["csrf_token"]
    assert User.objects.filter(phone=PHONE).exists()
    assert c.get(f"{API}/auth/me").json()["phone"] == PHONE
    assert c.session.session_key != before  # شناسهٔ نشست عوض شد


def test_verify_accepts_persian_digits_and_existing_user_not_duplicated():
    UserFactory(phone=PHONE)
    c = Client()
    request_code(c)
    code = last_otp_code()
    fa = code.translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
    assert jpost(c, "/auth/otp/verify", {"phone": "۰۹۱۲۳۴۵۶۷۸۹", "code": fa}).status_code == 200
    assert User.objects.filter(phone=PHONE).count() == 1


def test_wrong_code_counts_attempts_and_locks_after_five():
    c = Client()
    request_code(c)
    good = last_otp_code()
    bad = "000000" if good != "000000" else "111111"
    left = []
    for _ in range(5):
        r = jpost(c, "/auth/otp/verify", {"phone": PHONE, "code": bad})
        assert r.status_code == 400 and r.json()["code"] == "invalid_code"
        left.append(r.json()["attempts_left"])
    assert left == [4, 3, 2, 1, 0]  # تلاش اشتباه ذخیره می‌شود (رول‌بک نمی‌شود)
    r = jpost(c, "/auth/otp/verify", {"phone": PHONE, "code": good})  # حتی کد درست، قفل
    assert r.status_code == 429 and r.json()["code"] == "otp_locked"
    assert not User.objects.filter(phone=PHONE).exists()


def test_code_is_single_use_and_expires():
    c = Client()
    request_code(c)
    code = last_otp_code()
    assert jpost(c, "/auth/otp/verify", {"phone": PHONE, "code": code}).status_code == 200
    assert jpost(Client(), "/auth/otp/verify", {"phone": PHONE, "code": code}).status_code == 400  # مصرف‌شده
    OtpChallenge.objects.all().delete()
    request_code(c, "09128888888")
    OtpChallenge.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    assert jpost(c, "/auth/otp/verify", {"phone": "09128888888", "code": last_otp_code()}).status_code == 400  # منقضی


def test_unknown_phone_gets_same_generic_error():
    r = jpost(Client(), "/auth/otp/verify", {"phone": "09127777777", "code": "123456"})
    assert r.status_code == 400 and r.json()["code"] == "invalid_code"


def test_sms_provider_failure_does_not_break_request_and_retries():
    RecordingSms.failures = 1
    r = request_code(Client())
    assert r.status_code == 200
    row = SmsOutbox.objects.get()
    assert row.status == "pending" and row.attempts == 1 and row.next_attempt_at > timezone.now()
    from apps.accounts.sms import send_pending_sms

    assert send_pending_sms(now=timezone.now() + timedelta(minutes=5)) == 1
    SmsOutbox.objects.get().status == "sent"
    assert len(RecordingSms.sent) == 1


def test_sms_gives_up_after_max_attempts_and_wipes_text():
    from apps.accounts.sms import MAX_SMS_ATTEMPTS, send_pending_sms

    RecordingSms.failures = 99
    request_code(Client())
    t = timezone.now()
    for i in range(MAX_SMS_ATTEMPTS):
        t += timedelta(hours=1)
        send_pending_sms(now=t)
    row = SmsOutbox.objects.get()
    assert row.status == "failed" and row.text == ""


def test_me_requires_login_with_unified_error_shape():
    r = Client().get(f"{API}/auth/me")
    assert r.status_code == 401 and r.json()["code"] == "unauthorized"


def test_logout_and_profile_update():
    u = UserFactory()
    c = Client()
    c.force_login(u)
    r = jpost(c, "/auth/me", {"name": "  علی  "}, method="patch")
    assert r.json()["name"] == "علی"
    assert jpost(c, "/auth/logout").json() == {"ok": True}
    assert c.get(f"{API}/auth/me").status_code == 401


def test_csrf_enforced_for_cookie_authenticated_writes():
    u = UserFactory()
    c = Client(enforce_csrf_checks=True)
    c.force_login(u)
    assert jpost(c, "/auth/me", {"name": "x"}, method="patch").status_code == 403  # بدون توکن
    token = c.get(f"{API}/auth/csrf").json()["csrf_token"]
    r = jpost(c, "/auth/me", {"name": "x"}, method="patch", HTTP_X_CSRFTOKEN=token)
    assert r.status_code == 200


def test_validation_error_uses_unified_shape():
    r = jpost(Client(), "/auth/otp/request", {})
    assert r.status_code == 422 and r.json()["code"] == "validation_error"
