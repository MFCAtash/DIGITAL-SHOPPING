"""گزارش وضعیت حقوق عکسها بر پایهٔ دفتر overlay/data/image-rights.json.

نمونه: python manage.py report_image_rights [--strict]
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count

from apps.catalog.models import ProductImage


class Command(BaseCommand):
    help = "تعداد عکسها را بر حسب rights_status و مجوز خلاصه میکند (needs-review یعنی بازبینی حقوقی لازم است)"

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true", help="اگر حتی یک عکس بدون مجوز است، با خطا تمام شود")

    def handle(self, *args, **opts):
        total = ProductImage.objects.count()
        missing_license = ProductImage.objects.filter(license="").count()
        by_status = {
            (row["rights_status"] or "(خالی)"): row["n"]
            for row in ProductImage.objects.values("rights_status").annotate(n=Count("pk")).order_by("rights_status")
        }
        self.stdout.write(f"کل عکسها: {total}")
        self.stdout.write("تعداد بر حسب وضعیت حقوقی:")
        for status, count in sorted(by_status.items()):
            self.stdout.write(f"  {status}: {count}")
        self.stdout.write(f"عکس بدون مجوز: {missing_license}")
        self.stdout.write(f"نیاز به بازبینی (needs-review): {by_status.get('needs-review', 0)}")
        self.stdout.write("توضیح: needs-review یعنی مجوز source-attribution ثبت شده ولی بازتوزیع تجاری آن بازبینی نشده است.")
        if opts["strict"] and missing_license:
            raise CommandError(f"{missing_license} عکس بدون مجوز است؛ انتشار مجاز نیست.")
