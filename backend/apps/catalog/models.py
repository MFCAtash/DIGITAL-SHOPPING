from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.pricing.money import final_usd_cents

from .freshness import is_stale, stale_cutoff


class Category(models.Model):
    slug = models.SlugField(unique=True)
    name_i18n = models.JSONField(default=dict, blank=True)
    sort = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort", "slug"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.slug


class ProductQuerySet(models.QuerySet):
    def stale(self, today=None, days: int | None = None):
        """کالاهای قیمت‌دار که تاریخ بررسی قیمتشان خالی یا قدیمی‌تر از `days` روز است (پیش‌فرض: PRICE_STALE_DAYS)."""
        today = today or timezone.localdate()
        days = settings.PRICE_STALE_DAYS if days is None else days
        return self.filter(price_usd_cents__isnull=False).filter(Q(price_checked_on__isnull=True) | Q(price_checked_on__lt=stale_cutoff(today, days)))

    def missing_image_license(self):
        """کالاهایی که دست‌کم یک عکسشان مجوز ندارد."""
        return self.filter(images__license="").distinct()


class Product(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        HIDDEN = "hidden", "Hidden"

    class PriceNote(models.TextChoices):
        FROM = "from", "From"
        APPROX = "approx", "Approximate"

    slug = models.SlugField(max_length=120, unique=True)
    brand = models.CharField(max_length=80, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=200)
    description_i18n = models.JSONField(default=dict, blank=True)
    specs = models.JSONField(default=dict, blank=True)

    # ستون‌های عددی برای فیلتر و مقایسه (از specs استخراج می‌شوند)
    ram_gb = models.PositiveIntegerField(null=True, blank=True)
    storage_gb = models.PositiveIntegerField(null=True, blank=True)
    screen_in = models.FloatField(null=True, blank=True)
    battery_mah = models.PositiveIntegerField(null=True, blank=True)
    weight_g = models.PositiveIntegerField(null=True, blank=True)

    price_usd_cents = models.PositiveIntegerField(null=True, blank=True)
    discount_percent = models.PositiveSmallIntegerField(default=0)
    price_note = models.CharField(max_length=10, choices=PriceNote.choices, blank=True)
    price_checked_on = models.DateField(null=True, blank=True)
    source_url = models.URLField(blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    purchasable = models.BooleanField(default=False, help_text="تا بازبینی رسمی قیمت، خاموش بماند")
    stock = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(price_usd_cents__isnull=True) | Q(price_usd_cents__gt=0), name="product_price_positive"),
            models.CheckConstraint(condition=Q(discount_percent__lte=100), name="product_discount_max_100"),
        ]
        indexes = [models.Index(fields=["status", "brand"]), models.Index(fields=["price_usd_cents"])]

    def __str__(self) -> str:
        return self.slug

    @property
    def final_usd_cents(self) -> int | None:
        if self.price_usd_cents is None:
            return None
        return final_usd_cents(self.price_usd_cents, self.discount_percent)

    def price_is_stale(self, days: int | None = None) -> bool:
        return is_stale(self.price_checked_on, timezone.localdate(), settings.PRICE_STALE_DAYS if days is None else days)

    def problems_for_publish(self) -> list[str]:
        """قانون پروژه: آگهی بدون قیمت یا بدون عکس منتشر نمی‌شود."""
        problems = []
        if self.price_usd_cents is None:
            problems.append("قیمت ندارد")
        if not self.pk or not self.images.exists():
            problems.append("عکس ندارد")
        if not self.description_i18n.get("fa"):
            problems.append("توضیح فارسی ندارد")
        if settings.REQUIRE_IMAGE_LICENSE and self.pk and self.images.filter(license="").exists():
            problems.append("مجوز عکس ثبت نشده")
        return problems


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    file_name = models.CharField(max_length=200, help_text="نام فایل webp در پوشهٔ عکس‌ها")
    alt_i18n = models.JSONField(default=dict, blank=True)
    sort = models.PositiveSmallIntegerField(default=0)
    license = models.CharField(max_length=120, blank=True, help_text="مجوز استفاده از عکس")
    source = models.CharField(max_length=300, blank=True)
    rights_status = models.CharField(max_length=20, blank=True, help_text="وضعیت حقوقی ثبتشده در image-rights.json (مثلاً needs-review)")

    class Meta:
        ordering = ["sort", "id"]

    def __str__(self) -> str:
        return self.file_name


class ProductVariant(models.Model):
    """واریانت واقعی محصول (رنگ/حافظه/سایز).

    پیش از این واریانت‌ها بهصورت محصول جدا شبیهسازی میشدند و PDP نمیتوانست انتخاب واریانت داشته باشد.
    """

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=80, unique=True)
    name_i18n = models.JSONField(default=dict, blank=True)
    options = models.JSONField(default=dict, blank=True, help_text='مثلاً {"color": "مشکی", "storage": "256GB"}')
    price_delta_usd_cents = models.IntegerField(default=0, help_text="تفاوت نسبت به قیمتbase محصول (میتواند منفی باشد)")
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    sort = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort", "id"]
        indexes = [models.Index(fields=["product", "is_active"])]

    def __str__(self) -> str:
        return self.sku

    def final_usd_cents(self) -> int | None:
        base = self.product.final_usd_cents
        return None if base is None else max(0, base + self.price_delta_usd_cents)


class PriceHistory(models.Model):
    """تاریخچهٔ قیمت for نمودار و هشدار کاهش قیمت؛ فقطافزودنی."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="price_history")
    usd_cents = models.PositiveIntegerField()
    toman = models.PositiveBigIntegerField(null=True, blank=True)
    source = models.CharField(max_length=80, blank=True)
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-recorded_at", "-id"]
        indexes = [models.Index(fields=["product", "-recorded_at"])]


class StockMovement(models.Model):
    """رد تغییر موجودی (دلیل، مقدار، عامل) برای حسابرسی و جلوگیری از رقابتهای ناسازگار."""

    class Reason(models.TextChoices):
        PURCHASE = "purchase", "خرید"
        ORDER = "order", "سفارش"
        CANCEL = "cancel", "لغو سفارش"
        MANUAL = "manual", "تنظیم دستی"
        RETURN = "return", "مرجوعی"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_movements")
    variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL, related_name="stock_movements")
    delta = models.IntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices)
    note = models.CharField(max_length=200, blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class Review(models.Model):
    """نظر خریداران: فقط کاربرانی که سفارش تحویلداشتهاند مجاز به ثبت نظر تأییدشدهاند."""

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار تأیید"
        APPROVED = "approved", "تأییدشده"
        REJECTED = "rejected", "ردشده"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=160, blank=True)
    body = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["product", "user"], name="review_one_per_user_per_product"),
            models.CheckConstraint(condition=Q(rating__gte=1) & Q(rating__lte=5), name="review_rating_1_5"),
        ]
        indexes = [models.Index(fields=["product", "status"])]


class Wishlist(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlisted_by")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["user", "product"], name="wishlist_user_product_uniq")]
