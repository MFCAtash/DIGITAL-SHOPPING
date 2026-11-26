from django.contrib import admin, messages

from .services import PaymentError, refund_payment
from .states import InvalidPaymentTransition


@admin.action(description="بازپرداخت پرداخت‌های انتخاب‌شده")
def refund(modeladmin, request, queryset):
    for p in queryset:
        try:
            refund_payment(p.pk, actor=request.user)
        except (InvalidPaymentTransition, PaymentError) as exc:
            modeladmin.message_user(request, f"#{p.pk}: {exc}", level=messages.ERROR)


from .models import Payment  # noqa: E402


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """فقط مشاهده + بازپرداخت. صف «needs_review» را روزانه بررسی کنید (پول گرفته‌شده ولی سفارش مطابق نیست)."""

    list_display = ("id", "order", "gateway", "amount_toman", "status", "created_at")
    list_filter = ("status", "gateway")
    search_fields = ("authority", "ref_id", "order__number")
    readonly_fields = [f.name for f in Payment._meta.fields]
    actions = [refund]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
