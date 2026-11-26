"""منطق پول و قیمت: فقط عدد صحیح، بدون وابستگی به Django (قابل تست سریع).

هم‌منطق با `finalUsdCents` در فرانت (overlay/src/lib/usd.ts) و با ستون محاسباتی دیتابیس.
"""
from __future__ import annotations


def _as_int(value: object, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{name} باید عدد صحیح باشد، نه {type(value).__name__}")
    return value


def clamp_discount(discount_percent: int | None) -> int:
    """تخفیف را به بازهٔ ۰ تا ۱۰۰ محدود می‌کند؛ None یعنی ۰٪."""
    if discount_percent is None:
        return 0
    return min(100, max(0, _as_int(discount_percent, "discount_percent")))


def final_usd_cents(price_cents: int, discount_percent: int | None = 0) -> int:
    """قیمت نهایی دلاری (سنت) پس از تخفیف؛ تقسیم صحیح به پایین (floor)."""
    price = _as_int(price_cents, "price_cents")
    if price < 0:
        raise ValueError("قیمت نمی‌تواند منفی باشد")
    return (price * (100 - clamp_discount(discount_percent))) // 100


def to_toman(usd_cents: int, toman_per_usd: int, round_to: int = 1000) -> int:
    """تبدیل سنت به تومان با نرخ (تومان به ازای هر دلار)، گرد‌شده به نزدیک‌ترین `round_to`."""
    cents = _as_int(usd_cents, "usd_cents")
    rate = _as_int(toman_per_usd, "toman_per_usd")
    unit = _as_int(round_to, "round_to")
    if cents < 0 or rate <= 0 or unit <= 0:
        raise ValueError("مقدارهای نامعتبر برای تبدیل ارز")
    raw = (cents * rate + 50) // 100  # گرد به نزدیک‌ترین تومان
    return ((raw + unit // 2) // unit) * unit
