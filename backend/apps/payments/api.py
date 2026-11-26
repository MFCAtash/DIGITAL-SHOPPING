"""API شروع پرداخت. بازگشت از درگاه (callback) یک ریدایرکت مرورگر است و در views.py؛ نه JSON."""
from __future__ import annotations

from ninja import Router, Schema
from ninja.security import django_auth

from apps.core.errors import ApiError
from apps.orders.models import Order
from apps.orders.numbering import is_valid_order_number

from .services import PaymentError, start_payment

router = Router(tags=["payments"], auth=django_auth)


class PayIn(Schema):
    #: فقط در حالت sandbox (staging/توسعه) اثر دارد؛ در prod نادیده گرفته می‌شود
    scenario: str | None = None


class PayOut(Schema):
    redirect_url: str


@router.post("/orders/{number}/pay", response=PayOut, operation_id="orders_pay", summary="شروع پرداخت؛ کاربر باید به redirect_url برود")
def orders_pay(request, number: str, body: PayIn | None = None):
    if not is_valid_order_number(number):
        raise ApiError(404, "not_found", "سفارش پیدا نشد.")
    order = Order.objects.filter(user=request.user, number=number).first()  # مالکیت در خود query
    if order is None:
        raise ApiError(404, "not_found", "سفارش پیدا نشد.")
    try:
        url = start_payment(order, scenario=body.scenario if body else None)
    except PaymentError as e:
        raise ApiError(409, e.code, e.message)
    return {"redirect_url": url}
