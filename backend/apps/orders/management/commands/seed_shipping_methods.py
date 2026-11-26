"""روش‌های ارسال پیش‌فرض (idempotent). **مبالغ نمونه‌اند؛ نرخ واقعی را با پست/پیک تعیین و در ادمین ویرایش کنید.**"""
from django.core.management.base import BaseCommand

from apps.orders.models import ShippingMethod

DEFAULTS = [
    {"code": "post", "name": "پست پیشتاز", "base_toman": 80_000, "free_over_toman": 5_000_000, "provinces": [], "eta": "۳ تا ۵ روز کاری", "sort": 0},
    {"code": "courier", "name": "پیک شهری", "base_toman": 60_000, "free_over_toman": None, "provinces": ["تهران", "البرز"], "eta": "همان روز یا فردا", "sort": 1},
]


class Command(BaseCommand):
    help = "روش‌های ارسال پیش‌فرض را می‌سازد (موجودها را بازنویسی نمی‌کند)"

    def handle(self, *args, **opts):
        made = 0
        for d in DEFAULTS:
            _, created = ShippingMethod.objects.get_or_create(code=d["code"], defaults={k: v for k, v in d.items() if k != "code"})
            made += created
        self.stdout.write(self.style.SUCCESS(f"{made} روش ارسال ساخته شد (مبالغ نمونه‌اند؛ در ادمین ویرایش کنید)"))
