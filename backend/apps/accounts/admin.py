from django.contrib import admin

from .models import Address, OtpChallenge, SmsOutbox, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("phone", "name", "is_active", "is_staff", "date_joined")
    search_fields = ("phone", "name")
    list_filter = ("is_active", "is_staff")
    fields = ("phone", "name", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("user", "receiver_name", "province", "city", "postal_code", "is_default")
    search_fields = ("user__phone", "receiver_name", "postal_code")
    list_filter = ("province", "is_default")
    raw_id_fields = ("user",)


class _ReadOnly(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(OtpChallenge)
class OtpChallengeAdmin(_ReadOnly):
    """فقط مشاهده؛ code_hash نمایش داده نمی‌شود."""

    list_display = ("phone", "created_at", "expires_at", "attempts", "consumed_at", "ip")
    exclude = ("code_hash",)
    search_fields = ("phone",)


@admin.register(SmsOutbox)
class SmsOutboxAdmin(_ReadOnly):
    """متن پیامک (حاوی کد) نمایش داده نمی‌شود و پس از ارسال از دیتابیس هم پاک است."""

    list_display = ("phone", "kind", "status", "attempts", "next_attempt_at", "last_error")
    list_filter = ("status", "kind")
    exclude = ("text",)
