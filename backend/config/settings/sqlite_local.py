"""تنظیمات نمایشی تکماشینی بدون Postgres (فقط توسعه/دمو).

توضیح: مهاجرتهای procrastinate نیازمند plpgsqlاند؛ در این حالت مهاجرت آن خاموش میشود
و پیامک بهصورت inline ارسال میشود. **هرگز درprod استفاده نشود.**
"""
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "local.sqlite3"}}  # noqa: F405
MIGRATION_MODULES = {"procrastinate": None}
SMS_GATEWAY = "apps.accounts.sms.RecordingSms"
SMS_SEND_INLINE = True
OTP_SECRET = "local-demo-otp-secret"
PAYMENT_SANDBOX = True
API_THROTTLE_ANON = "1000000/min"
API_THROTTLE_AUTH = "1000000/min"
CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3100", "http://127.0.0.1:3100"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3100", "http://127.0.0.1:3100"]
FRONTEND_URL = "http://localhost:3100"
MEDIA_URL = "/media/products/"
MEDIA_ROOT = BASE_DIR.parent / "overlay" / "public" / "products"  # noqa: F405
