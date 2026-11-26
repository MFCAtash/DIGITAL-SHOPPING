"""محافظ نرخ ارز در برابر اشتباه تایپی (مثلاً یک صفر اضافه)؛ بدون وابستگی به Django."""
from __future__ import annotations


class SuspiciousRate(ValueError):
    pass


def check_rate_change(old: int | None, new: int, max_change_percent: int = 20) -> None:
    """نرخ باید عدد صحیح مثبت باشد و نسبت به نرخ فعال فعلی بیش از `max_change_percent` تغییر نکند."""
    if isinstance(new, bool) or not isinstance(new, int) or new <= 0:
        raise SuspiciousRate("نرخ باید عدد صحیح مثبت (تومان به ازای هر دلار) باشد")
    if old is None:
        return
    if old <= 0:
        raise SuspiciousRate("نرخ فعلی نامعتبر است")
    change = abs(new - old) * 100 / old
    if change > max_change_percent:
        raise SuspiciousRate(f"تغییر {change:.1f}٪ نسبت به نرخ فعلی ({old}) بیش از حد مجاز ({max_change_percent}٪) است")
