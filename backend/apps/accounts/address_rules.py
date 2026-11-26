"""اعتبارسنجی نشانی؛ **عین** قواعد فرانت (packages/ui/src/lib/address.ts). همخوانی با contracts/address-cases.json تست می‌شود."""
from __future__ import annotations

import re

from apps.core.persian import normalize_phone, to_ascii_digits

from .provinces import PROVINCES

MAX_ADDRESSES_PER_USER = 10
_POSTAL_RE = re.compile(r"^\d{10}$")
FIELDS = ("receiverName", "receiverPhone", "province", "city", "postalCode", "street")


def normalize_postal_code(raw: str) -> str:
    return re.sub(r"\D", "", to_ascii_digits(raw))[:10]


def validate_address(data: dict[str, str]) -> dict[str, str]:
    """خروجی: {فیلد: پیام فارسی}؛ خالی یعنی معتبر. کلیدها camelCase مثل فرانت."""
    errs: dict[str, str] = {}
    g = lambda k: str(data.get(k) or "")  # noqa: E731
    if len(g("receiverName").strip()) < 3:
        errs["receiverName"] = "نام و نام خانوادگی گیرنده را کامل بنویسید."
    try:
        normalize_phone(g("receiverPhone"))
    except ValueError:
        errs["receiverPhone"] = "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."
    if g("province") not in PROVINCES:
        errs["province"] = "استان را از فهرست انتخاب کنید."
    if len(g("city").strip()) < 2:
        errs["city"] = "شهر را بنویسید یا انتخاب کنید."
    if not _POSTAL_RE.match(normalize_postal_code(g("postalCode"))):
        errs["postalCode"] = "کد پستی باید ۱۰ رقم باشد."
    if len(g("street").strip()) < 5:
        errs["street"] = "نشانی را دقیق‌تر بنویسید (خیابان، کوچه)."
    return errs
