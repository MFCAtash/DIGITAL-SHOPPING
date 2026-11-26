"""ماشین حالت سفارش؛ بدون وابستگی به Django."""
from __future__ import annotations

from enum import Enum


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    NEEDS_REVIEW = "needs_review"  # پرداخت نامطابق؛ بررسی دستی ادمین


class InvalidTransition(Exception):
    def __init__(self, current: OrderStatus, target: OrderStatus):
        super().__init__(f"گذار مجاز نیست: {current.value} -> {target.value}")
        self.current, self.target = current, target


S = OrderStatus
TRANSITIONS: dict[OrderStatus, frozenset[OrderStatus]] = {
    S.PENDING: frozenset({S.PAID, S.CANCELLED, S.NEEDS_REVIEW}),
    S.NEEDS_REVIEW: frozenset({S.PAID, S.CANCELLED, S.REFUNDED}),
    S.PAID: frozenset({S.PROCESSING, S.REFUNDED}),
    S.PROCESSING: frozenset({S.SHIPPED, S.REFUNDED}),
    S.SHIPPED: frozenset({S.DELIVERED}),
    S.DELIVERED: frozenset({S.REFUNDED}),
    S.CANCELLED: frozenset(),
    S.REFUNDED: frozenset(),
}


def can_transition(current: OrderStatus, target: OrderStatus) -> bool:
    return target in TRANSITIONS[current]


def ensure_transition(current: OrderStatus, target: OrderStatus) -> None:
    if not can_transition(current, target):
        raise InvalidTransition(current, target)
