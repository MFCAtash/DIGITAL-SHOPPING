from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from apps.core.models import AuditLog


class NoActiveRate(Exception):
    """نرخ ارز فعال تعریف نشده است."""


class ExchangeRate(models.Model):
    toman_per_usd = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    is_active = models.BooleanField(default=False)
    set_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["is_active"], condition=Q(is_active=True), name="only_one_active_rate")]

    def __str__(self) -> str:
        return f"{self.toman_per_usd} ({'active' if self.is_active else 'old'})"

    @classmethod
    def current(cls) -> "ExchangeRate":
        rate = cls.objects.filter(is_active=True).first()
        if rate is None:
            raise NoActiveRate("نرخ ارز فعال تعریف نشده است")
        return rate

    @classmethod
    def activate(cls, toman_per_usd: int, by=None) -> "ExchangeRate":
        """نرخ جدید را فعال و نرخ قبلی را غیرفعال می‌کند (اتمی) و در AuditLog ثبت می‌کند."""
        with transaction.atomic():
            old = cls.objects.select_for_update().filter(is_active=True).first()
            if old:
                old.is_active = False
                old.save(update_fields=["is_active"])
            new = cls.objects.create(toman_per_usd=toman_per_usd, is_active=True, set_by=by if getattr(by, "pk", None) else None)
            AuditLog.record(by, "rate.activate", "exchange_rate", new.pk,
                            before={"toman_per_usd": old.toman_per_usd} if old else None, after={"toman_per_usd": new.toman_per_usd})
        return new


class Coupon(models.Model):
    """کوپن تخفیف درصدی یا مبلغی (تومان). مصرفهر بار در تراکنش جدا ثبت میشود."""

    class Kind(models.TextChoices):
        PERCENT = "percent", "درصد"
        AMOUNT = "amount", "مبلغ"

    code = models.CharField(max_length=40, unique=True)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.PERCENT)
    value = models.PositiveIntegerField(help_text="درصد (۱–۱۰۰) یا مبلغ بر حسب ریال")
    description = models.CharField(max_length=160, blank=True)  # متن نمایشی برای کاربر («۱۰٪ تخفیف تا سقف …»)
    min_subtotal_toman = models.PositiveBigIntegerField(default=0)
    max_discount_toman = models.PositiveBigIntegerField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(default=1)
    max_uses_per_user = models.PositiveIntegerField(null=True, blank=True, help_text="خالی = بدون سقف به‌ازای هر کاربر")
    used_count = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return self.code

    def discount_for(self, subtotal_toman: int) -> int:
        """مبلغ تخفیف (تومان) یا ValueError اگر کوپن قابل استفاده نباشد."""
        now = timezone.now()
        if not self.is_active or self.used_count >= self.max_uses:
            raise ValueError("cooldown_or_used")
        if self.valid_from and now < self.valid_from:
            raise ValueError("not_started")
        if self.valid_until and now > self.valid_until:
            raise ValueError("expired")
        if subtotal_toman < self.min_subtotal_toman:
            raise ValueError("min_subtotal")
        if self.kind == self.Kind.PERCENT:
            if not 1 <= self.value <= 100:
                raise ValueError("invalid_percent")
            amount = subtotal_toman * self.value // 100
        else:
            amount = self.value
        if self.max_discount_toman is not None:
            amount = min(amount, self.max_discount_toman)
        return min(max(amount, 0), subtotal_toman)


class CouponUse(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="uses")
    order_number = models.CharField(max_length=20, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    discount_toman = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
