"""سبد: منطق ذخیره‌سازی. تصمیم‌ها (سقف، ادغام، هشدار) در merge.py (خالص)."""
from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import Product
from apps.catalog.rules import is_hidden_brand
from apps.pricing.models import ExchangeRate
from apps.pricing.money import to_toman

from .merge import line_warnings, max_qty, merge_lines
from .models import Cart, CartItem

COOKIE = "cx_cart"
COOKIE_SALT = "cart-guest"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30


class NotPurchasable(Exception):
    pass


def cap_for_product(p: Product) -> int:
    return max_qty(
        p.final_usd_cents if p.price_usd_cents is not None else None,
        high_value_cents=settings.CART_HIGH_VALUE_USD_CENTS,
        high_value_max=settings.CART_HIGH_VALUE_MAX_QTY,
        default_max=settings.CART_DEFAULT_MAX_QTY,
    )


def is_buyable(p: Product) -> bool:
    """قابل افزودن به سبد: هر کالای فعال با قیمت ثبتشده و برند غیرپنهان.

    پرچم قدیمی `purchasable` دیگر مانع سبد نمیشود؛ تمام کالاها قابل انتخاباند.
    """
    return (
        p.status == Product.Status.ACTIVE
        and p.price_usd_cents is not None
        and not is_hidden_brand(p.brand, getattr(settings, "HIDDEN_BRANDS", ()))
    )


def guest_key(request) -> str | None:
    return request.get_signed_cookie(COOKIE, default=None, salt=COOKIE_SALT)


def get_cart(request, create: bool = False) -> tuple[Cart | None, str | None]:
    """(سبد، کلید مهمانِ تازه‌ساخته‌شده برای نوشتن در کوکی). کاربر واردشده: سبد خودش؛ مهمان: با کوکی امضاشده."""
    user = request.user
    if user.is_authenticated:
        if create:
            cart, _ = Cart.objects.get_or_create(user=user)
            return cart, None
        return Cart.objects.filter(user=user).first(), None
    key = guest_key(request)
    cart = Cart.objects.filter(guest_key=key, user__isnull=True).first() if key else None
    if cart or not create:
        return cart, None
    key = secrets.token_urlsafe(24)
    return Cart.objects.create(guest_key=key), key


def set_item(cart: Cart, slug: str, qty: int) -> bool:
    """تعداد را تنظیم می‌کند (۰ = حذف). True اگر به سقف کوتاه شد. NotPurchasable اگر کالا قابل خرید نیست."""
    product = Product.objects.filter(slug=slug).first()
    if qty <= 0:
        CartItem.objects.filter(cart=cart, product__slug=slug).delete()
        cart.save(update_fields=["updated_at"])
        return False
    if product is None or not is_buyable(product):
        raise NotPurchasable(slug)
    cap = cap_for_product(product)
    capped = qty > cap
    with transaction.atomic():
        CartItem.objects.update_or_create(cart=cart, product=product, defaults={"qty": min(qty, cap), "seen_final_usd_cents": product.final_usd_cents})
        cart.save(update_fields=["updated_at"])
    return capped


def clear(cart: Cart) -> None:
    cart.items.all().delete()
    cart.save(update_fields=["updated_at"])


def ack(cart: Cart) -> None:
    """کاربر تغییر قیمت را دید و پذیرفت: «آخرین قیمت دیده‌شده» را به قیمت فعلی می‌بریم."""
    for item in cart.items.select_related("product"):
        if item.product.price_usd_cents is not None:
            item.seen_final_usd_cents = item.product.final_usd_cents
            item.save(update_fields=["seen_final_usd_cents"])


def merge_guest_into_user(request, user) -> Cart:
    """سبد مهمان را پس از ورود در سبد کاربر ادغام می‌کند (جمع تعداد با سقف) و سبد مهمان را حذف می‌کند."""
    key = guest_key(request)
    with transaction.atomic():
        user_cart, _ = Cart.objects.select_for_update().get_or_create(user=user)
        guest = Cart.objects.select_for_update().filter(guest_key=key, user__isnull=True).first() if key else None
        if guest is None:
            return user_cart
        user_lines = {i.product_id: i.qty for i in user_cart.items.all()}
        guest_lines = {i.product_id: i.qty for i in guest.items.all()}
        products = {p.pk: p for p in Product.objects.filter(pk__in={*user_lines, *guest_lines})}
        buyable = {pid: p for pid, p in products.items() if is_buyable(p)}
        merged = merge_lines({k: v for k, v in user_lines.items() if k in buyable}, {k: v for k, v in guest_lines.items() if k in buyable}, lambda pid: cap_for_product(buyable[pid]))
        user_cart.items.all().delete()
        CartItem.objects.bulk_create([CartItem(cart=user_cart, product=buyable[pid], qty=q, seen_final_usd_cents=buyable[pid].final_usd_cents) for pid, q in merged.items()])
        guest.delete()
        user_cart.save(update_fields=["updated_at"])
    return user_cart


def serialize(cart: Cart | None, capped_slugs: tuple[str, ...] = ()) -> dict:
    """نمای سبد با قیمت و موجودی **زنده**. NoActiveRate بالا می‌رود (API ⇒ ۵۰۳)."""
    rate = ExchangeRate.current().toman_per_usd
    lines, subtotal, count = [], 0, 0
    items = cart.items.select_related("product").prefetch_related("product__images") if cart else []
    for it in items:
        p = it.product
        buyable = is_buyable(p)
        unit_usd = p.final_usd_cents if p.price_usd_cents is not None else None
        unit_toman = to_toman(unit_usd, rate) if (buyable and unit_usd is not None) else None
        first = next(iter(p.images.all()), None)
        warns = line_warnings(seen_cents=it.seen_final_usd_cents, current_cents=unit_usd, qty=it.qty, stock=p.stock, purchasable=buyable)
        if unit_toman is not None:
            subtotal += unit_toman * it.qty
        count += it.qty
        old_toman = to_toman(p.price_usd_cents, rate) if p.price_usd_cents is not None else None
        lines.append({
            "slug": p.slug, "name": p.name, "brand": p.brand, "image": first.file_name if first else None,
            "specs": p.specs or {}, "discount_percent": p.discount_percent, "old_toman": old_toman,
            "price_note": p.price_note, "qty": it.qty, "max_qty": cap_for_product(p), "stock": p.stock,
            "unit_toman": unit_toman, "unit_usd_cents": unit_usd if buyable else None, "line_toman": unit_toman * it.qty if unit_toman is not None else None,
            "warnings": [{"code": w.code, "message": w.message} for w in warns],
        })
    notices = [{"code": "qty_capped", "slug": s} for s in capped_slugs]
    return {"lines": lines, "count": count, "subtotal_toman": subtotal, "notices": notices}


def cleanup_old_carts(now=None, days: int | None = None) -> int:
    """سبدهای کهنه‌تر از CART_RETENTION_DAYS را حذف می‌کند و **تعداد سبدهای حذف‌شده** را برمی‌گرداند.

    نکته: `QuerySet.delete()` مجموع ردیف‌های حذف‌شده (سبد + اقلام آبشاری) را برمی‌گرداند؛
    برای گزارش درست باید پیش از حذف، تعداد سبدها شمرده شود.
    """
    cutoff = (now or timezone.now()) - timedelta(days=settings.CART_RETENTION_DAYS if days is None else days)
    stale = Cart.objects.filter(updated_at__lt=cutoff)
    n = stale.count()
    if n:
        stale.delete()
    return n
