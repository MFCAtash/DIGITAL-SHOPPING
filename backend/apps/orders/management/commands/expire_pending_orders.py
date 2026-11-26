"""لغو سفارش‌های پرداخت‌نشدهٔ منقضی (جایگزین cron برای محیط‌هایی که worker ندارند)."""
from django.core.management.base import BaseCommand

from apps.orders.services import run_expiry


class Command(BaseCommand):
    help = "سفارش‌های pending که expires_at آن‌ها گذشته لغو و موجودی‌شان آزاد می‌شود"

    def handle(self, *args, **opts):
        n = run_expiry()
        self.stdout.write(self.style.SUCCESS(f"{n} سفارش منقضی لغو شد"))
