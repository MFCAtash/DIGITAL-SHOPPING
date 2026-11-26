# مانیتورینگ و Observability

## اجزا (پیادهمانده)
- **Prometheus + Alertmanager + Grafana**: سرویسها در `backend/docker-compose.yml` تعریف شدهاند؛
  پیکربندیها در `ops/monitoring/` و dashboardها در `grafana/dashboards/` (provision خودکار).
- **متریکهای بکاند**: `apps/core/metrics.py` قالب Prometheus 0.0.4 را بدون وابستگی خارجی تولید میکند و
  `GET /api/v1/metrics` آنها را (با `METRICS_TOKEN`) ارائه میدهد.
- **Postgres/Redis/Node exporters**: برای سلامت زیرساخت Scrape میشوند.
- **Request-ID و لاگ ساختاریافته**: `RequestIdMiddleware` هر درخواست را با `request_id` Correlation میدهد.
- **Sentry / Uptime Kuma (اختیاری)**: SDK هنوز نصب نشده است؛ متغیرها و نحوهٔ اتصال در ادامه.

## متریکهای موجود (`codex_*`)
| متریک | نوع | محل | هدف |
|---|---|---|---|
| `codex_http_requests_total{method,path,status}` | counter | middleware | نرخ خطا و حجم |
| `codex_http_request_duration_seconds_bucket` | histogram | middleware | p50/p95/p99 |
| `codex_http_in_progress{method,path}` | gauge | middleware | درخواستهای در حال اجرا |
| `codex_orders_created_total{status}` | counter | orders | قیف سفارش |
| `codex_orders_paid_total` | counter | payments | تکمیل پرداخت |
| `codex_payments_started_total{gateway}` | counter | payments | آغاز پرداخت |
| `codex_payments_failed_total{reason}` | counter | payments | خطای پرداخت |
| `codex_coupon_applied_total{kind}` | counter | orders | کوپنهای مصرفشده |
| `codex_search_zero_results_total` | counter | catalog | جستجوهای بینتیجه |
| `codex_process_start_time_seconds` | gauge | core | تشخیص restart worker |

> مسیرها پیش از برچسبزنی نرمال میشوند (`/orders/123` → `/orders/{id}`) تا کاردینالیتی منفجر نشود.
> شمارندهها per-processاند؛ Prometheus هر instance را جدا scrape میکند و تجمیع در پرسوجو انجام میشود.

## هشدارها
تمام قواعد در `alerts.yml` دارای `runbook_url`اند که به لنگرهای موجود در `docs/RUNBOOK.md` میپردازند:
نرخ خطا، تأخیر p95 (آستانهٔ ۸۰۰ms مطابق SLO)، افت نرخ پرداخت، انباشت صف، قطع Postgres/Redis و کمبود دیسک.

### گیرندهها (بدون URL نمونهٔ example.com)
`alertmanager.yml` حاوی placeholder است؛ قبل از اجرا باید با اسکریپت رندر شود:

```bash
export ALERT_WEBHOOK_URL="<وب هوک داخلی یا خارجی>"
export SLACK_WEBHOOK_URL="<Slack webhook کامل>"
export EMAIL_TO="<گیرندهٔ ایمیل>" SMTP_SMARTHOST="<میزبان SMTP:پورت>" \
       SMTP_FROM="<فرستنده>" SMTP_REQUIRE_TLS="true"
bash ops/monitoring/render-alertmanager.sh > /etc/alertmanager/alertmanager.yml
```

بدون تنظیم متغیرها، پیشفرض اسکریپت `http://127.0.0.1:9/discard` و `alerts@localhost` است:
هیچ اعلانی به مقصد خارجی فرستاده نمیشود. رازها (`SLACK_WEBHOOK_URL`، اعتبار SMTP) فقط در محیط اجرا نگهداری میشوند،
در Git کامیت نمیشوند و توسط `.gitleaks.toml` اسکن میگردند. لنگرهای runbook در `docs/RUNBOOK.md` تعریف شدهاند.

## سرویسهای اختیاری (رزرو متغیر، بدون کد)
- **Sentry بکاند:** `SENTRY_DSN` — SDK هنوز اضافه نشده؛ پس از نصب `sentry-sdk`، DSN از محیط خوانده میشود و
  قواعد `request_id` و «حداقل PII» رعایت میشود. مقدار خالی = غیرفعال.
- **Sentry وب:** `NEXT_PUBLIC_SENTRY_DSN` — فقط هنگام بیلد Next خوانده میشود (`NEXT_PUBLIC_*` در باندل client قرار میگیرد)؛
  SDK نصب نشده و فعلاً هیچ رویدادی فرستاده نمیشود.
- **Core Web Vitals / Analytics:** متغیر عمومی رزرو `NEXT_PUBLIC_ANALYTICS_ID` (مثلاً شناسهٔ GTM/GA)؛
  هنوز هیچ کد ردیابی در وب وجود ندارد. در صورت اضافه شدن، CSP (`connect-src`) و سیاست حریم خصوصی را بهروز کنید.
- **Uptime Kuma:** health خارجی `/api/v1/health` + push از worker (پورت جداگانهٔ worker وجود ندارد).
- **Lighthouse CI:** در `.github/workflows/web-ci.yml` با بودجههای `apps/web/lighthouserc.json` اجرا میشود (RUM جداگانه در فاز ۴).

## اصول
- هیچ PII (شماره موبایل، آدرس، کد OTP) نباید در متریک یا لاگ برچسبگذاری شود.
- آستانهها از `docs/SLO.md` میآیند و با ترافیک واقعی بازبینی میشوند.
- `/metrics` در prod بدون `METRICS_TOKEN` قابل دسترس نیست و `prod.py` در صورت خالی بودن آن fail-closed است.
