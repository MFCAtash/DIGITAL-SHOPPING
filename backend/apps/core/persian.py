"""نرمال‌سازی متن و شمارهٔ موبایل فارسی (بدون وابستگی به Django)."""
from __future__ import annotations

import re

_DIGITS = {ord(c): str(i) for i, c in enumerate("۰۱۲۳۴۵۶۷۸۹")}
_DIGITS.update({ord(c): str(i) for i, c in enumerate("٠١٢٣٤٥٦٧٨٩")})
_CHARS = {ord("ي"): "ی", ord("ى"): "ی", ord("ك"): "ک", ord("ۀ"): "ه", ord("ة"): "ه"}
_JUNK = dict.fromkeys(map(ord, "\u200c\u200d\u200e\u200f\u0640\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652"))


def to_ascii_digits(text: str) -> str:
    return text.translate(_DIGITS)


_FA = "۰۱۲۳۴۵۶۷۸۹"


def to_fa_digits(value: object) -> str:
    """ارقام لاتین را فارسی می‌کند (برای پیام‌های نمایشی API)."""
    return "".join(_FA[int(c)] if c.isdigit() and c in "0123456789" else c for c in str(value))


def normalize_fa(text: str) -> str:
    """برای جست‌وجو: ی/ک عربی به فارسی، ارقام به لاتین، حذف نیم‌فاصله/کشیده/اعراب، فاصله‌ها یکی، حروف کوچک."""
    out = text.translate(_DIGITS).translate(_CHARS).translate(_JUNK)
    return re.sub(r"\s+", " ", out).strip().lower()


_PHONE_RE = re.compile(r"^09\d{9}$")


def normalize_phone(raw: str) -> str:
    """شمارهٔ موبایل ایران را به شکل 09XXXXXXXXX برمی‌گرداند؛ در غیر این صورت ValueError."""
    s = re.sub(r"[\s\-()]", "", to_ascii_digits(raw))
    if s.startswith("+98"):
        s = "0" + s[3:]
    elif s.startswith("0098"):
        s = "0" + s[4:]
    elif s.startswith("98") and len(s) == 12:
        s = "0" + s[2:]
    elif s.startswith("9") and len(s) == 10:
        s = "0" + s
    if not _PHONE_RE.match(s):
        raise ValueError("شمارهٔ موبایل نامعتبر است")
    return s
