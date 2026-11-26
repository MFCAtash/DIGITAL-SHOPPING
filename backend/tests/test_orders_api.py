"""API سفارش: ایجاد از سبد، idempotency، خطاها، مالیات/ارسال، مالکیت، cursor، لغو (نیاز به Postgres)."""
import uuid

import pytest
from django.test import Client
from django.test.utils import override_settings

from apps.accounts.models import Address
from apps.cart.models import Cart
from apps.catalog.models import Product
from apps.orders.models import Order, ShippingMethod
from tests.factories import ProductFactory, UserFactory
from tests.helpers import ADDRESS, API, idem, jpost

pytestmark = pytest.mark.django_db


@pytest.fixture
def shop(rate):
    ShippingMethod.objects.create(code="post", name="پست", base_toman=80_000, free_over_toman=500_000_000, eta="۳ تا ۵ روز")
    ShippingMethod.objects.create(code="courier", name="پیک", base_toman=60_000, provinces=["تهران"], sort=1)
    user = UserFactory()
    c = Client()
    c.force_login(user)
    addr = Address.objects.create(user=user, receiver_name="علی رضایی", receiver_phone="09123456789", province="تهران", city="تهران", postal_code="1234567890", street="خیابان ولیعصر", is_default=True)
    return user, c, addr


def add(c, p, qty=1):
    return jpost(c, f"/cart/items/{p.slug}", {"qty": qty}, method="put")


def order(c, addr, shipping="post", key=None, **extra):
    return jpost(c, "/orders", {"address_id": addr.pk, "shipping_code": shipping}, **idem(key), **extra)


def test_create_from_cart_clears_cart_and_returns_public_number(shop):
    user, c, addr = shop
    p = ProductFactory(price_usd_cents=20000, stock=5)
    add(c, p, 2)
    r = order(c, addr)
    assert r.status_code == 201
    o = r.json()
    assert o["number"].startswith("CS-") and len(o["number"]) == 11 and o["status"] == "pending"
    # جمع کالاها ۴۰۰٬۰۰۰٬۰۰۰ < آستانهٔ ارسال رایگان (۵۰۰٬۰۰۰٬۰۰۰) ⇒ کرایهٔ پایهٔ ۸۰٬۰۰۰؛ VAT در تست صفر است.
    assert o["subtotal_toman"] == 400_000_000 and o["shipping_toman"] == 80_000 and o["total_toman"] == 400_080_000
    assert o["items"][0]["qty"] == 2 and o["address"]["province"] == "تهران"
    assert Cart.objects.get(user=user).items.count() == 0
    p.refresh_from_db()
    assert p.stock == 3


@override_settings(VAT_PERCENT=10)
def test_totals_have_separate_shipping_and_vat_lines(shop):
    _, c, addr = shop
    p = ProductFactory(price_usd_cents=1000, stock=5)  # ۱۰ دلار ⇒ ۱۰٬۰۰۰٬۰۰۰ تومان
    add(c, p, 1)
    o = order(c, addr).json()
    assert (o["subtotal_toman"], o["shipping_toman"], o["tax_toman"], o["total_toman"]) == (10_000_000, 80_000, 1_008_000, 11_088_000)


def test_free_shipping_over_threshold_and_province_restriction(shop):
    user, c, addr = shop
    p = ProductFactory(price_usd_cents=60_000, stock=5)  # ۶۰۰٬۰۰۰٬۰۰۰ ≥ آستانه
    add(c, p, 1)
    assert order(c, addr, "post").json()["shipping_toman"] == 0
    other = Address.objects.create(user=user, receiver_name="x y z", receiver_phone="09120000000", province="فارس", city="شیراز", postal_code="1234567890", street="abcdefg")
    add(c, p, 1)
    r = order(c, other, "courier")  # پیک فقط تهران
    assert r.status_code == 422 and r.json()["code"] == "shipping_unavailable"
    assert Product.objects.get(pk=p.pk).stock == 4  # شکست، موجودی را برنگردانده نگذاشت (رول‌بک)


def test_idempotency_same_key_same_order_and_no_double_stock(shop):
    _, c, addr = shop
    p = ProductFactory(stock=5)
    add(c, p, 1)
    key = str(uuid.uuid4())
    a = order(c, addr, key=key).json()
    add(c, p, 1)  # سبد دوباره پر شد (کاربر دوباره کلیک کرد)
    b = order(c, addr, key=key)
    assert b.status_code in (201, 409)  # محتوای سبد فرق کرد یا همان؛ هرگز سفارش دوم
    assert Order.objects.count() == 1
    assert Product.objects.get(pk=p.pk).stock == 4
    assert a["number"] == Order.objects.get().number


def test_double_submit_after_cart_consumed_returns_same_order_not_cart_empty(shop):
    """دوبار کلیک/تکرار شبکه: درخواست دوم وقتی می‌رسد که سبد مصرف شده؛ باید همان سفارش برگردد نه «سبد خالی»."""
    _, c, addr = shop
    p = ProductFactory(stock=5)
    add(c, p, 1)
    key = str(uuid.uuid4())
    first = order(c, addr, key=key)
    second = order(c, addr, key=key)
    assert first.status_code == second.status_code == 201
    assert first.json()["number"] == second.json()["number"]
    assert Order.objects.count() == 1 and Product.objects.get(pk=p.pk).stock == 4


def test_same_key_with_different_shipping_or_address_is_conflict(shop):
    _, c, addr = shop
    p = ProductFactory(stock=5)
    add(c, p, 1)
    key = str(uuid.uuid4())
    assert order(c, addr, "post", key=key).status_code == 201
    r = order(c, addr, "courier", key=key)
    assert r.status_code == 409 and r.json()["code"] == "idempotency_conflict"


def test_missing_or_invalid_idempotency_key(shop):
    _, c, addr = shop
    p = ProductFactory()
    add(c, p)
    r = jpost(c, "/orders", {"address_id": addr.pk, "shipping_code": "post"})
    assert r.status_code == 422 and r.json()["code"] == "invalid_idempotency_key"
    assert order(c, addr, key="not-a-uuid").json()["code"] == "invalid_idempotency_key"
    assert Order.objects.count() == 0


def test_error_mapping(shop):
    user, c, addr = shop
    assert order(c, addr).json()["code"] == "cart_empty"  # سبد خالی
    p = ProductFactory(stock=1)
    add(c, p, 1)
    Product.objects.filter(pk=p.pk).update(stock=0)
    r = order(c, addr)
    assert r.status_code == 409 and r.json()["code"] == "out_of_stock" and r.json()["slug"] == p.slug
    Product.objects.filter(pk=p.pk).update(stock=3, purchasable=False)
    r = order(c, addr)
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert jpost(c, "/orders", {"address_id": 999999, "shipping_code": "post"}, **idem()).json()["code"] == "invalid_address"
    assert jpost(c, "/orders", {"shipping_code": "post"}, **idem()).json()["code"] == "invalid_address"
    add(c, p, 1)  # سبد مصرفشده در سفارش موفق قبلی را دوباره پر میکنیم
    assert order(c, addr, "nope").json()["code"] == "shipping_unavailable"


def test_inline_address_is_validated_like_frontend(shop):
    _, c, _ = shop
    p = ProductFactory()
    add(c, p)
    bad = jpost(c, "/orders", {"address": {**ADDRESS, "postal_code": "1"}, "shipping_code": "post"}, **idem())
    assert bad.status_code == 422 and bad.json()["code"] == "invalid_address" and "postalCode" in bad.json()["fields"]
    ok = jpost(c, "/orders", {"address": ADDRESS, "shipping_code": "post"}, **idem())
    assert ok.status_code == 201 and ok.json()["address"]["postalCode"] == "1234567890"


def test_requires_login(shop):
    assert Client().get(f"{API}/orders").status_code == 401
    assert jpost(Client(), "/orders", {"address_id": 1, "shipping_code": "post"}, **idem()).status_code == 401


def test_orders_are_private_per_user(shop):
    _, c, addr = shop
    p = ProductFactory(stock=9)
    add(c, p)
    num = order(c, addr).json()["number"]
    other = Client()
    other.force_login(UserFactory())
    assert other.get(f"{API}/orders/{num}").status_code == 404
    assert jpost(other, f"/orders/{num}/cancel").status_code == 404
    assert other.get(f"{API}/orders").json()["items"] == []
    assert c.get(f"{API}/orders/CS-AAAAAAAA").status_code == 404 and c.get(f"{API}/orders/12").status_code == 404


def test_same_idempotency_key_for_two_users_never_leaks(shop):
    _, c, addr = shop
    p = ProductFactory(stock=9)
    key = str(uuid.uuid4())
    add(c, p)
    a = order(c, addr, key=key).json()
    u2 = UserFactory()
    c2 = Client()
    c2.force_login(u2)
    addr2 = Address.objects.create(user=u2, receiver_name="x y z", receiver_phone="09120000000", province="تهران", city="تهران", postal_code="1234567890", street="abcdefg")
    add(c2, p)
    b = order(c2, addr2, key=key).json()
    assert a["number"] != b["number"] and Order.objects.count() == 2


def test_list_pagination_cursor(shop):
    _, c, addr = shop
    p = ProductFactory(stock=50)
    nums = []
    for _ in range(5):
        add(c, p)
        nums.append(order(c, addr).json()["number"])
    page1 = c.get(f"{API}/orders?limit=2").json()
    assert len(page1["items"]) == 2 and page1["next_cursor"]
    page2 = c.get(f"{API}/orders?limit=2&cursor={page1['next_cursor']}").json()
    page3 = c.get(f"{API}/orders?limit=2&cursor={page2['next_cursor']}").json()
    seen = [o["number"] for pg in (page1, page2, page3) for o in pg["items"]]
    assert seen == list(reversed(nums)) and page3["next_cursor"] is None  # جدیدترین اول، بدون تکرار/جاافتادگی
    assert c.get(f"{API}/orders?cursor=garbage").json()["code"] == "invalid_cursor"


def test_cancel_pending_restocks_and_paid_cannot_be_cancelled(shop):
    _, c, addr = shop
    p = ProductFactory(stock=5)
    add(c, p, 2)
    num = order(c, addr).json()["number"]
    r = jpost(c, f"/orders/{num}/cancel")
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    assert Product.objects.get(pk=p.pk).stock == 5
    assert jpost(c, f"/orders/{num}/cancel").json()["code"] == "invalid_status"


def test_shipping_methods_endpoint_public(shop):
    r = Client().get(f"{API}/shipping/methods?province=فارس&subtotal_toman=1000")
    by = {m["code"]: m["cost_toman"] for m in r.json()}
    assert by == {"post": 80_000, "courier": None}
    free = {m["code"]: m["cost_toman"] for m in Client().get(f"{API}/shipping/methods?province=تهران&subtotal_toman=600000000").json()}
    assert free == {"post": 0, "courier": 60_000}
