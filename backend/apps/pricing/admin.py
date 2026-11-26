from django import forms
from django.contrib import admin
from django.core.exceptions import ValidationError

from .models import Coupon, CouponUse, ExchangeRate, NoActiveRate
from .rate_guard import SuspiciousRate, check_rate_change


class ExchangeRateForm(forms.ModelForm):
    """همان محافظ اشتباه تایپیِ set_exchange_rate، در فرم ادمین (خطا روی فیلد نمایش داده میشود)."""

    class Meta:
        model = ExchangeRate
        fields = ("toman_per_usd",)

    def clean_toman_per_usd(self):
        new = self.cleaned_data["toman_per_usd"]
        try:
            old = ExchangeRate.current().toman_per_usd
        except NoActiveRate:
            old = None
        try:
            check_rate_change(old, new)
        except SuspiciousRate as exc:
            raise ValidationError(str(exc)) from exc
        return new


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ("toman_per_usd", "is_active", "set_by", "created_at")
    list_filter = ("is_active",)
    readonly_fields = ("is_active", "set_by", "created_at")
    form = ExchangeRateForm

    def save_model(self, request, obj, form, change):
        # نرخها فقط ساخته میشوند (تاریخچه حفظ شود) و نرخ تازه همیشه فعال میشود.
        if change:
            return
        # دفاع در عمق: حتی اگر فرم دور زده شود، محافظ نرخ اینجا هم اعمال میشود.
        try:
            old = ExchangeRate.current().toman_per_usd
        except NoActiveRate:
            old = None
        try:
            check_rate_change(old, obj.toman_per_usd)
        except SuspiciousRate as exc:
            raise ValidationError(str(exc)) from exc
        new = ExchangeRate.activate(obj.toman_per_usd, by=request.user)
        obj.pk, obj.is_active = new.pk, True

    def has_change_permission(self, request, obj=None):
        return False if obj else super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "kind", "value", "max_uses", "used_count", "is_active", "valid_until")
    list_filter = ("kind", "is_active")
    search_fields = ("code",)
    readonly_fields = ("used_count", "created_at")


@admin.register(CouponUse)
class CouponUseAdmin(admin.ModelAdmin):
    list_display = ("coupon", "order_number", "discount_toman", "user", "created_at")
    search_fields = ("order_number", "coupon__code")
    readonly_fields = ("created_at",)
