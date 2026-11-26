"""API سبد. مهمان با کوکی امضاشدهٔ cx_cart؛ کاربر واردشده با سبد خودش. قیمت و موجودی همیشه زنده‌اند (کش نمی‌شوند)."""
from __future__ import annotations

from ninja import Field, Router, Schema
from ninja.security import django_auth

from apps.core.errors import ApiError
from apps.core.http import json_response
from apps.pricing.models import NoActiveRate

from . import services as svc

router = Router(tags=["cart"])


class WarningOut(Schema):
    code: str
    message: str


class LineOut(Schema):
    slug: str
    name: str
    brand: str
    image: str | None
    specs: dict
    discount_percent: int
    old_toman: int | None
    price_note: str
    qty: int
    max_qty: int
    stock: int
    unit_toman: int | None
    unit_usd_cents: int | None
    line_toman: int | None
    warnings: list[WarningOut]


class NoticeOut(Schema):
    code: str
    slug: str


class CartOut(Schema):
    lines: list[LineOut]
    count: int
    subtotal_toman: int
    notices: list[NoticeOut]


class QtyIn(Schema):
    qty: int = Field(..., ge=0, le=99)


def _respond(request, cart, new_key: str | None = None, capped: tuple[str, ...] = (), clear_cookie: bool = False, status: int = 200):
    try:
        data = svc.serialize(cart, capped)
    except NoActiveRate:
        raise ApiError(503, "rate_unavailable", "نرخ ارز تنظیم نشده است.")
    resp = json_response(data, status)
    if new_key:
        resp.set_signed_cookie(svc.COOKIE, new_key, salt=svc.COOKIE_SALT, max_age=svc.COOKIE_MAX_AGE, httponly=True, samesite="Lax", secure=request.is_secure())
    if clear_cookie:
        resp.delete_cookie(svc.COOKIE)
    return resp


@router.get("", response=CartOut, auth=None, operation_id="cart_get")
def cart_get(request):
    cart, _ = svc.get_cart(request, create=False)
    return _respond(request, cart)


@router.put("/items/{slug}", response=CartOut, auth=None, operation_id="cart_set_item", summary="تنظیم تعداد (۰ = حذف)")
def cart_set_item(request, slug: str, body: QtyIn):
    cart, new_key = svc.get_cart(request, create=True)
    try:
        capped = svc.set_item(cart, slug, body.qty)
    except svc.NotPurchasable:
        raise ApiError(409, "not_purchasable", "این کالا فعلاً قابل خرید نیست.", slug=slug)
    return _respond(request, cart, new_key, capped=(slug,) if capped else ())


@router.delete("/items/{slug}", response=CartOut, auth=None, operation_id="cart_remove_item")
def cart_remove_item(request, slug: str):
    cart, _ = svc.get_cart(request, create=False)
    if cart:
        svc.set_item(cart, slug, 0)
    return _respond(request, cart)


@router.delete("", response=CartOut, auth=None, operation_id="cart_clear")
def cart_clear(request):
    cart, _ = svc.get_cart(request, create=False)
    if cart:
        svc.clear(cart)
    return _respond(request, cart)


@router.post("/merge", response=CartOut, auth=django_auth, operation_id="cart_merge", summary="ادغام سبد مهمان پس از ورود")
def cart_merge(request):
    cart = svc.merge_guest_into_user(request, request.user)
    return _respond(request, cart, clear_cookie=True)


@router.post("/ack", response=CartOut, auth=django_auth, operation_id="cart_ack", summary="پذیرفتن تغییر قیمت/موجودی")
def cart_ack(request):
    cart, _ = svc.get_cart(request, create=False)
    if cart:
        svc.ack(cart)
    return _respond(request, cart)
