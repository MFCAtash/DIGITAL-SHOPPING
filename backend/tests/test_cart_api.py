"""سبد: مهمان/کاربر، سقف، هشدار تغییر قیمت، ادغام، پاک‌سازی (نیاز به Postgres)."""
from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.cart import services as svc
from apps.cart.models import Cart, CartItem
from tests.factories import ProductFactory, UserFactory
from tests.helpers import API, jpost

pytestmark = pytest.mark.django_db


def put(c, slug, qty):
    return jpost(c, f"/cart/items/{slug}", {"qty": qty}, method="put")


def test_empty_guest_cart_needs_rate_and_is_empty(rate):
    r = Client().get(f"{API}/cart")
    assert r.status_code == 200 and r.json() == {"lines": [], "count": 0, "subtotal_toman": 0, "notices": []}


def test_cart_without_exchange_rate_is_503():
    r = Client().get(f"{API}/cart")
    assert r.status_code == 503 and r.json()["code"] == "rate_unavailable"


def test_guest_add_sets_signed_httponly_cookie_and_live_price(rate):
    p = ProductFactory(price_usd_cents=20000, discount_percent=0)
    c = Client()
    r = put(c, p.slug, 2)
    assert r.status_code == 200
    ck = r.cookies["cx_cart"]
    assert ck["httponly"] and ck["samesite"] == "Lax"
    line = r.json()["lines"][0]
    assert line["qty"] == 2 and line["unit_toman"] == 200_000_000 and r.json()["subtotal_toman"] == 400_000_000
    assert c.get(f"{API}/cart").json()["count"] == 2  # کوکی همان سبد را برمی‌گرداند


def test_forged_cookie_is_ignored(rate):
    p = ProductFactory()
    c = Client()
    put(c, p.slug, 1)
    c.cookies["cx_cart"] = "forged-value"
    assert c.get(f"{API}/cart").json()["lines"] == []


def test_price_is_never_stored_and_follows_database(rate):
    p = ProductFactory(price_usd_cents=20000)
    c = Client()
    put(c, p.slug, 1)
    p.price_usd_cents = 10000
    p.save()
    line = c.get(f"{API}/cart").json()["lines"][0]
    assert line["unit_toman"] == 100_000_000
    assert [w["code"] for w in line["warnings"]] == ["price_changed"]  # هشدار نسبت به آخرین قیمت دیده‌شده


def test_ack_clears_price_warning(rate):
    u = UserFactory()
    c = Client()
    c.force_login(u)
    p = ProductFactory(price_usd_cents=20000)
    put(c, p.slug, 1)
    p.price_usd_cents = 15000
    p.save()
    assert c.get(f"{API}/cart").json()["lines"][0]["warnings"]
    assert jpost(c, "/cart/ack").json()["lines"][0]["warnings"] == []


def test_high_value_cap_clamps_and_notices(rate):
    p = ProductFactory(price_usd_cents=129_900, stock=50)  # گران‌قیمت ⇒ سقف ۲
    r = put(Client(), p.slug, 5)
    j = r.json()
    assert j["lines"][0]["qty"] == 2 and j["lines"][0]["max_qty"] == 2
    assert j["notices"] == [{"code": "qty_capped", "slug": p.slug}]
    cheap = ProductFactory(price_usd_cents=1000, stock=50)
    assert put(Client(), cheap.slug, 99).json()["lines"][0]["qty"] == 10


def test_non_purchasable_can_be_added_but_unknown_rejected(rate):
    approx = ProductFactory(purchasable=False)
    r = put(Client(), approx.slug, 1)
    assert r.status_code == 200 and r.json()["lines"][0]["slug"] == approx.slug
    assert all("unavailable" not in w["code"] for w in r.json()["lines"][0]["warnings"])
    assert put(Client(), "nope", 1).status_code == 409


def test_stock_warning_and_zero_removes(rate):
    p = ProductFactory(stock=1)
    c = Client()
    j = put(c, p.slug, 3).json()
    assert [w["code"] for w in j["lines"][0]["warnings"]] == ["stock_low"]
    assert put(c, p.slug, 0).json()["lines"] == []
    assert CartItem.objects.count() == 0


def test_qty_validation(rate):
    p = ProductFactory()
    assert put(Client(), p.slug, -1).status_code == 422
    assert put(Client(), p.slug, 100).status_code == 422


def test_delete_item_and_clear(rate):
    a, b = ProductFactory(), ProductFactory()
    c = Client()
    put(c, a.slug, 1)
    put(c, b.slug, 1)
    assert [l["slug"] for l in c.delete(f"{API}/cart/items/{a.slug}").json()["lines"]] == [b.slug]
    assert c.delete(f"{API}/cart").json()["lines"] == []


def test_merge_after_login_sums_with_cap_and_deletes_guest_cart(rate):
    cheap, pricey = ProductFactory(price_usd_cents=1000, stock=50), ProductFactory(price_usd_cents=129_900, stock=50)
    u = UserFactory()
    uc = Client()
    uc.force_login(u)
    put(uc, cheap.slug, 3)
    put(uc, pricey.slug, 1)
    guest = Client()
    put(guest, cheap.slug, 4)
    put(guest, pricey.slug, 2)
    guest.force_login(u)  # ورود با همان کوکی مهمان
    r = jpost(guest, "/cart/merge")
    by = {l["slug"]: l["qty"] for l in r.json()["lines"]}
    assert by == {cheap.slug: 7, pricey.slug: 2}  # ۳+۴ و min(۱+۲, سقف ۲)
    assert Cart.objects.filter(guest_key__isnull=False).count() == 0
    assert r.cookies["cx_cart"].value == ""  # کوکی پاک شد


def test_merge_requires_login_and_without_guest_cart_is_noop(rate):
    assert jpost(Client(), "/cart/merge").status_code == 401
    c = Client()
    c.force_login(UserFactory())
    assert jpost(c, "/cart/merge").json()["lines"] == []


def test_carts_are_isolated_between_users(rate):
    p = ProductFactory()
    a, b = Client(), Client()
    a.force_login(UserFactory())
    b.force_login(UserFactory())
    put(a, p.slug, 2)
    assert b.get(f"{API}/cart").json()["lines"] == []


def test_cleanup_deletes_only_stale_carts(rate):
    p = ProductFactory()
    old, fresh = Cart.objects.create(guest_key="old"), Cart.objects.create(guest_key="fresh")
    CartItem.objects.create(cart=old, product=p, qty=1)
    Cart.objects.filter(pk=old.pk).update(updated_at=timezone.now() - timedelta(days=31))
    assert svc.cleanup_old_carts() == 1
    assert list(Cart.objects.values_list("pk", flat=True)) == [fresh.pk]
