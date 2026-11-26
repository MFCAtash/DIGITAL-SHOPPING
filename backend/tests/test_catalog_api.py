import pytest
from django.test import Client

from apps.catalog.models import Product
from tests.factories import ProductFactory

pytestmark = pytest.mark.django_db
URL = "/api/v1/catalog/products"


def test_health():
    r = Client().get("/api/v1/health")
    assert r.status_code == 200 and r.json()["database"] == "up"


def test_list_shows_toman_and_hides_unpublishable(rate):
    ProductFactory(slug="visible", price_usd_cents=10000)
    ProductFactory(slug="hidden", status=Product.Status.HIDDEN)
    ProductFactory(slug="draft", status=Product.Status.DRAFT)
    ProductFactory(slug="no-image", with_image=False)
    data = Client().get(URL).json()
    assert [i["slug"] for i in data["items"]] == ["visible"] and data["count"] == 1
    assert data["items"][0]["price_toman"] == 100_000_000  # ۱۰۰ دلار × ۱٬۰۰۰٬۰۰۰


def test_hidden_brand_is_never_exposed_by_public_api(rate, settings):
    """رگرسیون: سیاست HIDDEN_BRANDS باید در خروجی API اعمال شود، نه فقط هنگام ایمپورت."""
    settings.HIDDEN_BRANDS = ["Starlink"]
    ProductFactory(slug="visible-phone", brand="Xiaomi", price_usd_cents=10000)
    ProductFactory(slug="hidden-satellite", brand="starlink", price_usd_cents=10000)
    c = Client()
    data = c.get(URL).json()
    assert [i["slug"] for i in data["items"]] == ["visible-phone"]
    assert c.get(f"{URL}/hidden-satellite").status_code == 404


def test_filters_sort_and_search(rate):
    ProductFactory(slug="a", name="Alpha Phone", brand="Xiaomi", ram_gb=8, storage_gb=128, price_usd_cents=30000)
    ProductFactory(slug="b", name="Beta Laptop", brand="ASUS", ram_gb=16, storage_gb=1000, price_usd_cents=90000)
    c = Client()
    assert [i["slug"] for i in c.get(URL, {"ram_gte": 16}).json()["items"]] == ["b"]
    assert [i["slug"] for i in c.get(URL, {"brand": "xiaomi"}).json()["items"]] == ["a"]
    assert [i["slug"] for i in c.get(URL, {"max_usd": 400}).json()["items"]] == ["a"]
    assert [i["slug"] for i in c.get(URL, {"sort": "price_desc"}).json()["items"]] == ["b", "a"]
    assert [i["slug"] for i in c.get(URL, {"q": "ALPHA"}).json()["items"]] == ["a"]
    assert c.get(URL, {"limit": 1000}).status_code == 200


def test_detail_and_404(rate):
    ProductFactory(slug="x")
    c = Client()
    assert c.get(f"{URL}/x").status_code == 200
    assert c.get(f"{URL}/missing").status_code == 404


def test_without_rate_toman_is_null():
    ProductFactory(slug="x")
    assert Client().get(URL).json()["items"][0]["price_toman"] is None
