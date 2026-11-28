# Runbook عملیاتی

> تمام هشدارها در `ops/monitoring/alerts.yml` دارای `runbook_url`اند که به لنگرهای همین سند میپردازند.
> مقادیر گیرندهها از متغیرهای محیطی میآیند (`ops/monitoring/render-alertmanager.sh`)؛ پیشفرضها بیخطراند.

## سرویسها
| سرویس | نقش | آدرس داخلی |
|---|---|---|
| `api` | Django + Ninja | `api:8000` |
| `worker` | procrastinate (انقضای سفارش، پیامک، reconcile) | — |
| `web` | Next.js | `web:3000` |
| `caddy` | reverse proxy + /media | 80/443 |
| `db` | PostgreSQL 16 | `db:5432` |
| `redis` | کش مشترک و شمارندههای نرخ | `redis:6379` |

## بارگذاری معمول
```bash
# فایل compose در ریشهٔ مخزن است؛ .env هم باید در ریشه ساخته شود.
cp backend/.env.example .env     # مقادیر واقعی را پر کنید
make -C backend up
make -C backend migrate
make -C backend seed-shipping
make -C backend set-rate RATE=1050000
make -C backend import-catalog
```

## عیب یابی

<a id="api-high-error-rate"></a>
### نرخ خطای ۵xx بالا (ApiHighErrorRate)
- هشدار: `sum(rate(digital_shopping_http_requests_total{status=~"5.."}[5m])) / ... > 0.02` به مدت ۵ دقیقه.
- لاگ ساختاریافتهٔ `api` را با همان `request_id` دنبال کنید؛ `/api/v1/health` و `/api/v1/metrics` مستثنیاند.
- آخرین استقرار و migrationها را بررسید؛ در صورت لزوم طبق بخش «بازیابی» برگردانید.

<a id="api-high-latency"></a>
### تأخیر بالای API (ApiHighLatency)
- آستانه همان SLO است: p95 ≤ **۸۰۰ms** در پنجرهٔ ۳۰ روز؛ هشدار ۱۰ دقیقهای روی `> 0.8` است.
- کوئری: `histogram_quantile(0.95, sum(rate(digital_shopping_http_request_duration_seconds_bucket[5m])) by (le))`.
- علتهای رایج: نرسیدن نرخ ارز/کش، نبود Redis، قفل ردیف روی سفارشها، Missing index؛ سپس `ops/k6/load.js` را اجرا کنید.

<a id="payment"></a>
### پرداخت (PaymentSuccessRateDrop / PaymentFailureSpike)
- وضعیت درگاه sandbox: `PAYMENT_GATEWAY=fake` و `PAYMENT_SANDBOX=True` فقط در staging مجازاند؛ prod حتماً `http` است.
- لاگ `payment_amount_inconsistent` و ردیف `Payment` را ببینید؛ تلاش ناموفق با وضعیت `needs_review` نیازمند بررسی دستی است.
- نرخ موفقیت sandbox وابسته به سناریوست (`FAKE_GATEWAY_SCENARIO`)؛ معیار واقعی ≥ ۹۵٪ پس از اتصال درگاه است.

<a id="worker-backlog"></a>
### انباشت صف کار (ProcrastinateBacklog)
- وضعیت worker: `docker compose logs worker`؛ تازگی پردازش: متریک `digital_shopping_worker_heartbeat_age_seconds` (باید < ۳۰۰ ثانیه باشد).
- اجرای دستی: `make expire-orders`؛ اطمینان حاصل کنید `procrastinate worker` در حال اجراست.

### پیامک ارسال نمیشود
- لاگ `sms_failed` را ببینید؛ `SmsOutbox` با backoff تلاش میکند.
- آداپتور `HttpSms` را با `SMS_HTTP_URL` و `SMS_HTTP_TOKEN` بررسی کنید.
- هرگز `ConsoleSms` را در prod فعال نکنید (settings جلوگیری میکند).

<a id="database"></a>
### دیتابیس (PostgresDown)
- `docker compose ps db` و `pg_isready`؛ سپس `docker compose logs db`.
- SSL الزامی است: `DATABASE_URL` باید شامل `sslmode=require` باشد.
- خطای migration: `python manage.py makemigrations --check --dry-run` را محلی اجرا کنید؛ migration گم شده را بسازید و کامیت کنید، هرگز در prod `makemigrations` نزنید.

<a id="redis"></a>
### کش مشترک (RedisDown)
- `redis-cli ping` و `docker compose logs redis`؛ بدون Redis شمارندههای نرخ per-process میشوند و fasetها ناسازگار میشوند.
- `REDIS_URL` خالی فقط برای توسعهٔ تکپروسه است؛ در prod fail-closed است.

<a id="disk"></a>
### فضای دیسک (DiskSpaceLow)
- بکاپها و لاگها را بررسید؛ `KEEP` در `ops/backup/backup-cron` را کاهش ندهید مگر RPO تأیید شود.
- اطمینان حاصل کنید مقصد offsite (`OFFSITE_TARGET`) در دسترس است.

### فرانت ۵۰۰ میدهد
- لاگ `web` و متغیر `API_BASE_URL` را بررسی کنید (در بیلد Next در rewrites کامپایل میشود).
- `/api/v1/health` را مستقیماً از داخل شبکه تست کنید.

## اعلانها و رصد خارجی
- گیرندهها: `ALERT_WEBHOOK_URL` (پیشفرض)، `SLACK_WEBHOOK_URL` (بحرانی)، `EMAIL_TO` + `SMTP_SMARTHOST` + `SMTP_FROM` + `SMTP_REQUIRE_TLS`.
- رندر: `bash ops/monitoring/render-alertmanager.sh > /etc/alertmanager/alertmanager.yml`؛ بدون تنظیم رازها، پیشفرض `http://127.0.0.1:9/discard` است و هیچ اعلان خارجی فرستاده نمیشود.
- **Sentry:** متغیرهای `SENTRY_DSN` (بکاند) و `NEXT_PUBLIC_SENTRY_DSN` (وب) رزرواند؛ SDK هنوز نصب نشده است (جزئیات: `ops/monitoring/README.md`).
- **Uptime Kuma / Core Web Vitals:** health خارجی `/api/v1/health` و بودجههای Lighthouse در `.github/workflows/web-ci.yml`.

## بازیابی و پشتیبانگیری
- زمانبند: `ops/backup/backup-cron` (هر ۱۵ دقیقه، `KEEP=96`)؛ نصب: `crontab ops/backup/backup-cron`.
- بکاپ: `POSTGRES_DB=digital_shopping POSTGRES_USER=digital_shopping bash ops/backup/backup.sh` → `digital-shopping-YYYYMMDD-HHMMSS.sql.gz` (اختیاراً `.gpg` با `BACKUP_GPG_RECIPIENT`).
- offsite: `OFFSITE_TARGET=rclone-remote:digital-shopping` (اعتبارها محیطیاند)؛ رمزگذاری GPG پیش از کپی توصیه میشود.
- بازیابی: `gunzip -c digital-shopping-....sql.gz | psql -U digital_shopping -d digital_shopping` یا `bash ops/backup/restore.sh digital-shopping-....sql.gz[.gpg]` (پیشفرض: دیتابیس جداگانه).
- **RPO ≤ ۱۵ دقیقه** با زمانبند ۱۵ دقیقهای محقق میشود؛ **RTO < ۱ ساعت** با تمرین بازیابی ماهانه (`RESTORE_TEST=1`).

## تست بار
```bash
# خواندنی (بدون راز)
API_BASE_URL=https://staging.example/api/v1 k6 run ops/k6/load.js
# مسیر خرید sandbox (نشست آزمایشی؛ راز واقعی نیست)
K6_CHECKOUT=1 K6_SESSION_COOKIE=... K6_CSRF_TOKEN=... API_BASE_URL=http://localhost:8000/api/v1 k6 run ops/k6/load.js
```
جزئیات: `ops/k6/README.md`.

## تعویض بدون وقفه (آینده)
- فعلاً استقرارها stop/startاند. برای zero-downtime: migrationها را جدا اجرا کنید، سپس web/api را rolling update کنید و Caddy را به سمت نسخهٔ جدید سوئیچ دهید.
