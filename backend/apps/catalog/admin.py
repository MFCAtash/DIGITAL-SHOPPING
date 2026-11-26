from django.contrib import admin, messages
from django.db.models import Count, Q

from apps.core.models import AuditLog

from .models import Category, PriceHistory, Product, ProductImage, ProductVariant, Review, StockMovement, Wishlist

AUDITED = ("price_usd_cents", "discount_percent", "stock", "status", "purchasable")


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("file_name", "alt_i18n", "sort", "license", "source", "rights_status")


class StalePriceFilter(admin.SimpleListFilter):
    """گزارش «کالاهای با قیمت قدیمی» (آستانه: PRICE_STALE_DAYS)."""

    title = "تازگی قیمت"
    parameter_name = "price_freshness"

    def lookups(self, request, model_admin):
        return (("stale", "قیمت قدیمی"), ("fresh", "قیمت تازه"))

    def queryset(self, request, queryset):
        if self.value() == "stale":
            return queryset.stale()
        if self.value() == "fresh":
            return queryset.filter(price_usd_cents__isnull=False).exclude(pk__in=Product.objects.stale().values("pk"))
        return queryset


class ImageLicenseFilter(admin.SimpleListFilter):
    title = "مجوز عکس"
    parameter_name = "image_license"

    def lookups(self, request, model_admin):
        return (("missing", "دارای عکس بدون مجوز"), ("ok", "همهٔ عکس‌ها دارای مجوز"))

    def queryset(self, request, queryset):
        if self.value() == "missing":
            return queryset.missing_image_license()
        if self.value() == "ok":
            return queryset.exclude(pk__in=Product.objects.missing_image_license().values("pk"))
        return queryset


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("slug", "sort")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("slug", "brand", "status", "price_usd_cents", "discount_percent", "purchasable", "stock", "price_checked_on", "stale", "unlicensed_images")
    list_filter = ("status", StalePriceFilter, ImageLicenseFilter, "category", "brand", "purchasable", "price_note")
    search_fields = ("slug", "name", "brand")
    inlines = [ProductImageInline]
    actions = ["publish", "hide"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_unlicensed=Count("images", filter=Q(images__license=""), distinct=True))

    @admin.display(description="عکس بدون مجوز", ordering="_unlicensed")
    def unlicensed_images(self, obj):
        return obj._unlicensed

    @admin.display(boolean=True, description="قیمت قدیمی")
    def stale(self, obj):
        return obj.price_is_stale()

    def save_model(self, request, obj, form, change):
        before = None
        if change:
            before = Product.objects.filter(pk=obj.pk).values(*AUDITED).first()
        super().save_model(request, obj, form, change)
        after = {k: getattr(obj, k) for k in AUDITED}
        if before != after:
            AuditLog.record(request.user, "product.update" if change else "product.create", "product", obj.pk, before=before, after=after)

    @admin.action(description="انتشار (فقط آگهی‌های دارای قیمت و عکس)")
    def publish(self, request, queryset):
        for p in queryset:
            problems = p.problems_for_publish()
            if problems:
                self.message_user(request, f"{p.slug}: {'، '.join(problems)}", level=messages.ERROR)
                continue
            before = {"status": p.status}
            p.status = Product.Status.ACTIVE
            p.save(update_fields=["status", "updated_at"])
            AuditLog.record(request.user, "product.publish", "product", p.pk, before=before, after={"status": p.status})

    @admin.action(description="پنهان‌کردن")
    def hide(self, request, queryset):
        for p in queryset:
            before = {"status": p.status}
            p.status = Product.Status.HIDDEN
            p.save(update_fields=["status", "updated_at"])
            AuditLog.record(request.user, "product.hide", "product", p.pk, before=before, after={"status": p.status})


# --- پنلهای فاز ۶–۱۲ ---
@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ("sku", "product", "stock", "is_active", "sort")
    list_filter = ("is_active",)
    search_fields = ("sku", "product__slug")
    autocomplete_fields = ("product",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "status", "created_at")
    list_filter = ("status", "rating")
    search_fields = ("product__slug", "user__phone", "body")
    actions = ("approve", "reject")

    @admin.action(description="تأیید نظرها")
    def approve(self, request, queryset):
        queryset.update(status=Review.Status.APPROVED)

    @admin.action(description="رد نظرها")
    def reject(self, request, queryset):
        queryset.update(status=Review.Status.REJECTED)


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "created_at")
    search_fields = ("user__phone", "product__slug")


@admin.register(PriceHistory)
class PriceHistoryAdmin(admin.ModelAdmin):
    list_display = ("product", "usd_cents", "toman", "recorded_at", "source")
    list_filter = ("source",)
    search_fields = ("product__slug",)
    readonly_fields = ("recorded_at",)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("product", "variant", "delta", "reason", "actor", "created_at")
    list_filter = ("reason",)
    search_fields = ("product__slug",)
    readonly_fields = ("created_at",)
