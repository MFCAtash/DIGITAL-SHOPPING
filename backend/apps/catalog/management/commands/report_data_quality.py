"""گزارش کیفیت داده پیش از انتشار: قیمت قدیمی، عکس بدون مجوز، نبودِ نرخ ارز.
نمونه: python manage.py report_data_quality --strict   (کد خروج ۱ اگر مشکلی باشد)"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.catalog.models import Product
from apps.pricing.models import ExchangeRate


class Command(BaseCommand):
    help = "گزارش قیمت‌های قدیمی، عکس‌های بدون مجوز و نبودِ نرخ ارز فعال"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=None, help="آستانهٔ قدیمی‌بودن قیمت (پیش‌فرض PRICE_STALE_DAYS)")
        parser.add_argument("--strict", action="store_true", help="در صورت وجود هر مشکلی با خطا خارج شو")

    def handle(self, *args, **opts):
        days = settings.PRICE_STALE_DAYS if opts["days"] is None else opts["days"]
        today = timezone.localdate()
        problems = 0

        stale = list(Product.objects.stale(today=today, days=days).order_by("price_checked_on", "slug"))
        self.stdout.write(self.style.MIGRATE_HEADING(f"قیمت قدیمی‌تر از {days} روز: {len(stale)}"))
        for p in stale:
            age = f"{(today - p.price_checked_on).days} روز" if p.price_checked_on else "تاریخ ندارد"
            self.stdout.write(f"  - {p.slug} ({p.status}): {age}")
        problems += len(stale)

        unlicensed = list(Product.objects.missing_image_license().order_by("slug"))
        self.stdout.write(self.style.MIGRATE_HEADING(f"کالاهای دارای عکس بدون مجوز: {len(unlicensed)}"))
        for p in unlicensed:
            n = p.images.filter(license="").count()
            self.stdout.write(f"  - {p.slug}: {n} عکس")
        problems += len(unlicensed)

        has_rate = ExchangeRate.objects.filter(is_active=True).exists()
        self.stdout.write(self.style.MIGRATE_HEADING("نرخ ارز فعال: " + ("دارد" if has_rate else "ندارد (سفارش ثبت نمی‌شود)")))
        problems += 0 if has_rate else 1

        if opts["strict"] and problems:
            raise CommandError(f"{problems} مورد نیازمند رسیدگی است")
