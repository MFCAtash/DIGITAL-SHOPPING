"""مرحلهٔ ۱.۷: قیمت قدیمی، نرخ ارز واقعی، مجوز عکس."""
import json
from datetime import timedelta
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client
from django.test.utils import override_settings
from django.utils import timezone

from apps.catalog.models import Product, ProductImage
from apps.core.models import AuditLog
from apps.pricing.models import ExchangeRate
from tests.factories import ProductFactory, UserFactory

pytestmark = pytest.mark.django_db
OVERLAY = Path(__file__).resolve().parents[2] / "overlay"
needs_catalog = pytest.mark.skipif(not (OVERLAY / "data" / "real-catalog.json").exists(), reason="catalog not found")


# ---------- قیمت قدیمی ----------


def test_stale_queryset_boundaries_and_unpriced():
    today = timezone.localdate()
    fresh = ProductFactory(price_checked_on=today)
    edge = ProductFactory(price_checked_on=today - timedelta(days=7))      # دقیقاً ۷ روز ⇒ هنوز تازه
    old = ProductFactory(price_checked_on=today - timedelta(days=8))
    never = ProductFactory(price_checked_on=None)
    unpriced = ProductFactory(price_usd_cents=None, price_checked_on=None)  # قیمت ندارد ⇒ در گزارش قیمت قدیمی نیست
    stale = set(Product.objects.stale().values_list("pk", flat=True))
    assert stale == {old.pk, never.pk}
    assert not {fresh.pk, edge.pk, unpriced.pk} & stale


def test_stale_uses_setting_and_custom_days():
    p = ProductFactory(price_checked_on=timezone.localdate() - timedelta(days=3))
    assert not Product.objects.stale().filter(pk=p.pk).exists()
    assert Product.objects.stale(days=2).filter(pk=p.pk).exists()
    with override_settings(PRICE_STALE_DAYS=1):
        assert Product.objects.stale().filter(pk=p.pk).exists()
        assert p.price_is_stale()


def test_admin_filters_and_columns():
    admin_user = UserFactory(is_staff=True, is_superuser=True)
    client = Client()
    client.force_login(admin_user)
    old = ProductFactory(slug="old-price", price_checked_on=timezone.localdate() - timedelta(days=30))
    ProductFactory(slug="fresh-price", price_checked_on=timezone.localdate())
    r = client.get("/admin/catalog/product/", {"price_freshness": "stale"})
    assert r.status_code == 200
    body = r.content.decode()
    assert "old-price" in body and "fresh-price" not in body
    r = client.get("/admin/catalog/product/", {"price_freshness": "fresh"})
    assert "fresh-price" in r.content.decode() and old.slug not in r.content.decode()
    # فیلتر مجوز عکس (فکتوری عکس بدون مجوز می‌سازد)
    r = client.get("/admin/catalog/product/", {"image_license": "missing"})
    assert r.status_code == 200 and "old-price" in r.content.decode()


# ---------- نرخ ارز ----------


def test_set_exchange_rate_first_and_audit():
    call_command("set_exchange_rate", 1_000_000, stdout=StringIO())
    assert ExchangeRate.current().toman_per_usd == 1_000_000
    assert AuditLog.objects.filter(action="rate.activate").count() == 1


def test_set_exchange_rate_blocks_typo_unless_forced():
    ExchangeRate.activate(1_000_000)
    with pytest.raises(CommandError):
        call_command("set_exchange_rate", 10_000_000, stdout=StringIO())  # یک صفر اضافه
    assert ExchangeRate.current().toman_per_usd == 1_000_000
    call_command("set_exchange_rate", 1_100_000, stdout=StringIO())      # ۱۰٪ مجاز
    assert ExchangeRate.current().toman_per_usd == 1_100_000
    call_command("set_exchange_rate", 3_000_000, force=True, stdout=StringIO())
    assert ExchangeRate.current().toman_per_usd == 3_000_000
    assert ExchangeRate.objects.filter(is_active=True).count() == 1


def test_set_exchange_rate_rejects_non_positive():
    with pytest.raises(CommandError):
        call_command("set_exchange_rate", 0, stdout=StringIO())


# ---------- مجوز عکس ----------


def test_publish_blocked_without_license_when_required():
    p = ProductFactory(status=Product.Status.DRAFT)  # فکتوری یک عکس بدون مجوز دارد
    assert p.problems_for_publish() == []
    with override_settings(REQUIRE_IMAGE_LICENSE=True):
        assert "مجوز عکس ثبت نشده" in p.problems_for_publish()
        ProductImage.objects.filter(product=p).update(license="CC-BY 4.0", source="https://example.com/x")
        assert p.problems_for_publish() == []


def test_admin_publish_action_respects_license_rule():
    admin_user = UserFactory(is_staff=True, is_superuser=True)
    client = Client()
    client.force_login(admin_user)
    p = ProductFactory(status=Product.Status.DRAFT)
    with override_settings(REQUIRE_IMAGE_LICENSE=True):
        client.post("/admin/catalog/product/", {"action": "publish", "_selected_action": [p.pk]})
        p.refresh_from_db()
        assert p.status == Product.Status.DRAFT
        ProductImage.objects.filter(product=p).update(license="own work")
        client.post("/admin/catalog/product/", {"action": "publish", "_selected_action": [p.pk]})
        p.refresh_from_db()
        assert p.status == Product.Status.ACTIVE


@needs_catalog
@override_settings(REQUIRE_IMAGE_LICENSE=True)
def test_import_keeps_unlicensed_products_as_draft():
    call_command("import_catalog", stdout=StringIO())
    # فقط محصولاتی که عکس دارای مجوز دارند میتوانند active باشند (GTA VI مجوز کاربر دارد).
    for p in Product.objects.filter(status="active"):
        assert not p.images.filter(license="").exists()
    assert Product.objects.filter(status="draft").exists()
    assert set(Product.objects.filter(brand="Starlink").values_list("status", flat=True)) <= {"hidden"}


@needs_catalog
def test_reimport_preserves_license_entered_in_admin():
    """ثبت مجوز در ادمین نباید با import مجدد پاک شود (قبلاً همهٔ عکس‌ها حذف و دوباره ساخته می‌شدند)."""
    call_command("import_catalog", stdout=StringIO())
    img = ProductImage.objects.first()
    img.license, img.source = "CC-BY 4.0", "https://example.com/photo"
    img.save()
    call_command("import_catalog", stdout=StringIO())
    img.refresh_from_db()
    assert (img.license, img.source) == ("CC-BY 4.0", "https://example.com/photo")


@needs_catalog
@override_settings(REQUIRE_IMAGE_LICENSE=True)
def test_import_uses_license_from_json_and_activates(tmp_path):
    data = json.loads((OVERLAY / "data" / "real-catalog.json").read_text(encoding="utf-8"))
    target = next(p for p in data["products"] if p.get("usd_cents") and p["brand"] != "Starlink")
    for im in target["images"]:
        im["license"], im["source"] = "own work", "photo by shop"
    path = tmp_path / "cat.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    call_command("import_catalog", path=str(path), stdout=StringIO())
    assert Product.objects.get(slug=target["slug"]).status == "active"


@needs_catalog
def test_import_removes_images_dropped_from_json(tmp_path):
    call_command("import_catalog", stdout=StringIO())
    data = json.loads((OVERLAY / "data" / "real-catalog.json").read_text(encoding="utf-8"))
    target = next(p for p in data["products"] if len(p["images"]) >= 2)
    dropped = target["images"].pop()["file"]
    path = tmp_path / "cat.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    call_command("import_catalog", path=str(path), stdout=StringIO())
    assert not ProductImage.objects.filter(product__slug=target["slug"], file_name=dropped).exists()
    assert ProductImage.objects.filter(product__slug=target["slug"]).count() == len(target["images"])


# ---------- گزارش کیفیت داده ----------


def test_report_data_quality_lists_and_strict_fails():
    ProductFactory(slug="stale-one", price_checked_on=timezone.localdate() - timedelta(days=40))
    out = StringIO()
    call_command("report_data_quality", stdout=out)
    text = out.getvalue()
    assert "stale-one" in text and "ندارد (سفارش ثبت نمی‌شود)" in text
    with pytest.raises(CommandError):
        call_command("report_data_quality", strict=True, stdout=StringIO())


def test_report_data_quality_strict_passes_when_clean():
    ExchangeRate.activate(1_000_000)
    p = ProductFactory(price_checked_on=timezone.localdate())
    ProductImage.objects.filter(product=p).update(license="own work")
    call_command("report_data_quality", strict=True, stdout=StringIO())


def test_report_image_rights_strict_fails_on_empty_license():
    ProductFactory(slug="no-license")  # فکتوری عکس بدون مجوز میسازد
    with pytest.raises(CommandError):
        call_command("report_image_rights", strict=True, stdout=StringIO())


def test_admin_rate_activation_uses_same_guard_as_command():
    admin_user = UserFactory(is_staff=True, is_superuser=True)
    ExchangeRate.activate(1_000_000)
    client = Client()
    client.force_login(admin_user)
    bad = client.post("/admin/pricing/exchangerate/add/", {"toman_per_usd": 5_000_000})
    assert bad.status_code == 200
    assert ExchangeRate.objects.count() == 1
    good = client.post("/admin/pricing/exchangerate/add/", {"toman_per_usd": 1_100_000})
    assert good.status_code == 302
    assert ExchangeRate.current().toman_per_usd == 1_100_000
