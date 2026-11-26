"""ثبت یک نقطهٔ PriceHistory برای قیمت فعلی همهٔ کالاها (idempotent در هر روز).

نمونه: python manage.py snapshot_prices
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.catalog.models import PriceHistory, Product
from apps.pricing.models import ExchangeRate, NoActiveRate
from apps.pricing.money import to_toman


class Command(BaseCommand):
    help = "قیمت فعلی کالاها را یکبار در روز در تاریخچه ثبت میکند تا نمودار PDP داده داشته باشد"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        today = timezone.localdate()
        existing = set(
            PriceHistory.objects.filter(recorded_at__date=today).values_list("product_id", "usd_cents")
        )
        rows = [
            p for p in Product.objects.filter(price_usd_cents__isnull=False).only("pk", "price_usd_cents")
            if (p.pk, p.price_usd_cents) not in existing
        ]
        if not opts["dry_run"] and rows:
            try:
                rate = ExchangeRate.current().toman_per_usd
            except NoActiveRate:
                rate = None
            now = timezone.now()
            PriceHistory.objects.bulk_create([
                PriceHistory(
                    product_id=p.pk, usd_cents=p.price_usd_cents,
                    toman=to_toman(p.price_usd_cents, rate) if rate else None,
                    recorded_at=now, source="snapshot",
                )
                for p in rows
            ])
        self.stdout.write(self.style.SUCCESS(f"ثبت شد: {len(rows)} نقطهٔ قیمت (dry-run={opts['dry_run']})"))
