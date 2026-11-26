from django.conf import settings
from django.db import models
from django.db.models import Q

from .states import OrderStatus


class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=[(s.value, s.value) for s in OrderStatus], default=OrderStatus.PENDING.value, db_index=True)
    idempotency_key = models.CharField(max_length=64)  # یکتا فقط به‌ازای هر کاربر (UniqueConstraint پایین)
    request_hash = models.CharField(max_length=64, blank=True)  # sha256 محتوای درخواست؛ برای تشخیص «همان کلید، سبد متفاوت»
    rate_used = models.PositiveIntegerField()  # تومان به ازای هر دلار در لحظهٔ سفارش
    number = models.CharField(max_length=11, unique=True, null=True, blank=True)  # شمارهٔ عمومی غیرترتیبی (CS-XXXXXXXX)
    total_usd_cents = models.PositiveBigIntegerField(default=0)
    subtotal_toman = models.PositiveBigIntegerField(default=0)  # جمع کالاها (پیش از تخفیف)
    shipping_code = models.CharField(max_length=30, blank=True)
    shipping_toman = models.PositiveBigIntegerField(default=0)
    tax_toman = models.PositiveBigIntegerField(default=0)  # ارزش‌افزوده به‌صورت ردیف جدا
    coupon_code = models.CharField(max_length=40, blank=True)  # کد کوپن مصرف‌شده (در صورت وجود)
    discount_toman = models.PositiveBigIntegerField(default=0)  # تخفیف کوپن؛ سمت سرور محاسبه و ثبت می‌شود
    total_toman = models.PositiveBigIntegerField(default=0)  # = کالاها − تخفیف + ارسال + مالیات
    address = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            # کلید سراسری نیست: دو کاربر می‌توانند کلید یکسان داشته باشند و هرگز سفارش هم را نمی‌بینند.
            models.UniqueConstraint(fields=["user", "idempotency_key"], name="order_user_idempotency_key_uniq"),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="+")
    qty = models.PositiveIntegerField()
    unit_usd_cents = models.PositiveBigIntegerField()  # قیمت لحظهٔ خرید
    unit_toman = models.PositiveBigIntegerField()

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(qty__gt=0), name="orderitem_qty_positive")]


class ShippingMethod(models.Model):
    """روش ارسال با نرخ پایه، ارسال رایگان بالای مبلغ، و محدودیت استان (خالی = همه). وزن در این نسخه نیست."""

    code = models.SlugField(max_length=30, unique=True)
    name = models.CharField(max_length=80)
    base_toman = models.PositiveIntegerField(default=0)
    free_over_toman = models.PositiveBigIntegerField(null=True, blank=True)
    provinces = models.JSONField(default=list, blank=True, help_text="فهرست استان‌ها؛ خالی = همهٔ کشور")
    eta = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)
    sort = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort", "id"]

    def __str__(self) -> str:
        return self.code

    def as_rule(self):
        from .shipping import ShippingRule

        return ShippingRule(self.code, self.name, self.base_toman, self.free_over_toman, tuple(self.provinces or ()), self.is_active, self.eta)


class Shipment(models.Model):
    """اطلاعات ارسال سفارش: کد رهگیری و وضعیت تحویل (برای تایم لاین صفحه پیگیری)."""

    class Status(models.TextChoices):
        PREPARING = "preparing", "آماده سازی"
        HANDED_OVER = "handed_over", "تحویل به پست"
        IN_TRANSIT = "in_transit", "در مسیر"
        DELIVERED = "delivered", "تحویل شده"
        FAILED = "failed", "ناموفق"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipment")
    carrier = models.CharField(max_length=80, blank=True)
    tracking_number = models.CharField(max_length=80, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PREPARING, db_index=True)
    eta = models.CharField(max_length=80, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class ReturnRequest(models.Model):
    """درخواست مرجوعی کالا توسط مشتری (پس از تحویل)."""

    class Status(models.TextChoices):
        REQUESTED = "requested", "ثبت شده"
        APPROVED = "approved", "تأیید شده"
        REJECTED = "rejected", "رد شده"
        REFUNDED = "refunded", "بازپرداخت شده"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="returns")
    item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="returns")
    reason = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
