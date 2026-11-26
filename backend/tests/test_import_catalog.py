import json
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test.utils import override_settings

from apps.catalog.models import PriceHistory, Product, ProductImage

pytestmark = pytest.mark.django_db
OVERLAY = Path(__file__).resolve().parents[2] / "overlay"
needs_catalog = pytest.mark.skipif(not (OVERLAY / "data" / "real-catalog.json").exists(), reason="catalog not found")


@needs_catalog
def test_import_is_idempotent_and_applies_rules():
    call_command("import_catalog")
    first = (Product.objects.count(), ProductImage.objects.count())
    call_command("import_catalog")
    assert (Product.objects.count(), ProductImage.objects.count()) == first
    # استارلینک تا روشن‌شدن وضعیت حقوقی پنهان است
    assert set(Product.objects.filter(brand="Starlink").values_list("status", flat=True)) == {"hidden"}
    # قیمت تقریبی ⇒ قابل خرید نیست
    assert not Product.objects.filter(price_note="approx", purchasable=True).exists()
    # آگهی بدون قیمت (TUF قدیمی) پیش‌نویس است
    assert Product.objects.get(slug="asus-tuf-gaming-15").status == "draft"
    # هیچ آگهی فعالی بدون عکس نیست
    assert not Product.objects.filter(status="active", images__isnull=True).exists()
    p = Product.objects.get(slug="xiaomi-redmi-note-14-5g")
    assert p.ram_gb == 6 and p.storage_gb == 128 and p.battery_mah == 5110


@needs_catalog
def test_reimport_keeps_operational_fields_unless_asked():
    call_command("import_catalog")
    p = Product.objects.get(slug="xiaomi-poco-x7")
    p.stock = 99
    p.save()
    call_command("import_catalog")
    p.refresh_from_db()
    assert p.stock == 99
    call_command("import_catalog", overwrite_operational=True)
    p.refresh_from_db()
    assert p.stock != 99


@needs_catalog
def test_invalid_catalog_is_rejected(tmp_path):
    data = json.loads((OVERLAY / "data" / "real-catalog.json").read_text(encoding="utf-8"))
    data["products"][0]["images"] = []
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(CommandError):
        call_command("import_catalog", path=str(bad))
    assert Product.objects.count() == 0


@needs_catalog
def test_dry_run_saves_nothing():
    call_command("import_catalog", dry_run=True)
    assert Product.objects.count() == 0


@needs_catalog
@override_settings(REQUIRE_IMAGE_LICENSE=True)
def test_image_rights_register_populates_license_and_preserves_needs_review():
    call_command("import_catalog", stdout=StringIO())
    gta = Product.objects.get(slug="grand-theft-auto-vi")
    assert set(gta.images.values_list("license", flat=True)) == {"user-provided"}
    other = Product.objects.get(slug="xiaomi-redmi-note-14-5g")
    assert all(img.license == "source-attribution" for img in other.images.all())
    assert all(img.rights_status == "needs-review" for img in other.images.all())
    assert other.status == Product.Status.ACTIVE  # حقوق ثبت شد؛ آگهی به پیشنویس تنزل نکرد
    assert Product.objects.filter(status=Product.Status.ACTIVE).count() >= 20  # کاتالوگ تقریباً خالی نشد
    out = StringIO()
    call_command("report_image_rights", stdout=out)
    assert "needs-review" in out.getvalue()
    assert f"نیاز به بازبینی (needs-review): {ProductImage.objects.filter(rights_status='needs-review').count()}" in out.getvalue()


@needs_catalog
def test_import_records_old_price_in_history_on_change(tmp_path):
    call_command("import_catalog", stdout=StringIO())
    data = json.loads((OVERLAY / "data" / "real-catalog.json").read_text(encoding="utf-8"))
    target = next(p for p in data["products"] if p["slug"] == "xiaomi-redmi-note-14-5g")
    old = target["usd_cents"]
    target["usd_cents"] = old + 1000
    path = tmp_path / "changed.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    call_command("import_catalog", path=str(path), stdout=StringIO())
    row = PriceHistory.objects.get(product__slug=target["slug"], source="import_catalog")
    assert row.usd_cents == old
    # import مجدد همان قیمت نباید نقطهٔ تکراری اضافه کند
    call_command("import_catalog", path=str(path), stdout=StringIO())
    assert PriceHistory.objects.filter(product__slug=target["slug"], source="import_catalog").count() == 1


@needs_catalog
def test_snapshot_prices_is_idempotent():
    call_command("import_catalog", stdout=StringIO())
    call_command("snapshot_prices", stdout=StringIO())
    first = PriceHistory.objects.filter(source="snapshot").count()
    assert first > 0
    call_command("snapshot_prices", stdout=StringIO())
    assert PriceHistory.objects.filter(source="snapshot").count() == first
