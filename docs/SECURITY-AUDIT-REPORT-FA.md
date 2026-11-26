# گزارش ممیزی امنیتی جامع — Digital Shopping

تاریخ: ۵ آذر ۱۴۰۵ (۲۶ نوامبر ۲۰۲۶) · دامنه: بکاند Django/Ninja، فرانت Next.js، Caddy/Compose، CI و وابستگیها.
روش: بررسی استاتیک منبع، اجرای تستها، اسکن راز و وابستگی، و بررسی تاریخچهٔ git.

## ۱٫ خلاصهٔ اجرایی

| حوزه | وضعیت قبل | وضعیت بعد |
|---|---|---|
| رازها و متغیرهای محیطی | فقط برخی چکها در `prod.py` | system checkهای fail-closed + اسکنر محلی + اسکریپت چرخش |
| احراز هویت و رمز | OTP-only، بدون رمز قابل تنظیم | OTP + رمز هششدهٔ PBKDF2 + بازنشانی زماندار |
| CSRF | فقط مسیرهای دارای نشست | تمام نوشتارهای `/api/` حتی سبد مهمان |
| ادمین | فقط IP-allowlist در Caddy | لایهٔ دوم Django + لاگ رد شدن |
| هدرها | HSTS/nosniff ساده | CSP، X-Frame-Options، COOP/CORP، Permissions-Policy |
| لاگ رویدادهای مشکوک | پراکنده | `log_security` و میانافزار 401/403/429 |
| XSS/تزریق | هیچ sink خطرناکی نبود؛ CSP نبود | CSP + اسکنر الگوهای خطرناک |
| پرداخت | بررسی مبلغ در callback | بررسی مجدد جمع سفارش پیش از شروع پرداخت |
| وابستگیها | بستههای بلااستفاده | حذف شدند؛ pip-audit/npm audit سبز |

## ۲٫ یافتهها و اقدامات

| # | یافته (شاهد) | اقدام |
|---|---|---|
| 1 | `DEBUG=True` در `dev.py`/`sqlite_local.py` و خطر استفادهٔ نادرست در تولید | `apps/core/checks.py` در محیط prod هرگونه DEBUG=True را خطای سامانه میکند؛ `prod.py` DEBUG=False دارد |
| 2 | `SECRET_KEY`/`OTP_SECRET`/`METRICS_TOKEN` میتوانستند کوتاه/placeholder باشند | بررسی طول، الگوی placeholder و جدابودن از SECRET_KEY |
| 3 | خطاهای CSRF فقط هنگام ورود نشستی بررسی میشد (Ninja viewها csrf_exemptاند) | `ApiCsrfMiddleware` برای تمام متدهای ناامن `/api/` بجز OTP/بازنشانی |
| 4 | `/admin/` تنها توسط Caddy محدود بود | `AdminGuardMiddleware` با CIDRهای تنظیمشده و لاگ `admin_ip_denied`/`admin_staff_denied` |
| 5 | تلاش ناموفق OTP و کوپن نامعتبر لاگ نمیشد | `log_security` با اثر انگشت بدون PII |
| 6 | عدم وجود رمز عبور و لینک بازنشانی | مسیرهای `/auth/password/{set,change,reset/request,reset/confirm}` با `validate_password`، `set_password` و `default_token_generator` (حداکثر ۹۰۰ ثانیه) |
| 7 | نرخ ورود تنها policy داخلی OTP بود | `AnonRateThrottle` اختصاصی `/auth/otp/*` و `/auth/password/*` |
| 8 | CORS/CSRF originها اعتبارسنجی نمیشد | `check_browser_origins`: فقط HTTPS و لیست صریح |
| 9 | CSP/X-Frame-Options missing در وب | هدرها در `next.config.mjs` و Caddy (`frame-ancestors 'none'`) |
| 10 | `/metrics` قابل دسترس از بیرون بود | Caddy 404 + الزام توکن + fail-closed در prod |
| 11 | دو کلید `PAYMENT_GATEWAY` متناقض در `.env.example` | مقدار دوم به توضیح sandbox تبدیل و `sslmode=require` اضافه شد |
| 12 | `hypothesis`/`pip-tools`/`build`/`wheel` بدون استفاده | از requirements-dev و constraints حذف شدند |
| 13 | امکان دستکاری جمع ذخیرهشدهٔ سفارش | `verify_order_totals()` پیش از `start_payment` + لاگ `payment_amount_inconsistent` |
| 14 | SQL خام | تنها دو محل: `select 1` و advisory lock پارامترشده (`%s`) — الگوی f-string ممنوع توسط اسکنر |
| 15 | رازها در تاریخچه | اسکنر محلی + gitleaks در CI (fetch-depth=0) + مستند چرخش |
| 16 | رد شدن callback پرداخت با POST توسط CSRF (درگاه نمیتواند توکن بفرستد) | `@csrf_exempt` صریح با توجیه + تأیید HMAC/verify سرور و تست POST |
| 17 | `remotePatterns` تصویر اجازهٔ ANY HTTPS میداد | محدود به localhost یا میزبان صریح `NEXT_PUBLIC_MEDIA_HOSTNAME` |
| 18 | `FRONTEND_URL`/`PUBLIC_BASE_URL` میتوانستند http باشند | چک امنیتی تولید الزام HTTPS |

## ۳٫ نتایج اسکن
- `python scripts/security_scan.py --root .` → **بدون یافته**.
- `pip-audit -r requirements.txt` و `-r requirements-dev.txt` → **No known vulnerabilities found**.
- `npm audit --omit=dev --audit-level=high` در `apps/web` و `packages/ui` → **found 0 vulnerabilities**.
- `manage.py check --deploy --fail-level WARNING` با تنظیمات prod و رازهای آزمایشی قوی → **System check identified no issues (1 silenced)**.
- اسکن git: پروژهٔ تحویلی فاقد `.git` است و تاریخچهای برای اسکن ندارد. تنها مخزن موجود در محیط،
  مربوط به پروژهٔ دیگری (`nobatyar` در workspace root) است؛ اسکن آن موارد زیر را نشان داد:
  - راز واقعی committed نشده است؛ `.env` آن untracked و gitignored است.
  - موارد پرچمشده عبارتاند از fixtureهای تست (`kms.service.test.ts`, `storage.config.test.ts`,
    `preflight.test.ts`) و باندلهای تولیدشدهٔ Storybook (`storybook-static`) — نه کلید تولید.
  - مقدار `MINIO_SECRET_KEY=nobatyar_secret` در مستندات فاز ۶ یک placeholder است و توسط کد رد میشود.
  - توصیه: در آن پروژهٔ جداگانه fixtureها به مقادیر آشکاراً جعلی تغییر دهند و `storybook-static` را gitignore کنند.
  هیچ کلیدی از پروژهٔ حاضر نیاز به باطل سازی خارجی ندارد؛ رازهای placeholder در `.env.example` نمونهاند.

## ۴٫ تستها و راستیآزمایی
- `pytest -o DJANGO_SETTINGS_MODULE=config.settings.test_sqlite` → **286 passed, 2 skipped, 82 subtests passed** (دو تست همزمانی روی SQLite؛ CI با Postgres اجرا میشود).
- `ruff check .` → تمیز.
- `npm run typecheck` و `next build` → موفق.
- `npm run check` در `packages/ui` → **۵۴ تست** سبز.
- تستهای امنیتی جدید: رمز و بازنشانی زماندار، CSRF، قفل ادمین، لاگ رویدادها، برابر بودن جمع سفارش.

## ۵٫ محدودیتهای صادقانه
- Sentry و Uptime Kuma هنوز متصل نشدهاند (زیرساخت خارجی لازم است).
- CSP شامل `'unsafe-inline'` برای اسکریپت تم و هیدراسیون Next است؛ حذف آن نیازمند nonce است.
- اتصال درگاه پرداخت و SMS واقعی و اجرای Lighthouse روی استقرار نهایی خارج از کد است.
