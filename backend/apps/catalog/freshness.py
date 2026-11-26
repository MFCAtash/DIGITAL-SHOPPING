"""تازگی قیمت؛ بدون وابستگی به Django."""
from __future__ import annotations

from datetime import date, timedelta


def stale_cutoff(today: date, days: int) -> date:
    """قیمت‌های بررسی‌شده قبل از این تاریخ «قدیمی» حساب می‌شوند."""
    if days < 0:
        raise ValueError("days نمی‌تواند منفی باشد")
    return today - timedelta(days=days)


def is_stale(checked_on: date | None, today: date, days: int = 7) -> bool:
    """بدون تاریخ بررسی ⇒ قدیمی. دقیقاً `days` روز پیش ⇒ هنوز تازه."""
    return checked_on is None or checked_on < stale_cutoff(today, days)
