# چرخش رازها و باطل کردن کلیدهای لو رفته

## اصل
هر راز لو رفته یا مشکوک باید **باطل** شود، نه فقط تغییر یابد. مقدار قدیمی حتی اگر در git حذف شود،
در تاریخچه و cacheها باقی میماند.

## مراحل
1. **تولید مقادیر جدید:** `bash scripts/rotate-secrets.sh` (فقط چاپ میکند، ذخیره نمیکند).
2. **بهروزرسانی محیط:** مقادیر را در Secret Manager یا `.env` سرور (gitignored) قرار دهید.
   - `SECRET_KEY`, `OTP_SECRET`, `METRICS_TOKEN`, `PAYMENT_CALLBACK_SECRET`,
     `SMS_HTTP_TOKEN`, `PAYMENT_API_KEY`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`.
3. **باطل سازی در ارائهدهندگان:** کلید قدیمی درگاه پرداخت و سرویس SMS را از پنل ارائهدهنده حذف/Revoked کنید.
   کلیدی که در سامانهٔ خارجی باطل نشود، با تغییر `.env` بیاثر نمیماند.
4. **راهاندازی مجدد:** `docker compose up -d --force-recreate api worker` و سپس
   `python manage.py check --deploy --fail-level WARNING`.
5. **باطل کردن نشستها و توکنها:** `python manage.py clearsessions` و `redis-cli FLUSHDB`
   (کش shared شامل فاستها هم پاک میشود و دوباره پر میگردد).
6. **ثبت حادثه:** زمان، رازها، علت و اقدامات را در `docs/SECURITY-AUDIT-REPORT-FA.md` اضافه کنید.

## جستوجوی رازهای لو رفته
```bash
python scripts/security_scan.py --root . --git
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect \
  --source /repo --config /repo/.gitleaks.toml --redact --exit-code 1
```
نتیجهٔ اجرا روی این تحویل: بدون یافته در پروژهٔ `digital-shopping-final` (فاقد تاریخچهٔ git)؛
یافتههای مربوط به مخزن جداگانهٔ workspace در گزارش امنیتی مستند شدهاند.
مقادیر ثابت و غیرحقیقی تعریفشده در `backend-ci.yml` (و الگوی `ci-only-*`) بهطور صریح در
`.gitleaks.toml` مجازاند؛ راز واقعی هرگز نباید به این allowlist اضافه شود.
گیرندههای هشدار (`SLACK_WEBHOOK_URL`، اعتبار SMTP) نیز هنگام چرخش رازها باید در محیط اجرا بهروز شوند.

## پیشگیری
- `.env` و `.env.*`gitignoredاند؛ فقط `.env.example` با مقادیر `change-me` کامیت میشود.
- CI با `fetch-depth: 0` تمام تاریخچه را اسکن میکند.
- `prod.py` و `apps/core/checks.py` از راهاندازی با رازهای کوتاه/placeholder جلوگیری میکنند.
