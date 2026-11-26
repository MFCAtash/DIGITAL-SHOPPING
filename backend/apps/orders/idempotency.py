"""اعتبارسنجی کلید idempotency و اثر انگشت درخواست؛ بدون وابستگی به Django (قابل تست سریع).

- کلید باید UUID باشد (حداکثر ۶۴ کاراکتر). قالب کانونی: حروف کوچک با خط تیره.
- اثر انگشت درخواست (sha256 از JSON کانونی) کنار کلید ذخیره می‌شود تا تکرار «همان کلید با سبد متفاوت»
  به‌جای برگرداندن سفارش قبلی، خطای ۴۰۹ بدهد (الگوی Stripe).
"""
from __future__ import annotations

import hashlib
import json
import uuid
from collections.abc import Iterable, Mapping
from typing import Any

MAX_KEY_LENGTH = 64


class InvalidIdempotencyKey(ValueError):
    pass


def validate_key(raw: object) -> str:
    """کلید را اعتبارسنجی و به قالب کانونی UUID برمی‌گرداند؛ در غیر این صورت InvalidIdempotencyKey."""
    if not isinstance(raw, str) or not raw or len(raw) > MAX_KEY_LENGTH:
        raise InvalidIdempotencyKey("کلید idempotency باید رشتهٔ UUID با حداکثر ۶۴ کاراکتر باشد")
    try:
        parsed = uuid.UUID(raw)
    except ValueError as exc:
        raise InvalidIdempotencyKey("کلید idempotency باید UUID معتبر باشد") from exc
    return str(parsed)


def request_fingerprint(items: Iterable[tuple[int, int]], address: Mapping[str, Any] | None = None, extra: Mapping[str, Any] | None = None) -> str:
    """sha256 از محتوای درخواست: اقلام (ادغام‌شده و مرتب)، آدرس و موارد اضافه (مثلاً روش ارسال). ترتیب ورودی اثری ندارد."""
    merged: dict[int, int] = {}
    for pid, qty in items:
        merged[int(pid)] = merged.get(int(pid), 0) + int(qty)
    payload: dict[str, Any] = {"items": sorted(merged.items()), "address": dict(address or {})}
    if extra:  # فقط وقتی هست وارد می‌شود تا اثر انگشت درخواست‌های قبلی (بدون extra) تغییر نکند
        payload["extra"] = dict(extra)
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()
