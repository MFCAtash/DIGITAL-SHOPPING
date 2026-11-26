from django.conf import settings
from django.db import models
from django.db.models import Q


class Cart(models.Model):
    """سبد خرید: برای کاربر واردشده یا مهمان (کلید تصادفی در کوکی امضاشده). **قیمت در سبد ذخیره نمی‌شود.**"""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="cart")
    guest_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=Q(user__isnull=False) | Q(guest_key__isnull=False), name="cart_has_owner")]

    def __str__(self) -> str:
        return f"cart#{self.pk} user={self.user_id} guest={'yes' if self.guest_key else 'no'}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="+")
    qty = models.PositiveIntegerField()
    #: آخرین قیمت نهایی (سنت دلار) که کاربر **دید**؛ فقط برای هشدار «قیمت تغییر کرده» (قیمت نمایشی/پرداختی همیشه زنده است)
    seen_final_usd_cents = models.PositiveIntegerField(null=True, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["cart", "product"], name="cartitem_unique_product"),
            models.CheckConstraint(condition=Q(qty__gt=0), name="cartitem_qty_positive"),
        ]
