from pathlib import Path

import environ

from config.logging import build_logging, configure_structlog

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "corsheaders",
    "procrastinate.contrib.django",  # صف کار روی همان Postgres؛ جدول‌هایش با migrate ساخته می‌شود
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.pricing",
    "apps.orders",
    "apps.cart",
    "apps.payments",
]

MIDDLEWARE = [
    "apps.core.middleware.RequestIdMiddleware",  # اولین لایه: request_id در همهٔ لاگ‌ها
    "apps.core.middleware.MetricsMiddleware",  # متریک‌های RED برای /metrics (Prometheus)
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # باید پیش از CommonMiddleware باشد
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "apps.core.middleware.ApiCsrfMiddleware",  # CSRF برای تمام نوشتارهای API (جمله سبد مهمان)
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.core.middleware.AdminGuardMiddleware",  # قفل دوم /admin/ در کنار Caddy
    "apps.core.middleware.SuspiciousActivityMiddleware",  # لاگ 401/403/429
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

DATABASES = {"default": env.db("DATABASE_URL")}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --- تنظیمات دامنهٔ فروشگاه ---
# برندهایی که تا روشن‌شدن وضعیت حقوقی پنهان می‌مانند (نگاه کنید به README، بخش ریسک‌ها).
HIDDEN_BRANDS = env.list("HIDDEN_BRANDS", default=["Starlink"])
# مدت نگه‌داشتن موجودی برای سفارش پرداخت‌نشده
ORDER_EXPIRY_MINUTES = env.int("ORDER_EXPIRY_MINUTES", default=15)
# مسیر اختیاری کاتالوگ برای import_catalog
CATALOG_JSON = env("CATALOG_JSON", default="")

# قیمت‌هایی که تاریخ بررسی‌شان قدیمی‌تر از این تعداد روز است «قدیمی» حساب می‌شوند
PRICE_STALE_DAYS = env.int("PRICE_STALE_DAYS", default=7)
# عکس بدون مجوز ⇒ آگهی منتشر نمی‌شود (در prod پیش‌فرض روشن است؛ نگاه کنید به prod.py)
REQUIRE_IMAGE_LICENSE = env.bool("REQUIRE_IMAGE_LICENSE", default=False)

# --- CORS: فقط allowlist دقیق دامنه‌های فرانت (هرگز CORS_ALLOW_ALL_ORIGINS) ---
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = bool(CORS_ALLOWED_ORIGINS)  # بدون allowlist هیچ اعتباری ارسال نمیشود
CORS_ALLOW_HEADERS = ["accept", "content-type", "x-csrftoken", "authorization", "idempotency-key", "x-request-id"]
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
CORS_EXPOSE_HEADERS = ["x-request-id"]
CORS_URLS_REGEX = r"^/api/.*$"
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# --- محدودیت نرخ API (ninja.throttling) ---
# توجه: شمارنده‌ها در کش پیش‌فرض (حافظهٔ هر پروسه) نگه‌داری می‌شوند؛ با ۳ worker حد مؤثر تا ۳ برابر است.
# برای حد دقیق، در مرحلهٔ بعد کش مشترک (Redis یا DatabaseCache) اضافه شود.
# درخواست‌های SSR فرانت از یک IP می‌آیند؛ حد را بالا نگه دارید یا IP کاربر را در X-Forwarded-For منتقل کنید.
API_THROTTLE_ANON = env("API_THROTTLE_ANON", default="300/min")
API_THROTTLE_AUTH = env("API_THROTTLE_AUTH", default="600/min")
# محدودیت اختصاصی مسیرهای حساس احراز هویت (علاوه بر policy داخلی OTP).
AUTH_OTP_THROTTLE = env("AUTH_OTP_THROTTLE", default="12/min")
AUTH_PASSWORD_THROTTLE = env("AUTH_PASSWORD_THROTTLE", default="8/min")
NINJA_NUM_PROXIES = env.int("NUM_PROXIES", default=0)  # پشت Caddy مقدار ۱ (prod)

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# --- کش مشترک (Redis) ---
# در تولید تنظیم کنید تا throttle بین workerها دقیق و کش فاست/لیست مشترک شود.
# اگر REDIS_URL خالی باشد، LocMem (تک‌پروسه) استفاده می‌شود و همه‌چیز بدون Redis کار می‌کند.
REDIS_URL = env("REDIS_URL", default="")
# مسیر فایلی که worker هر دقیقه مینویسد تا healthcheck از زنده بودن صف مطمئن شود.
WORKER_HEARTBEAT_FILE = env("WORKER_HEARTBEAT_FILE", default="/tmp/codex-worker-heartbeat")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": 300,
            "KEY_PREFIX": env("CACHE_KEY_PREFIX", default="codex"),
        }
    }

# --- متریک‌ها ---
# توکن اجباری برای /metrics؛ در prod خالی نگذارید (prod.py بررسی می‌کند).
METRICS_TOKEN = env("METRICS_TOKEN", default="")

# --- لاگ ساختاریافتهٔ JSON (structlog)؛ در dev کنسول خوانا ---
configure_structlog()
LOGGING = build_logging(json_output=True, level=env("LOG_LEVEL", default="INFO"))

# --- احراز هویت و OTP (مرحلهٔ ۲) ---
# کلید HMAC کدهای OTP؛ در prod حتماً جدا از SECRET_KEY و تصادفی تنظیم شود.
OTP_SECRET = env("OTP_SECRET", default=SECRET_KEY)
SMS_GATEWAY = env("SMS_GATEWAY", default="apps.accounts.sms.ConsoleSms")
# آداپتور HTTP عمومی پیامک (\prod). آدرس/توکن از متغیرهای محیطی میآیند، نه از کد.
SMS_HTTP_URL = env("SMS_HTTP_URL", default="")
SMS_HTTP_TOKEN = env("SMS_HTTP_TOKEN", default="")
SMS_HTTP_TIMEOUT = env.float("SMS_HTTP_TIMEOUT", default=5.0)
# true: ارسال پیامک هم‌زمان با درخواست (توسعه/تست بدون worker). prod: false و ارسال با worker.
SMS_SEND_INLINE = env.bool("SMS_SEND_INLINE", default=False)
# آداپتورهای اختیاری اعلانهای ایمیل/پوش (کلاس یا تابع با امضای (user, notification)).
NOTIFICATION_EMAIL_ADAPTER = env("NOTIFICATION_EMAIL_ADAPTER", default="")
NOTIFICATION_PUSH_ADAPTER = env("NOTIFICATION_PUSH_ADAPTER", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@localhost")
# نشست کوکی (HttpOnly، SameSite=Lax) + CSRF؛ توکن CSRF از GET /auth/csrf در JSON می‌آید پس کوکی‌اش HttpOnly می‌ماند.
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = env.int("SESSION_COOKIE_AGE", default=43200)  # ۱۲ ساعت
SESSION_EXPIRE_AT_BROWSER_CLOSE = env.bool("SESSION_EXPIRE_AT_BROWSER_CLOSE", default=False)
SESSION_SAVE_EVERY_REQUEST = True  # تمدید نشست تنها هنگام فعالیت واقعی کاربر
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_AGE = env.int("CSRF_COOKIE_AGE", default=43200)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
# لینک بازنشانی رمز حداکثر ۱۵ دقیقه معتبر است (توصیه OWASP).
PASSWORD_RESET_TIMEOUT = env.int("PASSWORD_RESET_TIMEOUT", default=900)
ADMIN_ALLOWED_IPS = env.list("ADMIN_ALLOWED_IPS", default=["127.0.0.1/32", "::1/128"])

# --- سبد و سفارش ---
VAT_PERCENT = env.int("VAT_PERCENT", default=10)  # مالیات ارزش‌افزوده؛ فاکتور رسمی را با حسابدار نهایی کنید
CART_HIGH_VALUE_USD_CENTS = env.int("CART_HIGH_VALUE_USD_CENTS", default=50_000)
CART_HIGH_VALUE_MAX_QTY = env.int("CART_HIGH_VALUE_MAX_QTY", default=2)  # ۲ یا ۳؛ تصمیم کسب‌وکار
CART_DEFAULT_MAX_QTY = env.int("CART_DEFAULT_MAX_QTY", default=10)
CART_RETENTION_DAYS = env.int("CART_RETENTION_DAYS", default=30)
RETURN_WINDOW_DAYS = env.int("RETURN_WINDOW_DAYS", default=7)  # مهلت درخواست مرجوعی

# --- پرداخت ---
PAYMENT_GATEWAY = env("PAYMENT_GATEWAY", default="fake")
# آداپتور HTTP واقعی درگاه (وقتی PAYMENT_GATEWAY=http)
PAYMENT_START_URL = env("PAYMENT_START_URL", default="")
PAYMENT_VERIFY_URL = env("PAYMENT_VERIFY_URL", default="")
# بازپرداخت واقعی درگاه (HttpGateway.refund)؛ خالی ⇒ refund_payment ایمن متوقف میشود.
PAYMENT_REFUND_URL = env("PAYMENT_REFUND_URL", default="")
PAYMENT_API_KEY = env("PAYMENT_API_KEY", default="")
PAYMENT_CALLBACK_SECRET = env("PAYMENT_CALLBACK_SECRET", default="")
PAYMENT_AMOUNT_UNIT = env("PAYMENT_AMOUNT_UNIT", default="toman")
# sandbox: اجازهٔ انتخاب سناریوی درگاه آزمایشی در /pay (فقط توسعه/staging؛ در prod هرگز True نشود)
PAYMENT_SANDBOX = env.bool("PAYMENT_SANDBOX", default=False)
FAKE_GATEWAY_SCENARIO = env("FAKE_GATEWAY_SCENARIO", default="success")
PAYMENT_HOLD_MINUTES = env.int("PAYMENT_HOLD_MINUTES", default=30)  # با شروع پرداخت، مهلت سفارش حداقل تا این مدت تمدید می‌شود
PAYMENT_RETRY_AFTER_SECONDS = env.int("PAYMENT_RETRY_AFTER_SECONDS", default=120)
PUBLIC_BASE_URL = env("PUBLIC_BASE_URL", default="http://localhost:8000")  # برای callback درگاه
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")  # مقصد بازگشت کاربر پس از پرداخت
