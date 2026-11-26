"""ثبت نرخ ارز فعال با محافظ اشتباه تایپی. نمونه: python manage.py set_exchange_rate 1050000"""
from django.core.management.base import BaseCommand, CommandError

from apps.pricing.models import ExchangeRate, NoActiveRate
from apps.pricing.rate_guard import SuspiciousRate, check_rate_change


class Command(BaseCommand):
    help = "نرخ جدید (تومان به ازای هر دلار) را فعال می‌کند؛ نرخ قبلی غیرفعال و در AuditLog ثبت می‌شود"

    def add_arguments(self, parser):
        parser.add_argument("toman_per_usd", type=int)
        parser.add_argument("--max-change", type=int, default=20, help="حداکثر درصد تغییر نسبت به نرخ فعلی (پیش‌فرض ۲۰)")
        parser.add_argument("--force", action="store_true", help="محافظ تغییر شدید را نادیده بگیر (فقط وقتی مطمئنید)")

    def handle(self, *args, **opts):
        new = opts["toman_per_usd"]
        try:
            old = ExchangeRate.current().toman_per_usd
        except NoActiveRate:
            old = None
        try:
            check_rate_change(old, new, 10**9 if opts["force"] else opts["max_change"])
        except SuspiciousRate as exc:
            raise CommandError(f"{exc}. اگر عدد درست است با --force دوباره اجرا کنید.") from exc
        rate = ExchangeRate.activate(new)
        self.stdout.write(self.style.SUCCESS(f"نرخ فعال: {rate.toman_per_usd} تومان (قبلی: {old})"))
