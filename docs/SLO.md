# SLO و بودجهٔ خطا

این سند تعریف قابل اندازهگیری «سالم بودن» فروشگاه است. متریکها توسط
`apps/core/metrics.py` producing میشوند و در `/api/v1/metrics` (با توکن) در معرض Prometheus قرار میگیرند.

## ۱٫ SLIs و اهداف

| سرویس | SLI | هدف (rolling 30d) | پرسوجو |
|---|---|---|---|
| API | نرخ موفقیت درخواستها (غیر ۵xx) | ≥ ۹۹٫۵٪ | `sum(rate(digital_shopping_http_requests_total{status!~"5.."}[30d])) / sum(rate(digital_shopping_http_requests_total[30d]))` |
| API | تأخیر p95 | ≤ ۸۰۰ms (همان آستانهٔ هشدار `ApiHighLatency`) | `histogram_quantile(0.95, sum(rate(digital_shopping_http_request_duration_seconds_bucket[30d])) by (le))` |
| سفارش | ثبت سفارش موفق (غیر خطای داخلی) | ≥ ۹۹٫۹٪ | `digital_shopping_orders_created_total` در برابر ۵xx مسیر `/orders` |
| پرداخت | نرخ تکمیل پرداخت | ≥ ۷۰٪ (sandbox) / ≥ ۹۵٪ (واقعی) | `digital_shopping_orders_paid_total / digital_shopping_payments_started_total` |
| صف کار | تأخیر پردازش periodic | ≤ ۵ دقیقه | `procrastinate_jobs_todo` |
| دیتابیس | در دسترس بودن | ≥ ۹۹٫۹٪ | `up{job="postgres"}` |
| فرانت | Lighthouse موبایل (Performance) | ≥ ۸۵٪ (بودجهٔ CI در `apps/web/lighthouserc.json`) | CI `web-ci.yml` |
| فرانت | Lighthouse A11y / Best practices / SEO | ۱۰۰٪ / ≥ ۹۵٪ / ≥ ۹۰٪ | CI `web-ci.yml` |
| فرانت | LCP / CLS / TBT | ≤ ۲۵۰۰ms / ≤ ۰٫۱ / ≤ ۳۰۰ms | CI `web-ci.yml` |

> اعداد پرداخت در sandbox وابسته به سناریوی آزمایشیاند (`fake`)؛ هدف واقعی پس از اتصال درگاه معتبر اعمال میشود.

## ۲٫ تعریف خطا
- خطای کاربر (۴xx ناشی از اعتبارسنجی) جزء خطای سرویس محسوب نمیشود، مگر اینکه نرخ ۴xx بهطور غیرعادی زیاد شود.
- ۵xx، timeout و عدم پاسخ health همگی خطای سرویساند.
- درخواستهای `/health` و `/metrics` از شمارش RED مستثنیاند تا نویز ایجاد نکنند.

## ۳٫ بودجهٔ خطا و سیاست
- بودجهٔ ۳۰ روزهٔ API: ۰٫۵٪ ← تقریباً ۲۱۶ دقیقه در ماه.
- اگر ۵۰٪ بودجه در ۷ روز نخست مصرف شود: انتشار ویژگی جدید متوقف و فقط رفع خطا/بهینهسازی مجاز است.
- اگر بودجه تمام شود: rollback به آخرین نسخهٔ سالم، اجرای Runbook و بازنگری postmortem بدون سرزنش.
- هر هشدار باید `runbook_url` داشته باشد؛ هشدار بدون اقدام مشخص حذف یا اصلاح میشود.

## ۴٫ پایش و هشدار
- Prometheus هر ۱۵ ثانیه scrape میکند؛ قواعد در `ops/monitoring/alerts.yml` و گیرندهها در `alertmanager.yml`.
- Grafana با داشبورد `digital-shopping-overview` (نرخ درخواست، خطا، p95، قیف پرداخت، وضعیت سرویسها) از پیش provisioning شده است.
- `/metrics` با `METRICS_TOKEN` محافظت میشود؛ برچسبها فقط `method`, `path` (نرمالشده)، `status`, `gateway`, `kind`اند و هیچ PIIای در آنها نیست.
- شمارندهها per-processاند؛ Prometheus هر worker/instance را جداگانه scrape میکند و sum در پرس و جو انجام میشود.

## ۵٫ تمرین
- بکاپ Postgres هر ۱۵ دقیقه (`ops/backup/backup-cron`)، نگهداری ۹۶ نسخه، تست بازیابی ماهانه با `ops/backup/restore.sh`؛ RPO ≤ ۱۵ دقیقه، RTO ≤ ۱ ساعت (جزئیات: `docs/RUNBOOK.md`).
- آزمون بار با `ops/k6/load.js`: ۲۰ → ۱۰۰ VU، آستانهٔ p95 < 1.5s و نرخ خطا < ۲٪؛ مسیر خرید sandbox اختیاراً با `K6_CHECKOUT=1` (`ops/k6/README.md`).
- هر انتشار شامل smoke test `/api/v1/health` و بررسی migration است (`.github/workflows/deploy.yml`).
