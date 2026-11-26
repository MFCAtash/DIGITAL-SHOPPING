"""اعمال تخفیف بلک فرایدی ۵–۱۰٪ بر تمام کالاهای دارای قیمت (قابل تکرار)."""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.catalog.models import Product


class Command(BaseCommand):
    help = "تنظیم تخفیف ۵ تا ۱۰ درصدی بلک فرایدی برای تمام کالاها بهصورت قطعی"

    def handle(self, *args, **options):
        rows = list(Product.objects.filter(price_usd_cents__isnull=False).order_by("pk"))
        for i, product in enumerate(rows):
            product.discount_percent = 5 + (i % 6)  # 5..10
        Product.objects.bulk_update(rows, ["discount_percent"])
        self.stdout.write(self.style.SUCCESS(f"Black Friday discounts applied to {len(rows)} products"))
