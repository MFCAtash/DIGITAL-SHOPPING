from __future__ import annotations

import hashlib
import json
from datetime import date
from functools import reduce

from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, Count, F, FloatField, IntegerField, Max, Min, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Cast, Coalesce, Floor, Lower
from ninja import Query, Router, Schema
from ninja.errors import HttpError
from ninja.security import django_auth

from apps.core import metrics
from apps.core.persian import normalize_fa
from apps.orders.models import Order, OrderItem
from apps.orders.states import OrderStatus
from apps.pricing.models import ExchangeRate, NoActiveRate
from apps.pricing.money import to_toman

from .models import Category, Product, Review, Wishlist

router = Router(tags=["catalog"])

# قیمت نمایشی همان چیزی است که کاربر میبیند: price_usd_cents بعد از تخفیف.
# کلیهٔ فیلترها و مرتبسازیهای قیمتی از این عبارت استفاده میکنند.
FINAL_PRICE = Cast(Floor(F("price_usd_cents") * (100 - F("discount_percent")) / 100.0), IntegerField())

SORTS = {
    "newest": ("-created_at", "-id"),
    "price_asc": ("final_price_cents", "id"),
    "price_desc": ("-final_price_cents", "-id"),
}
# مرتبسازهایی که به alias نیاز دارند (در prepare_query اضافه میشوند)
ANNOTATED_SORTS = {"rating": ("-rating_avg", "-id"), "discount": ("-discount_percent", "-id"), "popular": ("-sold_count", "-id")}


def rating_alias():
    """میانگین امتیاز تأییدشده؛ محصول بدون نظر ⇒ ۰ و در انتهای sort=rating."""
    return Coalesce(Avg("reviews__rating", filter=Q(reviews__status=Review.Status.APPROVED)), Value(0.0), output_field=FloatField())


def prepare_query(qs, f: ProductFilters):
    """aliasهای لازم را بدون اضافه کردن ستون به SELECT اضافه میکند."""
    qs = qs.alias(final_price_cents=FINAL_PRICE)
    if f.min_rating is not None or f.sort == "rating":
        qs = qs.alias(rating_avg=rating_alias())
    if f.sort == "popular":
        sold = (
            OrderItem.objects.filter(product=OuterRef("pk"))
            .values("product")
            .annotate(n=Sum("qty"))
            .values("n")[:1]
        )
        qs = qs.alias(sold_count=Coalesce(Subquery(sold, output_field=IntegerField()), 0))
    return qs


class ImageOut(Schema):
    file: str
    alt: str


class ProductOut(Schema):
    slug: str
    brand: str
    category: str
    name: str
    description: str
    specs: dict
    price_usd_cents: int
    final_usd_cents: int
    discount_percent: int
    price_toman: int | None
    price_note: str
    price_checked_on: date | None
    purchasable: bool
    in_stock: bool
    stock: int
    images: list[ImageOut]


class CategoryOut(Schema):
    slug: str
    name: str


class ProductList(Schema):
    count: int
    items: list[ProductOut]


class ProductFilters(Schema):
    brand: str | None = None
    category: str | None = None
    #: چند مقدار با ویرگول: brands=apple,samsung — فیلتر چندانتخابی واقعی
    brands: str | None = None
    categories: str | None = None
    q: str | None = None
    ram_gte: int | None = None
    storage_gte: int | None = None
    #: فیلتر عمومی مشخصات: spec=ram:gte:8,storage:gte:256
    spec: str | None = None
    min_usd: int | None = None
    min_rating: int | None = None  # حداقل امتیاز میانگین تأییدشده (۱–۵)
    max_usd: int | None = None  # دلار، بر اساس قیمت نهایی بعد از تخفیف
    purchasable: bool | None = None
    in_stock: bool | None = None
    on_sale: bool | None = None
    sort: str = "newest"
    lang: str = "fa"
    limit: int = 24
    offset: int = 0


def _current_rate() -> int | None:
    try:
        return ExchangeRate.current().toman_per_usd
    except NoActiveRate:
        return None


def serialize(p: Product, rate: int | None, lang: str) -> dict:
    final = p.final_usd_cents
    assert final is not None and p.price_usd_cents is not None
    return {
        "slug": p.slug,
        "brand": p.brand,
        "category": p.category.slug,
        "name": p.name,
        "description": p.description_i18n.get(lang) or p.description_i18n.get("fa", ""),
        "specs": p.specs,
        "price_usd_cents": p.price_usd_cents,
        "final_usd_cents": final,
        "discount_percent": p.discount_percent,
        "price_toman": to_toman(final, rate) if rate else None,
        "price_note": p.price_note,
        "price_checked_on": p.price_checked_on,
        "purchasable": p.purchasable and p.stock > 0,
        "in_stock": p.stock > 0,
        "stock": p.stock,
        "images": [{"file": i.file_name, "alt": i.alt_i18n.get(lang) or i.alt_i18n.get("fa", "")} for i in p.images.all()],
    }


def hidden_brand_q():
    """Q برندهای پنهان‌شده؛ در تمام نقاط خروج عمومی کاتالوگ اعمال می‌شود (نه فقط هنگام ایمپورت)."""
    q = Q(pk__in=[])
    for brand in getattr(settings, "HIDDEN_BRANDS", []):
        if brand and str(brand).strip():
            q |= Q(brand__iexact=str(brand).strip())
    return q


def visible_products():
    """فقط آگهی‌های فعال، دارای قیمت، دارای عکس و **غیرپنهان** (قانون پروژه).

    سیاست HIDDEN_BRANDS قبلاً فقط در import_catalog اعمال می‌شد و یک آگهی قدیمی/دستی
    می‌توانست از API عمومی نمایش داده شود. فیلتر اکنون در نقطهٔ خروج عمومی است.
    """
    return (
        Product.objects.filter(status=Product.Status.ACTIVE, price_usd_cents__isnull=False, images__isnull=False)
        .exclude(hidden_brand_q())
        .select_related("category")
        .prefetch_related("images")
        .distinct()
    )


def _split(raw: str | None) -> list[str]:
    return [x.strip() for x in (raw or "").split(",") if x.strip()]


def _validate_filters(f: ProductFilters) -> None:
    """پارامترهای نامعتبر را بهجای نادیده گرفتن، ۴۲۱ میکنند."""
    if f.min_usd is not None and f.min_usd < 0:
        raise HttpError(422, "invalid_min_usd")
    if f.max_usd is not None and f.max_usd < 0:
        raise HttpError(422, "invalid_max_usd")
    if f.min_usd is not None and f.max_usd is not None and f.min_usd > f.max_usd:
        raise HttpError(422, "inverted_price_range")
    if f.min_rating is not None and not 1 <= f.min_rating <= 5:
        raise HttpError(422, "invalid_min_rating")
    if f.sort not in SORTS and f.sort not in ANNOTATED_SORTS:
        raise HttpError(422, "invalid_sort")


SPEC_FIELDS = {
    "ram": ("ram_gb", int),
    "storage": ("storage_gb", int),
    "screen": ("screen_in", float),
    "battery": ("battery_mah", int),
    "weight": ("weight_g", int),
}
SPEC_OPS = {"gte": "gte", "lte": "lte", "eq": "exact"}


def _spec_filters(raw: str | None) -> list[Q]:
    """spec=ram:gte:8,screen:gte:15,weight:lte:2500 → شرطهای ORM معتبر."""
    out: list[Q] = []
    for part in _split(raw):
        bits = part.split(":")
        if len(bits) != 3:
            raise HttpError(422, "invalid_spec")
        key, op, value = (b.strip() for b in bits)
        field = SPEC_FIELDS.get(key)
        if field is None or op not in SPEC_OPS:
            raise HttpError(422, "invalid_spec")
        try:
            number = field[1](value)
        except (TypeError, ValueError):
            raise HttpError(422, "invalid_spec") from None
        out.append(Q(**{f"{field[0]}__{SPEC_OPS[op]}": number}))
    return out


def apply_filters(qs, f: ProductFilters):
    """همهٔ فیلترها در یک نقطه تا فهرست، فاست و پیشنهادها یکسان رفتار کنند."""
    _validate_filters(f)
    if f.brand:
        qs = qs.filter(brand__iexact=f.brand)
    brands = _split(f.brands)
    if brands:
        qs = qs.filter(reduce(lambda a, b: a | b, [Q(brand__iexact=b) for b in brands]))
    if f.category:
        qs = qs.filter(category__slug=f.category)
    categories = _split(f.categories)
    if categories:
        qs = qs.filter(category__slug__in=categories)
    term = (f.q or "").strip()
    if term:
        # هم متن خام و هم نسخهٔ نرمالشده جستجو میشوند تا «ی» عربی، نیمفاصله و
        # ارقام فارسی در متن ذخیرهشده هم پیدا شوند.
        terms = {term, normalize_fa(term)} - {""}
        search = Q()
        for value in terms:
            search |= (
                Q(name__icontains=value)
                | Q(brand__icontains=value)
                | Q(specs__icontains=value)
                | Q(description_i18n__icontains=value)
                | Q(category__slug__icontains=value)
            )
        qs = qs.filter(search)
    if f.ram_gte is not None:
        qs = qs.filter(ram_gb__gte=f.ram_gte)
    if f.storage_gte is not None:
        qs = qs.filter(storage_gb__gte=f.storage_gte)
    for condition in _spec_filters(f.spec):
        qs = qs.filter(condition)
    # فیلتر قیمت بر اساس همان قیمتی که نمایش داده میشود (بعد از تخفیف)
    if f.min_usd is not None:
        qs = qs.filter(final_price_cents__gte=f.min_usd * 100)
    if f.max_usd is not None:
        qs = qs.filter(final_price_cents__lt=f.max_usd * 100)
    if f.in_stock is not None:
        qs = qs.filter(stock__gt=0) if f.in_stock else qs.filter(stock=0)
    if f.on_sale is not None:
        qs = qs.filter(discount_percent__gt=0) if f.on_sale else qs.filter(discount_percent=0)
    if f.purchasable is not None:
        qs = qs.filter(purchasable=True, stock__gt=0) if f.purchasable else qs.filter(Q(purchasable=False) | Q(stock=0))
    if f.min_rating is not None:
        qs = qs.filter(rating_avg__gte=f.min_rating)
    return qs


@router.get("/products", response=ProductList, operation_id="catalog_list_products", summary="فهرست کالاها با فیلتر و مرتبسازی")
def list_products(request, filters: ProductFilters = Query(...)):
    qs = apply_filters(prepare_query(visible_products(), filters), filters)
    order = ANNOTATED_SORTS.get(filters.sort) or SORTS[filters.sort]
    qs = qs.order_by(*order)
    limit = min(max(filters.limit, 1), 100)
    offset = max(filters.offset, 0)
    rate = _current_rate()
    count = qs.count()
    if filters.q and count == 0:
        metrics.inc("digital_shopping_search_zero_results_total")
    return {"count": count, "items": [serialize(p, rate, filters.lang) for p in qs[offset : offset + limit]]}

@router.get("/products/{slug}", response=ProductOut, operation_id="catalog_get_product")
def get_product(request, slug: str, lang: str = "fa"):
    p = visible_products().filter(slug=slug).first()
    if p is None:
        raise HttpError(404, "not_found")
    return serialize(p, _current_rate(), lang)


@router.get("/categories", response=list[CategoryOut], operation_id="catalog_list_categories")
def list_categories(request, lang: str = "fa"):
    return [{"slug": c.slug, "name": c.name_i18n.get(lang) or c.name_i18n.get("fa", c.slug)} for c in Category.objects.all()]


# ---------------- فاست‌ها: شمارش پایدار برای ریل فیلتر (بدون حدس از صفحهٔ جاری) ----------------


class FacetValue(Schema):
    value: str
    label: str
    count: int


class PriceBucket(Schema):
    label: str
    min_usd: int | None
    max_usd: int | None
    count: int


class PriceFacet(Schema):
    min_usd: int | None
    max_usd: int | None
    toman_per_usd: int | None
    buckets: list[PriceBucket]


class FacetsOut(Schema):
    total: int
    brands: list[FacetValue]
    categories: list[FacetValue]
    ram: list[FacetValue]
    storage: list[FacetValue]
    price: PriceFacet
    in_stock: int
    on_sale: int


PRICE_BUCKETS = [(0, 100), (100, 300), (300, 600), (600, 1000), (1000, None)]


@router.get("/facets", response=FacetsOut, operation_id="catalog_facets", summary="شمارش فیلترها برای PLP (کش ۶۰ ثانیه)")
def facets(request, filters: ProductFilters = Query(...)):
    _validate_filters(filters)
    # sort/limit/offset بر شمارشها اثری ندارند و نباید کش را تکهتکه کنند.
    fingerprint = hashlib.sha256(
        json.dumps(filters.model_dump(exclude={"sort", "limit", "offset"}), sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()
    key = f"catalog:facets:v4:{fingerprint}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    def base_without(*fields: str):
        f2 = filters.model_copy(update={name: None for name in fields})
        return apply_filters(prepare_query(visible_products(), f2), f2)

    brand_base = base_without("brand", "brands")
    category_base = base_without("category", "categories")
    price_base = base_without("min_usd", "max_usd")
    boolean_base = base_without("in_stock", "on_sale", "purchasable")
    ram_base = base_without("ram_gte")
    storage_base = base_without("storage_gte")
    total_base = apply_filters(prepare_query(visible_products(), filters), filters)
    lang = filters.lang

    brand_rows = (
        brand_base.annotate(brand_key=Lower("brand"))
        .values("brand_key")
        .annotate(count=Count("pk"))
        .annotate(label=Min("brand"))
        .order_by("-count", "brand_key")
    )
    brands = [{"value": r["label"], "label": r["label"], "count": r["count"]} for r in brand_rows if r["count"]]
    categories = [
        {
            "value": r["category__slug"],
            "label": (r["category__name_i18n"] or {}).get(lang)
            or (r["category__name_i18n"] or {}).get("fa")
            or r["category__slug"],
            "count": r["count"],
        }
        for r in category_base.values("category__slug", "category__name_i18n")
        .annotate(count=Count("pk"))
        .order_by("-count")
    ]
    ram_rows = ram_base.exclude(ram_gb__isnull=True).values("ram_gb").annotate(count=Count("pk")).order_by("ram_gb")
    storage_rows = storage_base.exclude(storage_gb__isnull=True).values("storage_gb").annotate(count=Count("pk")).order_by("storage_gb")
    bounds = price_base.annotate(price_value=FINAL_PRICE).aggregate(lo=Min("price_value"), hi=Max("price_value"))
    buckets = []
    for lo, hi in PRICE_BUCKETS:
        cond = Q()
        if lo:
            cond &= Q(final_price_cents__gte=lo * 100)
        if hi:
            cond &= Q(final_price_cents__lt=hi * 100)
        buckets.append({"label": f"{lo}–{hi}" if hi else f"{lo}+", "min_usd": lo, "max_usd": hi, "count": price_base.filter(cond).count()})
    data = {
        "total": total_base.count(),
        "brands": brands,
        "categories": categories,
        "ram": [{"value": str(r["ram_gb"]), "label": str(r["ram_gb"]), "count": r["count"]} for r in ram_rows],
        "storage": [{"value": str(r["storage_gb"]), "label": str(r["storage_gb"]), "count": r["count"]} for r in storage_rows],
        "price": {
            "min_usd": (bounds["lo"] // 100) if bounds["lo"] is not None else None,
            "max_usd": (bounds["hi"] // 100) if bounds["hi"] is not None else None,
            "toman_per_usd": _current_rate(),
            "buckets": buckets,
        },
        "in_stock": boolean_base.filter(stock__gt=0).count(),
        "on_sale": boolean_base.filter(discount_percent__gt=0).count(),
    }
    cache.set(key, data, 60)
    return data

# ---------------- فاز ۶–۱۲: واریانت، نظر، علاقه‌مندی ----------------


class VariantOut(Schema):
    sku: str
    name: str
    options: dict
    final_usd_cents: int | None
    price_toman: int | None
    stock: int
    is_active: bool


class VariantList(Schema):
    items: list[VariantOut]


@router.get("/products/{slug}/variants", response=VariantList, operation_id="catalog_list_variants", summary="واریانت‌های قابل‌انتخاب محصول")
def list_variants(request, slug: str, lang: str = "fa"):
    product = visible_products().filter(slug=slug).first()
    if product is None:
        raise HttpError(404, "not_found")
    rate = _current_rate()
    items = []
    for v in product.variants.filter(is_active=True):
        cents = v.final_usd_cents()
        items.append({
            "sku": v.sku,
            "name": v.name_i18n.get(lang) or v.name_i18n.get("fa") or v.sku,
            "options": v.options,
            "final_usd_cents": cents,
            "price_toman": to_toman(cents, rate) if (cents is not None and rate) else None,
            "stock": v.stock,
            "is_active": v.is_active,
        })
    return {"items": items}


class PricePointOut(Schema):
    label: str
    t: int
    v: int


class PriceHistoryOut(Schema):
    items: list[PricePointOut]


@router.get("/products/{slug}/price-history", response=PriceHistoryOut, operation_id="catalog_price_history", summary="تاریخچهٔ قیمت محصول (نمودار PDP)")
def price_history(request, slug: str):
    product = visible_products().filter(slug=slug).first()
    if product is None:
        raise HttpError(404, "not_found")
    rate = _current_rate()
    # آخرین ۶۰ نقطه (نه قدیمی‌ترین‌ها) و سپس مرتب‌سازی صعودی برای رسم نمودار.
    rows = list(product.price_history.order_by("-recorded_at", "-id")[:60])
    items = []
    for row in reversed(rows):
        value = row.toman or (to_toman(row.usd_cents, rate) if rate else None)
        if value is None:
            continue
        items.append({"label": row.recorded_at.strftime("%Y-%m-%d"), "t": int(row.recorded_at.timestamp() * 1000), "v": value})
    return {"items": items}


class ReviewOut(Schema):
    id: int
    rating: int
    title: str
    body: str
    created_at: str
    author: str
    verified: bool


class ReviewList(Schema):
    items: list[ReviewOut]
    total: int
    average: float
    distribution: dict[str, int]


class ReviewIn(Schema):
    rating: int
    title: str = ""
    body: str


REVIEW_SORTS = {"newest": ("-created_at", "-id"), "oldest": ("created_at", "id"), "rating_desc": ("-rating", "-created_at")}


def _verified_user_ids(product: Product, user_ids: list[int]) -> set[int]:
    if not user_ids:
        return set()
    paid = (OrderStatus.PAID.value, OrderStatus.PROCESSING.value, OrderStatus.SHIPPED.value, OrderStatus.DELIVERED.value)
    return set(
        Order.objects.filter(
            user_id__in=user_ids,
            items__product=product,
            status__in=paid,
        ).values_list("user_id", flat=True)
    )


@router.get("/products/{slug}/reviews", response=ReviewList, operation_id="catalog_list_reviews")
def list_reviews(request, slug: str, limit: int = 10, offset: int = 0, sort: str = "newest"):
    product = visible_products().filter(slug=slug).first()
    if product is None:
        raise HttpError(404, "not_found")
    approved = product.reviews.filter(status=Review.Status.APPROVED)
    stats = approved.aggregate(avg=Avg("rating"), total=Count("id"))
    dist_rows = approved.values("rating").annotate(count=Count("id"))
    distribution = {str(i): 0 for i in range(1, 6)}
    for row in dist_rows:
        distribution[str(row["rating"])] = row["count"]
    rows = list(
        approved.select_related("user")
        .order_by(*REVIEW_SORTS.get(sort, REVIEW_SORTS["newest"]))
        .only("id", "rating", "title", "body", "created_at", "user__name")
        [max(offset, 0) : max(offset, 0) + min(max(limit, 1), 50)]
    )
    verified = _verified_user_ids(product, [r.user_id for r in rows])
    return {
        "items": [
            {
                "id": r.pk,
                "rating": r.rating,
                "title": r.title,
                "body": r.body,
                "created_at": r.created_at.isoformat(),
                "author": (r.user.name or "خریدار") if r.user_id else "خریدار",
                "verified": r.user_id in verified,
            }
            for r in rows
        ],
        "total": stats["total"] or 0,
        "average": round(stats["avg"] or 0.0, 2),
        "distribution": distribution,
    }


@router.post("/products/{slug}/reviews", response={200: ReviewOut, 201: ReviewOut}, auth=django_auth, operation_id="catalog_create_review")
def create_review(request, slug: str, body: ReviewIn):
    product = visible_products().filter(slug=slug).first()
    if product is None:
        raise HttpError(404, "not_found")
    if not 1 <= body.rating <= 5 or not body.body.strip():
        raise HttpError(422, "invalid_review")
    row, created = Review.objects.update_or_create(
        product=product, user=request.user,
        defaults={"rating": body.rating, "title": body.title.strip()[:160], "body": body.body.strip(), "status": Review.Status.PENDING},
    )
    verified = bool(_verified_user_ids(product, [request.user.pk]))
    payload = {
        "id": row.pk,
        "rating": row.rating,
        "title": row.title,
        "body": row.body,
        "created_at": row.created_at.isoformat(),
        "author": request.user.name or "خریدار",
        "verified": verified,
    }
    return (201 if created else 200), payload


class WishlistOut(Schema):
    items: list[ProductOut]
    count: int


class WishToggleOut(Schema):
    wished: bool
    count: int


@router.get("/wishlist", response=WishlistOut, auth=django_auth, operation_id="catalog_wishlist_list")
def wishlist_list(request, lang: str = "fa"):
    rate = _current_rate()
    rows = list(Wishlist.objects.filter(user=request.user).order_by("-created_at", "-id")[:200])
    ids = [r.product_id for r in rows]
    by_id = {p.pk: p for p in visible_products().filter(pk__in=ids)}
    items = [serialize(by_id[r.product_id], rate, lang) for r in rows if r.product_id in by_id]
    return {"items": items, "count": len(rows)}


@router.post("/wishlist/{slug}", response=WishToggleOut, auth=django_auth, operation_id="catalog_wishlist_add")
def wishlist_add(request, slug: str):
    product = visible_products().filter(slug=slug).first()
    if product is None:
        raise HttpError(404, "not_found")
    Wishlist.objects.get_or_create(user=request.user, product=product)
    return {"wished": True, "count": Wishlist.objects.filter(user=request.user).count()}


@router.delete("/wishlist/{slug}", response=WishToggleOut, auth=django_auth, operation_id="catalog_wishlist_remove")
def wishlist_remove(request, slug: str):
    Wishlist.objects.filter(user=request.user, product__slug=slug).delete()
    return {"wished": False, "count": Wishlist.objects.filter(user=request.user).count()}


class RelatedOut(Schema):
    items: list[ProductOut]


@router.get("/products/{slug}/related", response=RelatedOut, operation_id="catalog_related", summary="کالاهای مشابه (همان دسته و بازهٔ قیمت)")
def related(request, slug: str, lang: str = "fa", limit: int = 4):
    product = visible_products().filter(slug=slug).first()
    if product is None:
        raise HttpError(404, "not_found")
    final = product.final_usd_cents
    if final is None:
        return {"items": []}
    lo, hi = int(final * 0.7), int(final * 1.3)
    blank = ProductFilters()
    qs = (
        prepare_query(visible_products(), blank)
        .filter(category_id=product.category_id, final_price_cents__gte=lo, final_price_cents__lte=hi)
        .exclude(pk=product.pk)
        .order_by("-created_at")[: min(max(limit, 1), 8)]
    )
    rate = _current_rate()
    return {"items": [serialize(p, rate, lang) for p in qs]}


class SuggestItem(Schema):
    slug: str
    name: str
    brand: str
    price_toman: int | None


class SuggestOut(Schema):
    items: list[SuggestItem]


@router.get("/suggest", response=SuggestOut, operation_id="catalog_suggest", summary="پیشنهاد جست‌وجو (۸ مورد، کش ۶۰ ثانیه)")
def suggest(request, q: str = "", limit: int = 8):
    term = normalize_fa(q).strip()
    if len(term) < 2:
        return {"items": []}
    key = f"catalog:suggest:v2:{term}:{limit}:{_current_rate()}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    rate = _current_rate()
    rows = visible_products().filter(Q(name__icontains=term) | Q(brand__icontains=term)).order_by("-created_at")[: min(max(limit, 1), 10)]
    items = [
        {"slug": p.slug, "name": p.name, "brand": p.brand, "price_toman": to_toman(p.final_usd_cents, rate) if rate else None}
        for p in rows
    ]
    data = {"items": items}
    cache.set(key, data, 60)
    return data
