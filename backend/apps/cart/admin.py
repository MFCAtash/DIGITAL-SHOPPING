from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "qty", "seen_final_usd_cents", "added_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """فقط مشاهده (پشتیبانی)؛ guest_key نمایش داده نمی‌شود."""

    list_display = ("id", "user", "updated_at")
    exclude = ("guest_key",)
    readonly_fields = ("user", "created_at", "updated_at")
    inlines = [CartItemInline]

    def has_add_permission(self, request):
        return False
