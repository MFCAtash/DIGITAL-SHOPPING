"""قواعد خالص هزینهٔ ارسال: بر پایهٔ استان و جمع سبد. (وزن در این نسخه نیست؛ نگاه کنید به docs/PHASE-2-3-STATUS.md.)"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ShippingRule:
    code: str
    name: str
    base_toman: int
    free_over_toman: int | None = None
    #: خالی = همهٔ استان‌ها
    provinces: tuple[str, ...] = ()
    active: bool = True
    eta: str = ""


def quote(rule: ShippingRule, province: str, subtotal_toman: int) -> int | None:
    """هزینه (تومان) یا None وقتی این روش برای این استان/وضعیت در دسترس نیست."""
    if not rule.active:
        return None
    if rule.provinces and province not in rule.provinces:
        return None
    if rule.free_over_toman is not None and subtotal_toman >= rule.free_over_toman:
        return 0
    return rule.base_toman
