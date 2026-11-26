# سیاست امنیتی و چک لیست استقرار امن

## اصول
1. ** fail-closed**: هر تنظیمی که در محیط تولید ناامن است، باید از بارگذاری settings جلوگیری کند (نمونه: `ConsoleSms`).
2. **کمترین امتیاز**: worker و web تنها به آنچه نیاز دارند دسترسی دارند.
3. **منبع حقیقت سمت سرور**: قیمت، موجودی، مالیات و تخفیف هرگز از کلاینت باور نمیشود.
4. **هیچ PII در لاگ**: شماره موبایل و کد OTP نباید در لاگ، متریک یا خطا بماند.

## چک لیست قبل از استقرار
- [ ] `SECRET_KEY` تصادفی و حداقل ۵۰ کاراکتر.
- [ ] `OTP_SECRET` جدا از `SECRET_KEY` و تصادفی.
- [ ] `SMS_GATEWAY=apps.accounts.sms.HttpSms` و توکن معتبر.
- [ ] `SMS_SEND_INLINE=false` و worker در حال کار.
- [ ] `DEBUG=false`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` دقیقاً تنظیم شدهاند.
- [ ] `python manage.py check --deploy --fail-level WARNING` بدون خطا.
- [ ] `python manage.py migrate --check` و تمام migrationها کامیتاند.
- [ ] migrationها در CI با `makemigrations --check --dry-run` تأییداند.
- [ ] HTTPS + HSTS + هدرهای امنیتی در Caddy فعال.
- [ ] `/admin/` محدود به IP مجاز و ترجیحاً ۲FA.
- [ ] اسکن secret (gitleaks) و وابستگیها (pip-audit / npm audit) سبز؛ تنها مقادیر آزمایشی CI در `.gitleaks.toml` مجازاند.
- [ ] مقادیر واقعی `ALERT_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` / `EMAIL_TO` فقط در محیط اجرا تنظیم شدهاند (`ops/monitoring/README.md`).
- [ ] بکاپ خودکار + تست بازیابی.
- [ ] هشدار (line/pager) برای خطاهای ۵xx و افت پرداخت تنظیم شود.
- [ ] CSP و X-Frame-Options و COOP/CORP در Caddy و Next فعالاند.
- [ ] `/api/v1/metrics` از بیرون Caddy مسدود و با `METRICS_TOKEN` محافظت میشود.
- [ ] تمام نوشتارهای API (جمله سبد مهمان) دارای توکن CSRFاند (`ApiCsrfMiddleware`).
- [ ] محدودیت نرخ `/auth/otp/*` و `/auth/password/*` فعال و لاگ رویدادهای مشکوک جریان دارد.
- [ ] رمز عبور تنها با `set_password()` هش میشود و لینک بازنشانی ≤ ۱۵ دقیقه اعتبار دارد.
- [ ] `python scripts/security_scan.py --root . --git` و `scripts/rotate-secrets.sh` اجرا و نتایج ثبت شدند.

## گزارش آسیبپذیری
لطفاً جزئیات را به آدرس امنیتی پروژه ارسال کنید. از ثبت عمومی جزئیات قابل بهرهبرداری خودداری شود.
