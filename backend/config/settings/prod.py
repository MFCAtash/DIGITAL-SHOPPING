from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

DEBUG = False

# --- fail-closed: آداپتورهایی که کد OTP را فاش میکنند درprod ممنوعاند ---
_FORBIDDEN_SMS = {
    "apps.accounts.sms.ConsoleSms",  # کد را در لاگ مینویسد
    "apps.accounts.sms.RecordingSms",  # فقط تست
}
_SMS_GATEWAY = env("SMS_GATEWAY", default="apps.accounts.sms.ConsoleSms")  # noqa: F405
if _SMS_GATEWAY in _FORBIDDEN_SMS:
    raise ImproperlyConfigured(
        f"SMS_GATEWAY={_SMS_GATEWAY} در محیط تولید ممنوع است؛ از apps.accounts.sms.HttpSms استفاده کنید."
    )
SMS_GATEWAY = _SMS_GATEWAY
if env.bool("SMS_SEND_INLINE", default=False):  # noqa: F405
    raise ImproperlyConfigured("SMS_SEND_INLINE در تولید باید false باشد تا ارسال از صف انجام شود.")
if not env("OTP_SECRET", default=""):  # noqa: F405
    raise ImproperlyConfigured("OTP_SECRET در تولید باید جدا از SECRET_KEY و بهصورت تصادفی تنظیم شود.")
if env("PAYMENT_GATEWAY", default="fake") == "fake":  # noqa: F405
    raise ImproperlyConfigured("PAYMENT_GATEWAY=fake در تولید ممنوع است؛ از PAYMENT_GATEWAY=http با درگاه واقعی استفاده کنید.")
# /metrics نباید بدون توکن در معرض رصد/اینترنت باشد (Prometheus آنرا ارسال میکند).
if not env("METRICS_TOKEN", default=""):  # noqa: F405
    raise ImproperlyConfigured("METRICS_TOKEN خالی است؛ در تولید باید توکن تصادفی بلندی تنظیم شود.")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # پشت Caddy
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False  # پیش از فعال‌کردن، پیامد preload را بررسی کنید
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])  # noqa: F405
X_FRAME_OPTIONS = "DENY"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# عکس بدون مجوز ⇒ آگهی پیش‌نویس می‌ماند (قابل خاموش‌کردن با REQUIRE_IMAGE_LICENSE=False فقط برای staging)
REQUIRE_IMAGE_LICENSE = env.bool("REQUIRE_IMAGE_LICENSE", default=True)  # noqa: F405
# پشت Caddy یک پروکسی داریم (برای تشخیص IP واقعی در محدودیت نرخ)
NINJA_NUM_PROXIES = env.int("NUM_PROXIES", default=1)  # noqa: F405

# تصمیم آگاهانه: HSTS preload فعلاً خاموش است (برگشت‌ناپذیر؛ پس از اطمینان از همهٔ زیردامنه‌ها فعال شود).
# بدون این، `check --deploy` فقط همین یک هشدار را می‌دهد و CI با --fail-level WARNING می‌شکست.
SILENCED_SYSTEM_CHECKS = ["security.W021"]
