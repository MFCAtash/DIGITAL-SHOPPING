"""تنظیمات تست محلی روی SQLite (بدون Docker/Postgres).

هدف: توسعه‌دهنده بتواند پیش از CI، کل تست‌ها را روی ویندوز/لینوکس بدون دیتابیس اجرا کند.
تست‌های هم‌زمانی (transaction=True) روی SQLite skip می‌شوند؛ آن‌ها در CI با Postgres اجرا می‌شوند.

اجرا:
    python -m pytest -o DJANGO_SETTINGS_MODULE=config.settings.test_sqlite
"""
from .test import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",  # noqa: F405
        "TEST": {"NAME": ":memory:"},
    }
}
# مهاجرت‌های procrastinate به plpgsql نیاز دارند؛ در تست محلی جدول‌هایش ساخته نمی‌شوند.
MIGRATION_MODULES = {"procrastinate": None}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
