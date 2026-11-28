"""تستهای دیتابیسی قابلیتهای نقشهٔ راه: کوپن، نظرات، علاقهمندی، فاست، متریک و دفتر موجودی."""
from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.test import Client
from django.test.utils import override_settings
from django.utils import timezone

from apps.catalog.models import PriceHistory, Review
from apps.core import metrics
from apps.orders.models import Order
from apps.orders.services import cancel_order, place_order
from apps.pricing.models import Coupon, CouponUse
from tests.factories import ProductFactory, UserFactory
from tests.helpers import ADDRESS, API, idem, jpost

pytestmark = pytest.mark.django_db


def new_client():
    c = Client()
    c.force_login(UserFactory())
    return c


def add(c, slug, qty=1):
    r = jpost(c, f"/cart/items/{slug}", {"qty": qty}, method="put")
    assert r.status_code == 200, r.content


def submit_order(c, coupon=None, key=None):
    body = {"address": ADDRESS, "shipping_code": ""}
    if coupon:
        body["coupon_code"] = coupon
    return jpost(c, "/orders", body, **idem(key))


# ---------- کوپن ----------

def test_coupon_percent_is_server_calculated_and_replay_is_idempotent(rate):
    p = ProductFactory(price_usd_cents=20000)  # ۲۰۰ دلار = ۲۰۰٬۰۰۰٬۰۰۰ تومان
    Coupon.objects.create(code="SAVE10", kind=Coupon.Kind.PERCENT, value=10, max_uses=5, max_uses_per_user=2, description="۱۰٪ تخفیف")
    c = new_client()
    add(c, p.slug)
    key = str(uuid.uuid4())
    r = submit_order(c, "save10", key)
    assert r.status_code == 201, r.content
    o = r.json()
    assert o["discount_toman"] == 20_000_000
    assert o["subtotal_toman"] == 200_000_000 and o["total_toman"] == 180_000_000  # VAT صفر در تست
    assert o["coupon_code"] == "SAVE10"
    assert CouponUse.objects.count() == 1 and Coupon.objects.get().used_count == 1
    replay = submit_order(c, "SAVE10", key)
    assert replay.status_code == 201 and replay.json()["number"] == o["number"]
    assert CouponUse.objects.count() == 1  # مصرف دوباره نشد


def test_coupon_replay_is_case_insensitive(rate):
    """رگرسیون P0-5: retry با حروف کوچک/بزرگ متفاوت نباید ۴۰۹ دهد."""
    p = ProductFactory(price_usd_cents=20000)
    Coupon.objects.create(code="SAVE10", kind=Coupon.Kind.PERCENT, value=10, max_uses=5)
    c = new_client()
    add(c, p.slug)
    k = str(uuid.uuid4())
    first = submit_order(c, "SAVE10", k)
    assert first.status_code == 201, first.content
    replay = submit_order(c, "save10", k)
    assert replay.status_code == 201, replay.content
    assert replay.json()["number"] == first.json()["number"]


def test_coupon_user_limit_is_enforced_on_second_order(rate):
    p = ProductFactory(price_usd_cents=20000, stock=5)
    Coupon.objects.create(code="ONCE", value=50, max_uses=10, max_uses_per_user=1)
    c = new_client()
    add(c, p.slug)
    assert submit_order(c, "ONCE").status_code == 201
    add(c, p.slug)
    r = submit_order(c, "ONCE")
    assert r.status_code == 422 and r.json()["code"] == "invalid_coupon"
    assert "استفاده کرده" in r.json()["message"]


def test_coupon_expiry_min_subtotal_and_coupon_cap(rate):
    p = ProductFactory(price_usd_cents=1000)  # ۱۰٬۰۰۰٬۰۰۰ تومان
    now = timezone.now()
    Coupon.objects.create(code="OLD", value=10, valid_until=now - timedelta(minutes=1), max_uses=5)
    Coupon.objects.create(code="BIG", value=10, min_subtotal_toman=50_000_000, max_uses=5)
    Coupon.objects.create(code="CAPPED", value=50, max_discount_toman=1_000_000, max_uses=5)
    c = new_client()
    add(c, p.slug)
    assert submit_order(c, "OLD").json()["code"] == "invalid_coupon"
    add(c, p.slug)
    assert submit_order(c, "BIG").json()["code"] == "invalid_coupon"
    add(c, p.slug)
    assert submit_order(c, "CAPPED").json()["discount_toman"] == 1_000_000


def test_coupon_preview_endpoint_reports_persian_message(rate):
    Coupon.objects.create(code="EXPIRED", value=10, valid_until=timezone.now() - timedelta(seconds=1), max_uses=5)
    c = new_client()
    r = c.get(f"{API}/pricing/coupons/validate?code=expired&subtotal_toman=1000")
    body = r.json()
    assert r.status_code == 409 and "تمام" in (body.get("code") or body.get("message") or body.get("detail") or "")


# ---------- نظرات و علاقهمندی ----------

def test_review_stats_verified_badge_and_upsert(rate):
    p = ProductFactory(slug="phone-x", price_usd_cents=20000, stock=9)
    u1, u2 = UserFactory(), UserFactory()
    place_order(u1, [(p.pk, 1)], str(uuid.uuid4()))  # خریدار تأییدشده (status=pending نیست؛ وضعیت را تغییر میدهیم)
    order = Order.objects.get(user=u1)
    order.status = "paid"
    order.save(update_fields=["status"])
    Review.objects.create(product=p, user=u1, rating=5, body="عالی", status=Review.Status.APPROVED)
    Review.objects.create(product=p, user=u2, rating=1, body="بد", status=Review.Status.APPROVED)
    c = Client()
    r = c.get(f"{API}/catalog/products/{p.slug}/reviews")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2 and body["average"] == 3.0
    assert body["distribution"] == {"1": 1, "2": 0, "3": 0, "4": 0, "5": 1}
    verified = [i for i in body["items"] if i["verified"]]
    assert len(verified) == 1 and verified[0]["author"] in {u1.name, "خریدار"}
    u3 = UserFactory()  # کاربر بدون نظر: اولین ثبت 201 و دومین 200 است
    c.force_login(u3)
    first = jpost(c, f"/catalog/products/{p.slug}/reviews", {"rating": 4, "title": "خوب", "body": "نظر من"})
    second = jpost(c, f"/catalog/products/{p.slug}/reviews", {"rating": 3, "title": "متوسط", "body": "نظر دوم"})
    assert first.status_code == 201 and second.status_code == 200
    assert Review.objects.filter(product=p, user=u3).count() == 1
    assert c.get(f"{API}/catalog/products/{p.slug}/reviews").json()["total"] == 2  # نظر در انتظار تأیید است


def test_wishlist_add_list_remove(rate):
    ProductFactory(slug="wish-1")
    c = new_client()
    assert jpost(c, "/catalog/wishlist/wish-1").json() == {"wished": True, "count": 1}
    body = c.get(f"{API}/catalog/wishlist").json()
    assert body["count"] == 1 and body["items"][0]["slug"] == "wish-1"
    r = c.delete(f"{API}/catalog/wishlist/wish-1")
    assert r.json() == {"wished": False, "count": 0}


# ---------- فاستها، پیشنهاد، مشابه ----------

def test_facets_counts_and_suggest(rate):
    ProductFactory(slug="alpha", name="Alpha Phone", brand="Apple", price_usd_cents=10000)
    ProductFactory(slug="beta", brand="Apple", price_usd_cents=20000)
    ProductFactory(slug="gamma", brand="Samsung", price_usd_cents=60000)
    c = Client()
    f = c.get(f"{API}/catalog/facets").json()
    assert f["total"] == 3
    assert {b["value"]: b["count"] for b in f["brands"]} == {"Apple": 2, "Samsung": 1}
    assert f["in_stock"] == 3 and f["on_sale"] == 0
    assert sum(b["count"] for b in f["price"]["buckets"]) == 3
    s = c.get(f"{API}/catalog/suggest?q=alph").json()
    assert [i["slug"] for i in s["items"]] == ["alpha"]


def test_facets_cache_key_includes_every_filter(rate):
    """رگرسیون P0-4: ram_gte/storage_gte/spec/in_stock/on_sale نباید همان کلید کش فاستها را بگیرند."""
    cache.clear()
    ProductFactory(slug="facet-a", brand="BrandA", price_usd_cents=10000, ram_gb=8, storage_gb=128, stock=3, discount_percent=0)
    ProductFactory(slug="facet-b", brand="BrandB", price_usd_cents=20000, ram_gb=16, storage_gb=256, stock=0, discount_percent=10)
    c = Client()

    def total(**params):
        return c.get(f"{API}/catalog/facets", params).json()["total"]

    assert total() == 2
    assert total(ram_gte=16) == 1
    assert total(storage_gte=256) == 1
    assert total(spec="ram:gte:16") == 1
    assert total(in_stock="true") == 1
    assert total(on_sale="true") == 1


def test_related_products_same_category_and_price_band(rate):
    a = ProductFactory(slug="rel-a", price_usd_cents=20000)
    ProductFactory(slug="rel-b", price_usd_cents=22000, category=a.category)
    ProductFactory(slug="rel-c", price_usd_cents=200000, category=a.category)
    r = Client().get(f"{API}/catalog/products/rel-a/related?limit=4")
    assert r.status_code == 200
    assert [i["slug"] for i in r.json()["items"]] == ["rel-b"]


def test_price_history_returns_latest_60_ascending(rate):
    p = ProductFactory(slug="hist", price_usd_cents=10000)
    base = timezone.now() - timedelta(days=100)
    for i in range(70):
        PriceHistory.objects.create(product=p, usd_cents=10000 + i, toman=1_000_000 + i, recorded_at=base + timedelta(days=i))
    r = Client().get(f"{API}/catalog/products/hist/price-history")
    items = r.json()["items"]
    assert len(items) == 60
    assert items[0]["v"] == 1_000_000 + 10 and items[-1]["v"] == 1_000_000 + 69
    assert [i["t"] for i in items] == sorted(i["t"] for i in items)


# ---------- متریک و موجودی ----------

@override_settings(METRICS_TOKEN="test-metrics-token")
def test_metrics_endpoint_is_protected_and_emits_red_metrics():
    metrics.reset()
    c = Client()
    assert c.get(f"{API}/metrics").status_code == 403
    c.get(f"{API}/catalog/categories")  # مسیر غیر health تا شمارندهٔ RED ثبت شود
    r = c.get(f"{API}/metrics", HTTP_AUTHORIZATION="Bearer test-metrics-token")
    assert r.status_code == 200 and r["Content-Type"].startswith("text/plain")
    assert c.get(f"{API}/metrics?token=test-metrics-token").status_code == 200
    assert c.get(f"{API}/metrics?token=test-metrics-tokeN").status_code == 403
    text = r.content.decode()
    assert "# TYPE digital_shopping_http_requests_total counter" in text
    assert "digital_shopping_process_start_time_seconds" in text
    assert "# TYPE digital_shopping_http_request_duration_seconds histogram" in text


def test_stock_ledger_records_order_and_cancel(rate):
    p = ProductFactory(price_usd_cents=1000, stock=3)
    u = UserFactory()
    order = place_order(u, [(p.pk, 2)], str(uuid.uuid4()))
    p.refresh_from_db()
    assert p.stock == 1
    assert list(p.stock_movements.values_list("reason", "delta")) == [("order", -2)]
    cancel_order(u, order.number)
    p.refresh_from_db()
    assert p.stock == 3
    assert sorted(p.stock_movements.values_list("reason", "delta")) == [("cancel", 2), ("order", -2)]
