"""ورود کاتالوگ از JSON (idempotent با slug). نمونه: python manage.py import_catalog --dry-run"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Category, PriceHistory, Product, ProductImage
from apps.catalog.rules import PRICE_NOTES, is_hidden_brand, validate_catalog
from apps.catalog.specs import extract_numbers
from apps.pricing.models import ExchangeRate, NoActiveRate
from apps.pricing.money import to_toman

# فیلدهای عملیاتی که با import مجدد روی محصولِ موجود بازنویسی نمیشوند (مگر --overwrite-operational)
OPERATIONAL = ("stock", "status", "purchasable")


def load_image_rights(path: Path) -> dict[tuple[str, str], dict]:
    """دفتر حقوق عکسها را به نگاشتی (product_slug, file) → ورودی تبدیل میکند."""
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}
    out = {}
    for entry in data.get("images", []):
        if entry.get("product_slug") and entry.get("file"):
            out[(entry["product_slug"], entry["file"])] = entry
    return out


class Command(BaseCommand):
    help = "ورود کاتالوگ از real-catalog.json با اعتبارسنجی کامل (قانون پروژه: آگهی قیمتدار بدون عکس رد میشود)"

    def add_arguments(self, parser):
        parser.add_argument("--path", default=None)
        parser.add_argument("--images-dir", default=None)
        parser.add_argument("--image-rights", default=None, help="مسیر image-rights.json (پیشفرض: overlay/data/image-rights.json)")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--overwrite-operational", action="store_true", help="موجودی، وضعیت و purchasable محصولات موجود هم بازنویسی شود")

    def handle(self, *args, **opts):
        overlay = Path(settings.BASE_DIR).parent / "overlay"
        path = Path(opts["path"] or settings.CATALOG_JSON or overlay / "data" / "real-catalog.json")
        rights_path = Path(opts["image_rights"] or overlay / "data" / "image-rights.json")
        images_dir = Path(opts["images_dir"] or overlay / "public" / "products")
        if not path.exists():
            raise CommandError(f"فایل کاتالوگ پیدا نشد: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        files = {p.name for p in images_dir.iterdir()} if images_dir.exists() else set()
        errors = validate_catalog(data, files)
        if errors:
            raise CommandError("کاتالوگ نامعتبر است:\n- " + "\n- ".join(errors))
        if opts["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"سالم: {len(data['products'])} محصول، {len(data['categories'])} دسته (چیزی ذخیره نشد)"))
            return
        rights = load_image_rights(rights_path)
        with transaction.atomic():
            created, updated, price_changes = self._import(data, opts["overwrite_operational"], rights)
        self.stdout.write(self.style.SUCCESS(f"انجام شد: {created} جدید، {updated} بهروز، {price_changes} تغییر قیمت ثبتشده"))

    def _import(self, data: dict, overwrite_operational: bool, rights: dict) -> tuple[int, int, int]:
        cats = {}
        for c in data["categories"]:
            cats[c["slug"]], _ = Category.objects.update_or_create(
                slug=c["slug"],
                defaults={
                    "name_i18n": {"fa": c["name"], "en": c.get("name_en") or c["name"]},
                    "sort": c.get("sort", 0),
                },
            )
        created = updated = price_changes = 0
        for p in data["products"]:
            note = PRICE_NOTES.get(p.get("price_note") or "", "")
            priced = p.get("usd_cents") is not None
            has_images = bool(p.get("images"))
            checked = date.fromisoformat(p.get("checked_on") or data["checked_on"])
            catalog_fields = {
                "brand": p["brand"],
                "category": cats[p["category"]],
                "name": p["name"],
                "description_i18n": {
                    "fa": p["description"],
                    "en": p.get("description_en") or (
                        f"{p['brand']} {p['name']} — " + ", ".join(str(v) for v in list(p.get("specs", {}).values())[:3])
                    ),
                },
                "specs": p.get("specs", {}),
                "price_usd_cents": p.get("usd_cents"),
                "discount_percent": p.get("discount_percent", 0),
                "price_note": note,
                "price_checked_on": checked if priced else None,
                "source_url": p.get("source", ""),
                **extract_numbers(p.get("specs", {})),
            }
            if is_hidden_brand(p["brand"], settings.HIDDEN_BRANDS):
                status = Product.Status.HIDDEN
            else:
                status = Product.Status.ACTIVE if (priced and has_images) else Product.Status.DRAFT
            operational = {"stock": p["stock"], "status": status, "purchasable": priced and note != "approx"}
            product = Product.objects.filter(slug=p["slug"]).first()
            old_price = product.price_usd_cents if product is not None else None
            status_written = False
            if product is None:
                product = Product.objects.create(slug=p["slug"], **catalog_fields, **operational)
                created += 1
                status_written = True
            else:
                for k, v in {**catalog_fields, **(operational if overwrite_operational else {})}.items():
                    setattr(product, k, v)
                product.save()
                updated += 1
                status_written = overwrite_operational
                # قیمت قدیمی را بهعنوان نقطهٔ تاریخی ثبت میکنیم تا نمودار PDP خالی نماند.
                if old_price is not None and old_price != product.price_usd_cents:
                    self._record_price_change(product, old_price)
                    price_changes += 1
            self._sync_images(product, p.get("images", []), rights)
            # قانون: عکس بدون مجوز ⇒ آگهی پیشنویس میماند (فقط وقتی وضعیت همینجا نوشته شده؛ تصمیم دستی ادمین بازنویسی نمیشود)
            if status_written and settings.REQUIRE_IMAGE_LICENSE and product.status == Product.Status.ACTIVE and product.images.filter(license="").exists():
                product.status = Product.Status.DRAFT
                product.save(update_fields=["status", "updated_at"])
        return created, updated, price_changes

    @staticmethod
    def _record_price_change(product: Product, old_price: int) -> None:
        try:
            rate = ExchangeRate.current().toman_per_usd
        except NoActiveRate:
            rate = None
        PriceHistory.objects.create(
            product=product,
            usd_cents=old_price,
            toman=to_toman(old_price, rate) if rate else None,
            source="import_catalog",
        )

    @staticmethod
    def _sync_images(product: Product, images: list[dict], rights: dict | None = None) -> None:
        """همگامسازی عکسها بر پایهٔ نام فایل.

        مجوز و منبعی که ادمین ثبت کرده با import مجدد پاک نمیشود؛ دفتر حقوق عکسها
        (image-rights.json) و مقادیر صریح در JSON فقط جای خالیها را پر میکنند.
        """
        rights = rights or {}
        existing = {img.file_name: img for img in product.images.all()}
        for i, im in enumerate(images):
            right = rights.get((product.slug, im["file"]), {})
            explicit_license = (im.get("license") or "").strip()
            explicit_source = (im.get("source") or "").strip()
            lic = explicit_license or str(right.get("license") or "").strip()
            src = explicit_source or str(right.get("source") or "").strip()
            status = (im.get("rights_status") or right.get("rights_status") or ("cleared" if lic and not right else "")).strip()
            alt = {
                "fa": (im.get("alt_fa") or im.get("alt") or "").strip(),
                "en": (im.get("alt_en") or im.get("alt") or "").strip(),
            }
            obj = existing.pop(im["file"], None)
            if obj is None:
                ProductImage.objects.create(
                    product=product, file_name=im["file"], alt_i18n=alt, sort=i,
                    license=lic, source=src, rights_status=status,
                )
                continue
            obj.alt_i18n, obj.sort = alt, i
            if lic and (not obj.license or explicit_license):
                obj.license = lic
            if src and (not obj.source or explicit_source):
                obj.source = src
            if status and (not obj.rights_status or im.get("rights_status")):
                obj.rights_status = status
            obj.save()
        for leftover in existing.values():
            leftover.delete()
