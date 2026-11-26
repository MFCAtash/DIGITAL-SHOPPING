"""جمع سفارش: کالاها − تخفیف + ارسال + مالیات ارزش‌افزوده (تومان، عدد صحیح). بدون Django.

مالیات فقط محاسبهٔ نمایشی/سفارش است؛ فاکتور رسمی و ارسال به سامانهٔ مودیان را با حسابدار نهایی کنید.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Totals:
    subtotal: int
    shipping: int
    tax: int
    total: int
    discount: int = 0


def compute_totals(subtotal: int, shipping: int = 0, vat_percent: int = 10, discount: int = 0) -> Totals:
    """جمع نهایی.

    - تخفیف پیش از مالیات اعمال می‌شود (پایهٔ مالیات = کالاها − تخفیف + ارسال).
    - تخفیف هرگز از جمع کالاها بیشتر نمی‌شود و ارسال/مالیات را منفی نمی‌کند.
    """
    for name, v in (("subtotal", subtotal), ("shipping", shipping), ("vat_percent", vat_percent), ("discount", discount)):
        if isinstance(v, bool) or not isinstance(v, int) or v < 0:
            raise ValueError(f"{name} باید عدد صحیح نامنفی باشد")
    if vat_percent > 100:
        raise ValueError("vat_percent نامعتبر است")
    if discount > subtotal:
        raise ValueError("discount نمی‌تواند از جمع کالاها بیشتر باشد")
    net_goods = subtotal - discount
    base = net_goods + shipping
    tax = (base * vat_percent + 50) // 100  # گرد به نزدیک‌ترین تومان (نیم به بالا)
    return Totals(subtotal=subtotal, shipping=shipping, tax=tax, total=base + tax, discount=discount)
