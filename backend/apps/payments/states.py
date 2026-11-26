"""ماشین حالت پرداخت (خالص). نگاشت به وضعیت سفارش در services انجام می‌شود."""
from __future__ import annotations

from enum import Enum


class PaymentStatus(str, Enum):
    INITIATED = "initiated"        # ساخته شد، هنوز به درگاه نرفته
    REDIRECTED = "redirected"      # کاربر به درگاه رفت؛ منتظر callback
    VERIFIED = "verified"          # درگاه تأیید کرد و مبلغ برابر است
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"  # مبلغ نابرابر یا نتیجهٔ مبهم: دستی بررسی شود
    REFUNDED = "refunded"


S = PaymentStatus

ALLOWED: dict[PaymentStatus, frozenset[PaymentStatus]] = {
    S.INITIATED: frozenset({S.REDIRECTED, S.FAILED}),
    S.REDIRECTED: frozenset({S.VERIFIED, S.FAILED, S.NEEDS_REVIEW}),
    S.VERIFIED: frozenset({S.REFUNDED}),
    S.NEEDS_REVIEW: frozenset({S.VERIFIED, S.FAILED, S.REFUNDED}),
    S.FAILED: frozenset(),
    S.REFUNDED: frozenset(),
}

TERMINAL = frozenset(s for s, nxt in ALLOWED.items() if not nxt)


class InvalidPaymentTransition(ValueError):
    pass


def ensure_transition(current: PaymentStatus, target: PaymentStatus) -> None:
    if target not in ALLOWED[current]:
        raise InvalidPaymentTransition(f"{current.value} → {target.value} مجاز نیست")


def is_settled(status: PaymentStatus) -> bool:
    """نتیجهٔ نهایی ثبت شده؛ callback یا استعلام تازه نباید دوباره اثر بگذارد."""
    return status in {S.VERIFIED, S.FAILED, S.REFUNDED}
