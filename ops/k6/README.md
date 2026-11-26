# تست بار با k6

نصب: `k6` را از https://k6.io/docs/get-started/installation/ نصب کنید (یا `docker run --rm -i grafana/k6 run - < ops/k6/load.js`).

## بار خواندنی (پیشفرض، بدون راز)
```bash
API_BASE_URL=http://localhost:8000/api/v1 k6 run ops/k6/load.js
```
سناریو: ۲۰ → ۱۰۰ VU، بررسی `/catalog/products`، `/catalog/categories` و `/health`.
آستانهها: p95 < 1500ms، نرخ خطا < ۲٪، نرخ موفقیت چکها > ۹۵٪.

## مسیر خرید sandbox (اختیاری)
برای اندازهگیری کامل «سبد → سفارش → پرداخت» نیاز به نشست کاربر است. این نشست متعلق به یک حساب آزمایشی
روی staging/sandbox است و «راز تولید» محسوب نمیشود؛ هیچ کلید درگاه یا SMS واقعی لازم نیست.

1. محیط sandbox را با تنظیمات آزمایشی بالا بیاورید: `PAYMENT_GATEWAY=fake`, `PAYMENT_SANDBOX=True`,
   `SMS_GATEWAY=apps.accounts.sms.ConsoleSms`, `FAKE_GATEWAY_SCENARIO=success` و نرخ ارز معتبر (`make set-rate`).
2. یک بار با curl وارد شوید و کد OTP چاپشده در لاگ worker/ConsoleSms را بخوانید:
   ```bash
   curl -c /tmp/k6-cookies -b /tmp/k6-cookies -X POST "$API/auth/otp/request" \
     -H 'Content-Type: application/json' -d '{"phone":"09123456789"}'
   curl -c /tmp/k6-cookies -b /tmp/k6-cookies -X POST "$API/auth/otp/verify" \
     -H 'Content-Type: application/json' -d '{"phone":"09123456789","code":"<کد چاپشده>"}'
   ```
3. مقادیر کوکی نشست و توکن CSRF را از پاسخ مرحلهٔ دوم (`csrf_token`) و فایل کوکی بگیرید و به k6 بدهید:
   ```bash
   K6_CHECKOUT=1 K6_SESSION_COOKIE="<sessionid>" K6_CSRF_TOKEN="<csrf_token>" \
     API_BASE_URL=http://localhost:8000/api/v1 k6 run ops/k6/load.js
   ```

در هر تکرار: خواندن `csrf`، انتخاب اولین کالا، `PUT /cart/items/{slug}`، `POST /addresses`،
`POST /orders` (با `Idempotency-Key` تصادفی)، `POST /orders/{number}/pay` با سناریوی `success`،
سپس دنبال کردن `redirect_url` به callback درگاه fake. تمام نوشتارها با هدر `X-CSRFToken` و کوکی نشست محافظت میشوند.
اگر `K6_SESSION_COOKIE` تنظیم نشده باشد و `K6_CHECKOUT=1` باشد، اسکریپت با خطای صریح متوقف میشود.

> هشدار: این سناریو سفارش واقعی در دیتابیس sandbox ایجاد میکند. آن را روی production اجرا نکنید.
