"""ارسال پیامک: رابط + آداپتورها + پردازش صف outbox. ارائه‌دهندهٔ واقعی (مثلاً کاوه‌نگار/ملی‌پیامک) فقط یک کلاس با متد send است."""
from __future__ import annotations

import json
from datetime import timedelta
from typing import Protocol
from urllib.request import Request, urlopen

import structlog
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from .otp_policy import next_sms_retry_seconds

log = structlog.get_logger(__name__)
MAX_SMS_ATTEMPTS = 5


class SmsError(Exception):
    """شکست ارسال (قابل تلاش مجدد)."""


class SmsGateway(Protocol):
    def send(self, phone: str, text: str) -> None: ...


class ConsoleSms:
    """فقط توسعه: متن (شامل کد) را در لاگ می‌نویسد. در prod هرگز استفاده نشود (کد در لاگ می‌ماند)."""

    def send(self, phone: str, text: str) -> None:
        log.warning("sms_console", phone=phone, text=text)


class RecordingSms:
    """تست: پیامک‌ها را در حافظه نگه می‌دارد. اگر failures>0 باشد، همان‌قدر بار اول‌ها شکست می‌خورد."""

    sent: list[tuple[str, str]] = []
    failures = 0

    def send(self, phone: str, text: str) -> None:
        if RecordingSms.failures > 0:
            RecordingSms.failures -= 1
            raise SmsError("simulated provider failure")
        RecordingSms.sent.append((phone, text))

    @classmethod
    def reset(cls) -> None:
        cls.sent, cls.failures = [], 0


class HttpSms:
    """آداپتور واقعی ارسال پیامک بر بستر HTTP (سازگار با اکثر سرویسهای داخلی).

    پیکربندی با `SMS_HTTP_URL` و `SMS_HTTP_TOKEN` انجام میشود. هر پاسخ غیر ۲xx خطا تلقی میشود
    تا outbox بتواند backoff و تلاش مجدد را انجام دهد.
    """

    def send(self, phone: str, text: str) -> None:
        url, token = settings.SMS_HTTP_URL, settings.SMS_HTTP_TOKEN
        if not url or not token:
            raise SmsError("SMS_HTTP_URL / SMS_HTTP_TOKEN تنظیم نشدهاند")
        payload = json.dumps({"phone": phone, "text": text}).encode("utf-8")
        req = Request(
            url,
            data=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=settings.SMS_HTTP_TIMEOUT) as resp:  # noqa: S310 — URL از تنظیمات امن آمده است
                if resp.status >= 300:
                    raise SmsError(f"provider_status_{resp.status}")
        except SmsError:
            raise
        except Exception as exc:  # noqa: BLE001 — هر خطای شبکه قابل تلاش مجدد است
            raise SmsError(str(exc)) from exc


def get_gateway() -> SmsGateway:
    return import_string(settings.SMS_GATEWAY)()


def otp_message(code: str) -> str:
    # ارقام لاتین: برخی ارائه‌دهندگان و تشخیص خودکار کد (WebOTP/autofill) با ارقام لاتین بهتر کار می‌کنند
    return f"کد ورود شما: {code}\nاین کد را به هیچ‌کس ندهید."


def send_pending_sms(now=None, batch: int = 50) -> int:
    """موارد pending را می‌فرستد؛ شکست ⇒ backoff نمایی؛ پس از ۵ تلاش failed. متن پس از پایان کار پاک می‌شود (کد OTP نماند)."""
    from .models import SmsOutbox

    now = now or timezone.now()
    gateway = get_gateway()
    done = 0
    with transaction.atomic():
        rows = list(SmsOutbox.objects.select_for_update(skip_locked=True).filter(status=SmsOutbox.Status.PENDING, next_attempt_at__lte=now).order_by("id")[:batch])
        for row in rows:
            try:
                gateway.send(row.phone, row.text)
            except Exception as exc:  # noqa: BLE001 — هر شکستی از ارائه‌دهنده قابل‌تلاش‌مجدد است
                row.attempts += 1
                row.last_error = f"{type(exc).__name__}: {exc}"[:200]
                if row.attempts >= MAX_SMS_ATTEMPTS:
                    row.status, row.text = SmsOutbox.Status.FAILED, ""
                else:
                    row.next_attempt_at = now + timedelta(seconds=next_sms_retry_seconds(row.attempts - 1))
                log.warning("sms_failed", id=row.pk, attempts=row.attempts, error=row.last_error)
            else:
                row.status, row.sent_at, row.text = SmsOutbox.Status.SENT, now, ""
                done += 1
            row.save(update_fields=["status", "attempts", "next_attempt_at", "last_error", "sent_at", "text"])
    return done
