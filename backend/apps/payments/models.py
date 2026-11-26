from django.db import models

from .states import PaymentStatus


class Payment(models.Model):
    """یک تلاش پرداخت برای یک سفارش (چند تلاش ممکن است). شمارهٔ کارت/اطلاعات حساس هرگز ذخیره نمی‌شود؛ فقط authority و وضعیت."""

    order = models.ForeignKey("orders.Order", on_delete=models.PROTECT, related_name="payments")
    gateway = models.CharField(max_length=20)
    amount_toman = models.PositiveBigIntegerField()
    authority = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=[(s.value, s.value) for s in PaymentStatus], default=PaymentStatus.REDIRECTED.value, db_index=True)
    ref_id = models.CharField(max_length=100, blank=True)
    #: پارامترهای callback (فقط رشته‌ها) برای حسابرسی؛ به آن‌ها اعتماد نمی‌شود
    raw_callback = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["status", "created_at"])]

    def __str__(self) -> str:
        return f"{self.gateway}:{self.authority[:12]} {self.status}"
