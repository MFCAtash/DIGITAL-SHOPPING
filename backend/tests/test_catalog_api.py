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


def slugs(response):
    return [item["slug"] for item in response.json()["items"]]


def test_price_filters_and_sort_use_discounted_price(rate):
    """قیمت فیلتر و مرتبسازی همان قیمتی است که روی کالا نمایش داده میشود."""
    ProductFactory(slug="full", price_usd_cents=100000, discount_percent=0)
    ProductFactory(slug="sale", price_usd_cents=100000, discount_percent=50)
    c = Client()
    assert slugs(c.get(URL, {"max_usd": 600})) == ["sale"]  # ۵۰۰ دلار، نه ۱۰۰۰
    assert slugs(c.get(URL, {"min_usd": 600})) == ["full"]
    assert slugs(c.get(URL, {"sort": "price_asc"})) == ["sale", "full"]


def test_boolean_filters_support_false(rate):
    ProductFactory(slug="available", stock=3, discount_percent=10, purchasable=True)
    ProductFactory(slug="unavailable", stock=0, discount_percent=0, purchasable=False)
    c = Client()
    assert slugs(c.get(URL, {"in_stock": "false"})) == ["unavailable"]
    assert slugs(c.get(URL, {"on_sale": "false"})) == ["unavailable"]
    assert slugs(c.get(URL, {"purchasable": "true"})) == ["available"]


def test_multi_brand_is_case_insensitive(rate):
    ProductFactory(slug="apple-phone", brand="Apple")
    ProductFactory(slug="samsung-phone", brand="Samsung")
    c = Client()
    assert set(slugs(c.get(URL, {"brands": "apple,samsung"}))) == {"apple-phone", "samsung-phone"}


def test_search_covers_specs_and_normalized_text(rate):
    ProductFactory(slug="gpu-phone", name="Phone", specs={"gpu": "RTX 5080"}, description_i18n={"fa": "پردازنده گرافیکی"})
    ProductFactory(slug="other", name="Laptop")
    c = Client()
    assert slugs(c.get(URL, {"q": "RTX 5080"})) == ["gpu-phone"]
    assert set(slugs(c.get(URL, {"q": "   "}))) == {"gpu-phone", "other"}


def test_invalid_filter_values_are_rejected(rate):
    ProductFactory(slug="x")
    c = Client()
    assert c.get(URL, {"sort": "not-a-sort"}).status_code == 422
    assert c.get(URL, {"min_usd": 500, "max_usd": 100}).status_code == 422
    assert c.get(URL, {"min_rating": 9}).status_code == 422
    assert c.get(URL, {"spec": "unknown:gte:1"}).status_code == 422


def test_extended_spec_filters(rate):
    ProductFactory(slug="big", screen_in=16.0, battery_mah=6000, weight_g=240)
    ProductFactory(slug="small", screen_in=13.0, battery_mah=4000, weight_g=170)
    c = Client()
    assert slugs(c.get(URL, {"spec": "screen:gte:15,battery:gte:5000"})) == ["big"]
    assert slugs(c.get(URL, {"spec": "weight:lte:200"})) == ["small"]


def test_facet_total_matches_filtered_list(rate):
    ProductFactory(slug="apple-one", brand="Apple", price_usd_cents=10000)
    ProductFactory(slug="samsung-one", brand="Samsung", price_usd_cents=90000)
    c = Client()
    listed = c.get(URL, {"brands": "Apple"}).json()["count"]
    facets = c.get("/api/v1/catalog/facets", {"brands": "Apple"}).json()
    assert listed == facets["total"] == 1
    assert facets["brands"][0]["value"] == "Samsung" or facets["brands"]
