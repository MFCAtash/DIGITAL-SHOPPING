"""اعتبارسنجی کوپن: مبلغ تخفیف را صرفاً سمت سرور محاسبه می‌کند (قیمت/تخفیف هرگز از کلاینت باور نمی‌شود).

این endpoint فقط «پیش‌نمایش» است؛ ثبت نهایی تخفیف در سفارش (با قفل ردیف کوپن و سقف مصرف)
در `orders.services.place_order` انجام می‌شود.
"""
from __future__ import annotations

from datetime import datetime

from ninja import Query, Router, Schema
from ninja.errors import HttpError

from .models import Coupon, CouponUse

router = Router(tags=["pricing"])

MESSAGES = {
    "not_found": "این کد تخفیف وجود ندارد.",
    "expired": "مهلت استفاده از این کد تخفیف تمام شده است.",
    "not_started": "این کد تخفیف هنوز فعال نشده است.",
    "min_subtotal": "مبلغ سبد برای این کد تخفیف کافی نیست.",
    "cooldown_or_used": "این کد تخفیف دیگر قابل استفاده نیست.",
    "user_limit": "شما قبلاً از این کد تخفیف استفاده کرده‌اید.",
    "invalid_percent": "درصد این کد تخفیف معتبر نیست.",
}


class CouponOut(Schema):
    code: str
    description: str
    kind: str
    discount_toman: int
    min_subtotal_toman: int
    max_discount_toman: int | None
    valid_until: datetime | None


@router.get("/coupons/validate", response=CouponOut, operation_id="pricing_validate_coupon", summary="محاسبهٔ تخفیف کوپن بر اساس جمع کالاها")
def validate_coupon(request, code: str = Query(...), subtotal_toman: int = Query(0, ge=0)):
    coupon = Coupon.objects.filter(code__iexact=code.strip(), is_active=True).first()
    if coupon is None:
        raise HttpError(404, "not_found")
    if request.user.is_authenticated and coupon.max_uses_per_user is not None:
        if CouponUse.objects.filter(coupon=coupon, user=request.user).count() >= coupon.max_uses_per_user:
            raise HttpError(409, MESSAGES["user_limit"])
    try:
        discount = coupon.discount_for(subtotal_toman)
    except ValueError as exc:
        raise HttpError(409, MESSAGES.get(str(exc), "این کد تخفیف معتبر نیست.")) from exc
    return {
        "code": coupon.code,
        "description": coupon.description,
        "kind": coupon.kind,
        "discount_toman": discount,
        "min_subtotal_toman": coupon.min_subtotal_toman,
        "max_discount_toman": coupon.max_discount_toman,
        "valid_until": coupon.valid_until,
    }
