"""API سفارش و روش‌های ارسال. مالکیت همیشه در خود query (filter(user=...))؛ کد خطای ماشین‌خوان در بدنه (ADR-003 / contracts/openapi.yaml)."""
from __future__ import annotations

from datetime import datetime

from django.db.models import Q
from ninja import Header, Query, Router, Schema
from ninja.security import django_auth

from apps.accounts.api import AddressIn, snapshot_from_fields, validated_fields
from apps.accounts.models import Address
from apps.cart import services as cart_svc
from apps.core.errors import ApiError
from apps.core.security import log_security
from apps.pricing.models import NoActiveRate

from .cursor import decode_cursor, encode_cursor
from .idempotency import InvalidIdempotencyKey, validate_key
from .models import Order, ReturnRequest, ShippingMethod
from .numbering import is_valid_order_number
from .services import (
    CouponError,
    EmptyOrder,
    IdempotencyConflict,
    InvalidTransition,
    NotPurchasable,
    OrderError,
    OutOfStock,
    ReturnError,
    ShippingUnavailable,
    cancel_order,
    create_order_from_cart,
    replay_for,
    request_return,
)
from .shipping import quote

router = Router(tags=["orders"], auth=django_auth)
shipping_router = Router(tags=["shipping"])

COUPON_MESSAGES = {
    "not_found": "این کد تخفیف وجود ندارد.",
    "expired": "مهلت استفاده از این کد تخفیف تمام شده است.",
    "not_started": "این کد تخفیف هنوز فعال نشده است.",
    "min_subtotal": "مبلغ سبد برای این کد تخفیف کافی نیست.",
    "cooldown_or_used": "این کد تخفیف دیگر قابل استفاده نیست.",
    "user_limit": "شما قبلاً از این کد تخفیف استفاده کرده‌اید.",
    "invalid_percent": "درصد این کد تخفیف معتبر نیست.",
}


class OrderItemOut(Schema):
    id: int
    slug: str
    name: str
    image: str | None
    qty: int
    unit_toman: int


class OrderOut(Schema):
    number: str
    status: str
    subtotal_toman: int
    discount_toman: int
    coupon_code: str
    shipping_toman: int
    tax_toman: int
    total_toman: int
    shipping_code: str
    created_at: datetime
    expires_at: datetime | None
    items: list[OrderItemOut]
    address: dict
    #: آخرین پرداخت این سفارش (initiated/redirected/verified/failed/needs_review/refunded) یا null
    payment_status: str | None


class OrderListOut(Schema):
    items: list[OrderOut]
    next_cursor: str | None


class OrderCreateIn(Schema):
    address_id: int | None = None
    address: AddressIn | None = None
    shipping_code: str
    #: کد کوپن (اختیاری). تخفیف فقط سمت سرور محاسبه و در سفارش ثبت می‌شود.
    coupon_code: str | None = None


class ShippingQuoteOut(Schema):
    code: str
    name: str
    eta: str
    #: null = برای این استان/مبلغ در دسترس نیست
    cost_toman: int | None


def order_out(o: Order) -> dict:
    items = []
    for it in o.items.select_related("product").prefetch_related("product__images"):
        first = next(iter(it.product.images.all()), None)
        items.append({"id": it.pk, "slug": it.product.slug, "name": it.product.name, "image": first.file_name if first else None, "qty": it.qty, "unit_toman": it.unit_toman})
    last = o.payments.order_by("-id").first() if hasattr(o, "payments") else None
    return {
        "number": o.number, "status": o.status, "subtotal_toman": o.subtotal_toman, "discount_toman": o.discount_toman,
        "coupon_code": o.coupon_code, "shipping_toman": o.shipping_toman, "tax_toman": o.tax_toman, "total_toman": o.total_toman,
        "shipping_code": o.shipping_code, "created_at": o.created_at, "expires_at": o.expires_at, "items": items, "address": o.address, "payment_status": last.status if last else None,
    }


def _own_order(request, number: str) -> Order:
    if not is_valid_order_number(number):
        raise ApiError(404, "not_found", "سفارش پیدا نشد.")
    o = Order.objects.filter(user=request.user, number=number).first()  # مالکیت در خود query
    if o is None:
        raise ApiError(404, "not_found", "سفارش پیدا نشد.")
    return o


@router.post("", response={201: OrderOut}, operation_id="orders_create", summary="ثبت سفارش از سبد (هدر Idempotency-Key الزامی)")
def orders_create(request, body: OrderCreateIn, idempotency_key: str | None = Header(None, alias="Idempotency-Key")):
    try:
        key = validate_key(idempotency_key)
    except InvalidIdempotencyKey:
        raise ApiError(422, "invalid_idempotency_key", "هدر Idempotency-Key باید یک UUID معتبر باشد.")
    if body.address_id is not None:
        a = Address.objects.filter(user=request.user, pk=body.address_id).first()
        if a is None:
            raise ApiError(422, "invalid_address", "نشانی انتخاب‌شده پیدا نشد.")
        snapshot = a.as_snapshot()
    elif body.address is not None:
        snapshot = snapshot_from_fields(validated_fields(body.address))
    else:
        raise ApiError(422, "invalid_address", "نشانی لازم است.")
    cart, _ = cart_svc.get_cart(request, create=False)
    try:
        replayed = replay_for(request.user, key, snapshot, body.shipping_code, body.coupon_code)  # تکرار/دوبار کلیک: سبد قبلاً مصرف شده، ولی سفارش هست
        if replayed is None and (cart is None or not cart.items.exists()):
            raise ApiError(422, "cart_empty", "سبد خرید خالی است.")
        order = replayed or create_order_from_cart(request.user, cart, key, snapshot, body.shipping_code, body.coupon_code)
    except IdempotencyConflict:
        raise ApiError(409, "idempotency_conflict", "این کلید قبلاً با درخواست دیگری استفاده شده است.")
    except CouponError as e:
        log_security("coupon_rejected", request, reason=e.code)
        raise ApiError(422, "invalid_coupon", COUPON_MESSAGES.get(e.code, "این کد تخفیف معتبر نیست."))
    except OutOfStock as e:
        raise ApiError(409, "out_of_stock", "موجودی این کالا کافی نیست.", slug=e.slug)
    except NotPurchasable as e:
        raise ApiError(409, "not_purchasable", "این کالا فعلاً قابل خرید نیست.", slug=e.ref)
    except EmptyOrder:
        raise ApiError(422, "cart_empty", "سبد خرید خالی است.")
    except ShippingUnavailable:
        raise ApiError(422, "shipping_unavailable", "این روش ارسال برای نشانی شما در دسترس نیست.")
    except NoActiveRate:
        raise ApiError(503, "rate_unavailable", "نرخ ارز تنظیم نشده است.")
    except OrderError as e:
        raise ApiError(422, "order_error", str(e))
    return 201, order_out(order)


class ReturnOut(Schema):
    id: int
    order_number: str
    item_slug: str
    reason: str
    status: str
    created_at: datetime


class ReturnList(Schema):
    items: list[ReturnOut]


class ReturnCreateIn(Schema):
    item_id: int
    reason: str


def _return_out(r: ReturnRequest) -> dict:
    return {
        "id": r.pk, "order_number": r.order.number, "item_slug": r.item.product.slug if r.item.product_id else "",
        "reason": r.reason, "status": r.status, "created_at": r.created_at,
    }


@router.get("", response=OrderListOut, operation_id="orders_list")
def orders_list(request, cursor: str | None = Query(None), limit: int = Query(20, ge=1, le=50)):
    qs = Order.objects.filter(user=request.user).order_by("-created_at", "-id")
    if cursor:
        try:
            iso, pk = decode_cursor(cursor)
        except ValueError:
            raise ApiError(422, "invalid_cursor", "cursor نامعتبر است.")
        at = datetime.fromisoformat(iso)
        qs = qs.filter(Q(created_at__lt=at) | Q(created_at=at, pk__lt=pk))
    rows = list(qs[: limit + 1])
    page, more = rows[:limit], len(rows) > limit
    nxt = encode_cursor(page[-1].created_at.isoformat(), page[-1].pk) if more and page else None
    return {"items": [order_out(o) for o in page], "next_cursor": nxt}


@router.get("/returns", response=ReturnList, operation_id="orders_returns_list", summary="درخواستهای مرجوعی کاربر")
def returns_list(request):
    rows = ReturnRequest.objects.filter(order__user=request.user).select_related("order", "item", "item__product").order_by("-created_at", "-id")
    return {"items": [_return_out(r) for r in rows[:100]]}


@router.post("/{number}/returns", response=ReturnOut, operation_id="orders_return_create", summary="درخواست مرجوعی برای یک قلم سفارش تحویلشده")
def return_create(request, number: str, body: ReturnCreateIn):
    try:
        row = request_return(request.user, number, body.item_id, body.reason)
    except ReturnError as e:
        raise ApiError(422, "invalid_return", str(e))
    return _return_out(row)


@router.get("/{number}", response=OrderOut, operation_id="orders_get")
def orders_get(request, number: str):
    return order_out(_own_order(request, number))


@router.post("/{number}/cancel", response=OrderOut, operation_id="orders_cancel", summary="لغو سفارش پرداخت‌نشده")
def orders_cancel(request, number: str):
    o = _own_order(request, number)
    try:
        o = cancel_order(request.user, o.number)
    except InvalidTransition:
        raise ApiError(409, "invalid_status", "فقط سفارش پرداخت‌نشده قابل لغو است.")
    return order_out(o)


@shipping_router.get("/methods", response=list[ShippingQuoteOut], auth=None, operation_id="shipping_methods", summary="روش‌های ارسال و هزینه برای یک استان")
def shipping_methods(request, province: str, subtotal_toman: int = Query(0, ge=0)):
    out = []
    for m in ShippingMethod.objects.filter(is_active=True):
        out.append({"code": m.code, "name": m.name, "eta": m.eta, "cost_toman": quote(m.as_rule(), province, subtotal_toman)})
    return out
