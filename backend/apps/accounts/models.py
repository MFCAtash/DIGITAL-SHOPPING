from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.persian import normalize_phone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone: str, password: str | None = None, **extra):
        user = self.model(phone=normalize_phone(phone), **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # ورود فقط با OTP
        user.save(using=self._db)
        return user

    def create_superuser(self, phone: str, password: str, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(phone, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """کاربر سفارشی با شمارهٔ موبایل؛ باید پیش از اولین مهاجرت تعریف شود."""

    phone = models.CharField(max_length=11, unique=True, validators=[RegexValidator(r"^09\d{9}$")])
    name = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()
    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self) -> str:
        return self.phone


class OtpChallenge(models.Model):
    """یک کد یک‌بارمصرف. کد خام ذخیره نمی‌شود؛ فقط HMAC (apps/accounts/otp_policy.py)."""

    phone = models.CharField(max_length=11)
    code_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["phone", "-created_at"]), models.Index(fields=["ip", "-created_at"])]

    def __str__(self) -> str:
        return f"OTP {self.phone} @ {self.created_at:%Y-%m-%d %H:%M}"


class SmsOutbox(models.Model):
    """صف ارسال پیامک (الگوی outbox): شکست ارائه‌دهنده ورود را نمی‌شکند؛ تلاش مجدد با backoff. متن پس از پایان پاک می‌شود."""

    class Status(models.TextChoices):
        PENDING = "pending"
        SENT = "sent"
        FAILED = "failed"

    phone = models.CharField(max_length=11)
    text = models.TextField(blank=True)
    kind = models.CharField(max_length=20, default="otp")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    last_error = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status", "next_attempt_at"])]


class Address(models.Model):
    """نشانی کاربر؛ در لحظهٔ سفارش در Order.address کپی می‌شود. قواعد: apps/accounts/address_rules.py (هم‌قاعدهٔ فرانت)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    receiver_name = models.CharField(max_length=120)
    receiver_phone = models.CharField(max_length=11)
    province = models.CharField(max_length=40)
    city = models.CharField(max_length=80)
    postal_code = models.CharField(max_length=10)
    street = models.CharField(max_length=300)
    plate = models.CharField(max_length=20, blank=True)
    unit = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=Q(is_default=True), name="address_one_default_per_user"),
        ]

    def as_snapshot(self) -> dict[str, str]:
        """کپی ثابت برای Order.address (ویرایش بعدی نشانی روی سفارش قدیمی اثر نمی‌گذارد)."""
        return {
            "receiverName": self.receiver_name, "receiverPhone": self.receiver_phone, "province": self.province, "city": self.city,
            "postalCode": self.postal_code, "street": self.street, "plate": self.plate, "unit": self.unit,
        }
