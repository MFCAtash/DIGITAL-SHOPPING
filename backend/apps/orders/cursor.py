"""مکان‌نمای (cursor) صفحه‌بندی لیست سفارش‌ها: (created_at ISO, pk) در base64url. ورودی دست‌کاری‌شده ⇒ ValueError."""
from __future__ import annotations

import base64
import binascii
import json
from datetime import datetime


def encode_cursor(created_at_iso: str, pk: int) -> str:
    raw = json.dumps([created_at_iso, int(pk)], separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[str, int]:
    try:
        raw = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4))
        iso, pk = json.loads(raw)
        if not isinstance(iso, str) or isinstance(pk, bool) or not isinstance(pk, int) or pk < 0:
            raise ValueError
        datetime.fromisoformat(iso)
        return iso, pk
    except (binascii.Error, ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("cursor نامعتبر است") from exc
