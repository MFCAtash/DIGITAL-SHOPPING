"""ابزارهای امنیتی مشترک: اثر انگشت بدون PII، لاگ رویدادهای مشکوک و بررسی IP.

هیچ شمارهٔ موبایل، آدرس، کد OTP یا توکنی در لاگها نوشته نمیشود؛ فقط اثر انگشت کوتاه و دلیل رویداد.
"""
from __future__ import annotations

import hashlib
import ipaddress
from typing import Any

import structlog

log = structlog.get_logger("security")


def fingerprint(value: str | None, salt: str) -> str:
    """اثر انگشت یکطرفه و کوتاه از شناسه (برای Correlation بدون ذخیرهٔ PII)."""
    if not value:
        return "-"
    return hashlib.sha256(f"{salt}:{value}".encode()).hexdigest()[:16]


def log_security(event: str, request: Any = None, **details: Any) -> None:
    extra: dict[str, Any] = {}
    if request is not None:
        extra["request_id"] = getattr(request, "request_id", None)
        extra["path"] = getattr(request, "path", None)  # path بدون query string
    log.warning(event, **{**extra, **details})


def ip_allowed(ip: str | None, cidrs: list[str] | tuple[str, ...]) -> bool:
    """آیا IP در فهرست CIDR مجاز است؟ ورودی نامعتبر ⇒ False (fail-closed)."""
    if not ip:
        return False
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for item in cidrs:
        try:
            if address in ipaddress.ip_network(item, strict=False):
                return True
        except ValueError:
            continue
    return False
