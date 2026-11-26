"""تصمیم مغایرت‌گیری (خالص): پرداخت‌هایی که کاربر به درگاه رفته ولی callback نیامده (یا مبهم بود)."""
from __future__ import annotations

from typing import Literal

from .gateway import VerifyResult
from .states import PaymentStatus

Action = Literal["skip", "keep", "mark_verified", "mark_failed", "needs_review"]

MIN_AGE_SECONDS = 10 * 60       # کاربر ممکن است هنوز در صفحهٔ درگاه باشد
GIVE_UP_AFTER_SECONDS = 60 * 60  # بعد از یک ساعت نتیجهٔ مبهم ⇒ ناموفق (سفارش هم خودش منقضی می‌شود)


def reconcile_action(status: PaymentStatus, age_seconds: float, inquiry: VerifyResult | None, expected_toman: int) -> Action:
    if status is not PaymentStatus.REDIRECTED or age_seconds < MIN_AGE_SECONDS:
        return "skip"
    if inquiry is None:  # استعلام ممکن نشد (قطعی درگاه)
        return "mark_failed" if age_seconds >= GIVE_UP_AFTER_SECONDS else "keep"
    if inquiry.status == "verified":
        return "mark_verified" if inquiry.paid_toman == expected_toman else "needs_review"
    if inquiry.status == "failed":
        return "mark_failed"
    return "mark_failed" if age_seconds >= GIVE_UP_AFTER_SECONDS else "keep"
