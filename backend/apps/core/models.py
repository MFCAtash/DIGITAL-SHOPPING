from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """لاگ حسابرسی فقط‌افزودنی: تغییر قیمت، موجودی، نرخ ارز، وضعیت سفارش و ..."""

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    action = models.CharField(max_length=80, db_index=True)
    object_type = models.CharField(max_length=60)
    object_id = models.CharField(max_length=64)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise RuntimeError("AuditLog قابل ویرایش نیست")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("AuditLog قابل حذف نیست")

    @classmethod
    def record(cls, actor, action: str, object_type: str, object_id, before=None, after=None) -> "AuditLog":
        actor = actor if getattr(actor, "pk", None) else None
        return cls.objects.create(actor=actor, action=action, object_type=object_type, object_id=str(object_id), before=before, after=after)


class Notification(models.Model):
    """اعلان رخدادمحور (پیام داخل سایت/پوش/ایمیل). ارسال واقعی توسط worker انجام میشود."""

    class Channel(models.TextChoices):
        IN_APP = "in_app", "داخل سایت"
        PUSH = "push", "پوش"
        EMAIL = "email", "ایمیل"
        SMS = "sms", "پیامک"

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار"
        SENT = "sent", "ارسال شده"
        FAILED = "failed", "ناموفق"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=12, choices=Channel.choices, default=Channel.IN_APP)
    event = models.CharField(max_length=80, db_index=True)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "read_at"])]
