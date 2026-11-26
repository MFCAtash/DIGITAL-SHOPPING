# وضعیت مرحلهٔ ۱ — تثبیت زیربنا

> **سند تاریخی (HISTORICAL):** این جدول نخستین بار پیش از اجرای کامل بکاند نوشته شد.
> وضعیت فعلی (مهاجرتهای کامیتشده، ۲۸۶ تست بکاند Passed و ۲ Skipped) تنها در
> [README.md](../README.md) و [CHANGELOG.md](CHANGELOG.md) معتبر است.

| بند | تغییر | وضعیت فعلی |
|---|---|---|
| ۱.۱ ADR | `docs/adr/0001-django-nextjs.md`؛ `legacy/supabase` | انجام شد |
| ۱.۲ مهاجرت‌ها | مهاجرتهای تمام ۷ اپ در `apps/*/migrations/` کامیتاند | **انجام شد** (`makemigrations --check` در CI سبز) |
| ۱.۳ تست و پوشش | pytest-cov، آستانهها در CI، `constraints.txt` | **انجام شد**: ۲۸۶ passed، ۲ skipped (SQLite) |
| ۱.۴ idempotency | `UniqueConstraint(user, key)`، `request_hash`، UUID | **انجام شد و آزموده شد** |
| ۱.۵ زمان‌بند | procrastinate، worker، انقضای سفارش + AuditLog | **انجام شد**; تست همزمانی در CI با Postgres |
| ۱.۶ سختسازی | CORS، throttle، `check --deploy`، gitleaks | **انجام شد** (CI `backend-ci.yml` و `security.yml`) |
| ۱.۷ داده | فیلتر و گزارش قیمت قدیمی، نرخ ارز، مجوز عکس | **انجام شد**؛ مجوز ۴۹ عکس هنوز نیازمند بازبینی (`docs/ASSET-PROVENANCE.md`) |
| ۱.۸ مستندات و لاگ | README واحد، structlog، `RequestIdMiddleware` | **انجام شد** |

## ترتیب تأیید (امروز)
```bash
cd backend && pip install -r requirements-dev.txt
python -m unittest discover -s tests/pure -t . -v
python manage.py makemigrations --check --dry-run
python manage.py migrate --noinput && python manage.py migrate --check
pytest -q -o DJANGO_SETTINGS_MODULE=config.settings.test_sqlite
# CI همان دستورها را روی Postgres اجرا میکند
```

## نکتهٔ سازگاری
- `procrastinate[django]` و `django-ninja` ثابتشدهاند؛ نام تنظیمات در `config/settings/base.py` معتبر است.

## تغییر رفتار نسبت به قبل
- `place_order` فقط کلید **UUID** میپذیرد (کلیدهای متنی خطای `OrderError` میدهند).
- `import_catalog` عکسها را بر پایهٔ نام فایل همگام میکند و مجوز ثبتشده را با import مجدد پاک نمیکند.
- `Product.price_is_stale()` پیشفرض را از `PRICE_STALE_DAYS` میگیرد.

## شمار تستها (تاریخی → فعلی)
- خالص: ۴۶ → **۱۳۶** تست در `backend/tests/pure/`.
- دیتابیسی: ۵۵ → **۲۸۶ passed + ۲ skipped** (جمع تستها؛ ۲ تست همزمانی روی SQLite رد میشوند و در CI با Postgres اجرااند).
