"""سیاست و منطق خالص OTP؛ بدون Django و بدون ساعت داخلی (زمان تزریق می‌شود تا قطعی و قابل تست باشد).

- کد خام هرگز ذخیره نمی‌شود: فقط HMAC-SHA256 با کلید سرور روی «شماره:کد» (کد ۶ رقمی را بدون کلید می‌شد brute-force کرد).
- مقایسهٔ کد با compare_digest (ثابت‌زمان).
- محدودیت‌ها: ۱ درخواست در ۶۰ ثانیه و ۵ در ساعت برای هر شماره؛ ۲۰ در ساعت برای هر IP؛ ۵ تلاش برای هر کد.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal


@dataclass(frozen=True)
class OtpPolicy:
    code_length: int = 6
    ttl_seconds: int = 120
    resend_seconds: int = 60
    per_phone_hour: int = 5
    per_ip_hour: int = 20
    max_attempts: int = 5


DEFAULT_POLICY = OtpPolicy()


def generate_code(length: int = 6, randbelow: Callable[[int], int] = secrets.randbelow) -> str:
    """کد عددی با صفرهای ابتدایی؛ از secrets (نه random)."""
    if length < 4:
        raise ValueError("طول کد باید حداقل ۴ باشد")
    return str(randbelow(10**length)).zfill(length)


def hash_code(secret: str, phone: str, code: str) -> str:
    if not secret:
        raise ValueError("کلید OTP خالی است")
    return hmac.new(secret.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def verify_code(secret: str, phone: str, code: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_code(secret, phone, code), stored_hash)


@dataclass(frozen=True)
class RequestDecision:
    allowed: bool
    reason: Literal["resend_too_soon", "phone_hourly_limit", "ip_hourly_limit"] | None = None
    retry_after: int = 0


def _retry_after(times: Sequence[datetime], now: datetime, window: timedelta, limit: int) -> int:
    """ثانیه‌های مانده تا آزادشدن یک جا در پنجره (قدیمی‌ترین درخواستِ درون پنجره‌ای که سقف را پر کرده)."""
    inside = sorted(t for t in times if now - t < window)
    if len(inside) < limit:
        return 0
    oldest_blocking = inside[len(inside) - limit]
    return max(1, int((oldest_blocking + window - now).total_seconds()) + 1)


def decide_request(now: datetime, phone_times: Sequence[datetime], ip_times: Sequence[datetime], policy: OtpPolicy = DEFAULT_POLICY) -> RequestDecision:
    """آیا می‌شود برای این شماره/IP کد فرستاد؟ زمان‌ها: درخواست‌های قبلی (هر مقدار قدیمی‌تر از یک ساعت نادیده گرفته می‌شود)."""
    hour = timedelta(hours=1)
    last = max(phone_times, default=None)
    if last is not None and (now - last).total_seconds() < policy.resend_seconds:
        return RequestDecision(False, "resend_too_soon", max(1, int(policy.resend_seconds - (now - last).total_seconds()) + 1))
    wait = _retry_after(phone_times, now, hour, policy.per_phone_hour)
    if wait:
        return RequestDecision(False, "phone_hourly_limit", wait)
    wait = _retry_after(ip_times, now, hour, policy.per_ip_hour)
    if wait:
        return RequestDecision(False, "ip_hourly_limit", wait)
    return RequestDecision(True)


@dataclass(frozen=True)
class VerifyDecision:
    outcome: Literal["ok", "wrong", "expired", "locked", "consumed"]
    attempts_left: int = 0


def decide_verify(*, now: datetime, expires_at: datetime, attempts: int, consumed: bool, code_matches: bool, policy: OtpPolicy = DEFAULT_POLICY) -> VerifyDecision:
    """ترتیب بررسی مهم است: مصرف‌شده، منقضی، قفل‌شده، سپس تطبیق کد. تلاشِ شمارش‌شده فقط برای «wrong»."""
    if consumed:
        return VerifyDecision("consumed")
    if now >= expires_at:
        return VerifyDecision("expired")
    if attempts >= policy.max_attempts:
        return VerifyDecision("locked")
    if not code_matches:
        return VerifyDecision("wrong", max(0, policy.max_attempts - (attempts + 1)))
    return VerifyDecision("ok", policy.max_attempts - attempts)


def next_sms_retry_seconds(attempts: int, base: int = 15, cap: int = 600) -> int:
    """فاصلهٔ تلاش مجدد ارسال پیامک: نمایی با سقف (۱۵، ۳۰، ۶۰، …، ۶۰۰ ثانیه)."""
    return min(cap, base * (2 ** max(0, attempts)))
