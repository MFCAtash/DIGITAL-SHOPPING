"""ورود با OTP. منطق تصمیم در otp_policy.py (خالص)؛ اینجا فقط ذخیره‌سازی و قفل."""
from __future__ import annotations

from datetime import timedelta

import structlog
from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from apps.core.persian import normalize_phone, to_ascii_digits

from .models import OtpChallenge, SmsOutbox, User
from .otp_policy import DEFAULT_POLICY, RequestDecision, decide_request, decide_verify, generate_code, hash_code, verify_code
from .sms import otp_message

log = structlog.get_logger(__name__)


class OtpError(Exception):
    """کد نامعتبر/منقضی/مصرف‌شده/قفل. برای جلوگیری از افشا، API فقط دو کد برمی‌گرداند: invalid_code و otp_locked."""

    def __init__(self, code: str, attempts_left: int = 0):
        super().__init__(code)
        self.code, self.attempts_left = code, attempts_left


def _lock_phone(phone: str) -> None:
    """درخواست‌های هم‌زمان یک شماره پشت‌سرهم انجام شوند تا سقف نرخ دور زده نشود (فقط Postgres)."""
    if connection.vendor == "postgresql":
        with connection.cursor() as cur:
            cur.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [f"otp:{phone}"])


def request_otp(phone_raw: str, ip: str | None, now=None) -> RequestDecision:
    """ValueError اگر شماره نامعتبر. پاسخ هرگز نمی‌گوید شماره ثبت‌نام کرده یا نه."""
    phone = normalize_phone(phone_raw)
    now = now or timezone.now()
    with transaction.atomic():
        _lock_phone(phone)
        since = now - timedelta(hours=1)
        phone_times = list(OtpChallenge.objects.filter(phone=phone, created_at__gte=since).values_list("created_at", flat=True))
        ip_times = list(OtpChallenge.objects.filter(ip=ip, created_at__gte=since).values_list("created_at", flat=True)) if ip else []
        decision = decide_request(now, phone_times, ip_times, DEFAULT_POLICY)
        if not decision.allowed:
            log.info("otp_request_blocked", reason=decision.reason)  # شماره در لاگ نمی‌آید
            return decision
        code = generate_code(DEFAULT_POLICY.code_length)
        OtpChallenge.objects.create(phone=phone, code_hash=hash_code(settings.OTP_SECRET, phone, code), expires_at=now + timedelta(seconds=DEFAULT_POLICY.ttl_seconds), ip=ip)
        SmsOutbox.objects.create(phone=phone, text=otp_message(code), kind="otp", next_attempt_at=now)
        transaction.on_commit(_kick_sms)
    return decision


def queue_sms() -> None:
    """ثبت ارسال پیامک پس از commit (برای جریانهایی غیر از OTP مانند بازنشانی رمز)."""
    transaction.on_commit(_kick_sms)


def _kick_sms() -> None:
    """ارسال سریع پس از commit: هم‌زمان (توسعه/تست) یا با کار صف (prod). شکست اینجا ورود را نمی‌شکند (جاروی دقیقه‌ای جبران می‌کند)."""
    try:
        if settings.SMS_SEND_INLINE:
            from .sms import send_pending_sms

            send_pending_sms()
        else:
            from .tasks import sms_send_now

            sms_send_now.defer()
    except Exception:  # noqa: BLE001
        log.exception("sms_kick_failed")


def verify_otp(phone_raw: str, code_raw: str, now=None) -> User:
    """کاربر را برمی‌گرداند (در اولین ورود می‌سازد) یا OtpError. تلاش اشتباه **حتماً** شمرده و ذخیره می‌شود (رول‌بک نشود)."""
    phone = normalize_phone(phone_raw)
    code = to_ascii_digits(code_raw or "").strip()
    now = now or timezone.now()
    outcome, left, user = "invalid_code", 0, None
    with transaction.atomic():
        _lock_phone(phone)
        ch = OtpChallenge.objects.select_for_update().filter(phone=phone).order_by("-created_at", "-id").first()
        if ch is None:
            hash_code(settings.OTP_SECRET, phone, code or "0")  # زمان پاسخ شبیه حالت عادی
        else:
            matches = bool(code) and verify_code(settings.OTP_SECRET, phone, code, ch.code_hash)
            d = decide_verify(now=now, expires_at=ch.expires_at, attempts=ch.attempts, consumed=ch.consumed_at is not None, code_matches=matches, policy=DEFAULT_POLICY)
            if d.outcome == "wrong":
                ch.attempts += 1
                ch.save(update_fields=["attempts"])
                left = d.attempts_left
            elif d.outcome == "ok":
                OtpChallenge.objects.filter(phone=phone, consumed_at__isnull=True).update(consumed_at=now)  # همهٔ کدهای باز این شماره باطل
                user = User.objects.filter(phone=phone).first() or User.objects.create_user(phone)
                outcome = "ok"
            elif d.outcome == "locked":
                outcome = "otp_locked"
    if user is None:
        raise OtpError(outcome, left)
    if not user.is_active:
        raise OtpError("invalid_code")  # حساب غیرفعال: همان پاسخ عمومی
    return user
