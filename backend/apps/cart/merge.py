"""منطق خالص سبد: ادغام، سقف تعداد، و هشدارهای تغییر قیمت/موجودی. بدون Django."""
from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass

from apps.core.persian import to_fa_digits


def max_qty(final_usd_cents: int | None, *, high_value_cents: int = 50_000, high_value_max: int = 2, default_max: int = 10) -> int:
    """سقف تعداد هر کالا در سبد: کالای گران‌قیمت (پیش‌فرض ≥ ۵۰۰ دلار) ۲ عدد، بقیه ۱۰ عدد. ضد احتکار و کم‌کنندهٔ ریسک پرداخت متقلبانه."""
    if final_usd_cents is not None and final_usd_cents >= high_value_cents:
        return high_value_max
    return default_max


def merge_lines(user_lines: Mapping[int, int], guest_lines: Mapping[int, int], cap_for: Callable[[int], int]) -> dict[int, int]:
    """جمع تعداد هر کالا بین سبد کاربر و سبد مهمان با سقف؛ تعداد ناپایدار (≤۰) حذف می‌شود. ورودی‌ها تغییر نمی‌کنند."""
    out: dict[int, int] = {}
    for src in (user_lines, guest_lines):
        for pid, qty in src.items():
            if qty > 0:
                out[pid] = out.get(pid, 0) + qty
    return {pid: min(q, cap_for(pid)) for pid, q in out.items() if min(q, cap_for(pid)) > 0}


@dataclass(frozen=True)
class LineWarning:
    code: str
    message: str


def line_warnings(*, seen_cents: int | None, current_cents: int | None, qty: int, stock: int, purchasable: bool = True) -> list[LineWarning]:
    """هشدارهای سطر سبد تنها دربارهٔ موجودی و تغییر قیمت است؛ پیام «قابل خرید نیست» حذف شد."""
    out: list[LineWarning] = []
    if current_cents is None:
        return out
    if seen_cents is not None and seen_cents != current_cents:
        out.append(LineWarning("price_changed", "قیمت این کالا از آخرین بازدید شما تغییر کرده است."))
    if stock <= 0:
        out.append(LineWarning("out_of_stock", "این کالا ناموجود شده است."))
    elif qty > stock:
        out.append(LineWarning("stock_low", f"فقط {to_fa_digits(stock)} عدد موجود است."))
    return out
