# گزارش آنالیز جامع و موشکافی پروژه — Digital Shopping
**تاریخ:** ۲۶ نوامبر ۲۰۲۶ · **دامنه:** بکاند Django، فرانت Next.js، بستهٔ طراحی UI، مستندات، CI/CD، عملیات و داده
**روش:** خواندن مستقیم کد و اجرای تستها — نه صرفاً اتکا به مستندات پروژه.

---

## ۰. خلاصهٔ اجرایی

| شاخص | مقدار |
|---|---|
| اپلیکیشنهای بکاند | ۷ (`core, accounts, catalog, pricing, orders, cart, payments`) |
| مسیرهای API مستندشده | ۳۹ مسیر در `contracts/openapi.json` |
| محصولات کاتالوگ | ۲۸ محصول / ۵۱ تصویر |
| تست بکاند | **۲۸۶ passing · ۲ skipped** (همزمانی روی SQLite) |
| تست UI | **۵۴ unit/SSR · ۲۶ E2E پیشنمایش · ۳ E2E وب** |
| دیکشنری زبان | ۲۴۰ کلید fa / ۲۴۰ کلید en |
| تمها | ۸ تم (۶ کهکشانی + کاغذ + شب) |
| وضعیت کلی | **آمادهٔ نمایش و خرید آزمایشی — آمادهٔ انتشار تجاری نیست** |

**حکم نهایی:** پروژه از نظر محصول و تجربهٔ کاربری حدود **۷۰–۷۵٪** و از نظر **آمادگی عملیاتی/تجاری حدود ۴۰–۵۰٪** تکمیل است. تمام قابلیتهای اصلی فروشگاه وجود دارند و تستها سبزاند، اما **استقرار خودکار کار نمیکند، مجوز ۴۹ تصویر از ۵۱ تصویر ثبت نشده، نمایش انگلیسی ناقص است، و پرداخت/SMS/مانیتورینگ/پشتیبان واقعی وجود ندارند.** قبل از انتشار باید موارد P0 و P1 رفع شوند.

---

## ۱. نقشهٔ وضعیت: تکمیل / ناقص / اجرانشده

| حوزه | ✅ کاملاً تکمیلشده | ⚠️ ناقص / نیمهاجرا | ❌ اجرانشده |
|---|---|---|---|
| **کاتالوگ** | مدلها، فیلتر/فاست/جستجو، پیشنهاد، محصولات مرتبط， نظرات، علاقهمندی، تاریخچهٔ قیمت (خواندن) | نویسندهٔ تاریخچهٔ قیمت، جزئیات مجوز تصاویر، کش فاستها | جستجوی هوشمند/Meilisearch |
| **سبد و سفارش** | سبد مهمان+کاربر، ادغام، کوپن، موجودی ledger، idempotency، لغو و مرجوعی | خرید variant، بررسی hidden brand هنگام سفارش، Shipment | — |
| **پرداخت** | شروع پرداخت، callback، idempotency، reconciliation، refund محلی | refund واقعی gateway | درگاه واقعی (فقط adapter نمونه) |
| **احراز هویت** | OTP،(session cookie)، رمز عبور، آدرسها، CSRF، محدودیت نرخ | 2FA ادمین | SMS واقعی (Console/Recording) |
| **اعلانها** | in-app، خواندن تکی/همه | push/email/sms فقط `pending` | ارسال واقعی کانالها |
| **دوزبانگی** | ۲۴۰ کلید fa/en، کوکی زبان، lang/dir سمت سرور | GlobalTranslator مبتنی بر DOM، اعداد/تومان/تاریخ فارسی در en | ترجمهٔ واقعی تمام کامپوننتها |
| **طراحی و تمها** | ۸ تم، توکنها، GSAP cosmic، design system، لوگوی Nexus | تناقض «بدون blur/gradient» با CSS واقعی، system unreachable | — |
| **صفحات وب** | ۱۷ مسیر عملیاتی، PDP کامل، چکاوت ۴ مرحلهای، حساب کاربری | جستجو در موبایل، h1 خانه، ARIA برخی ویجتها | — |
| **تست** | ۲۸۶ بکاند + ۵۴ UI + ۲۶ preview + ۳ E2E | E2E وب فقط ۳ سناریو و قدیمی، تست عملیات/Redis/SMS | تست بارچکاوت، Lighthouse اجراشده |
| **CI/CD** | ۵ workflow، ruff/tsc/build/coverage/security | هدف E2E/Lighthouse، Duplicate YAML key | deploy سالم ❌ |
| **مانیتورینگ** | Prometheus/Grafana/Alertmanager، ۱۰ متریک، ۸ هشدار | گیرندهها example.com، لینکهای runbook شکسته | Sentry/APM/RUM |
| **پشتیبانگیری** | اسکریپت backup/restore | بدون زمانبندی، بدون offsite، بدون تمرین بازیابی | — |
| **حقوقی/مجوز** | hidden brand، بررسی کیفیت داده | ۴۹/۵۱ عکس بدون مجوز،قیمت تقریبی | LICENSE/NOTICE پروژه |

---

## ۲. آنچه کاملاً تکمیل و قابل اتکاست

### بکاند
- **امنیت:** OTP با HMAC، `compare_digest`، محدودیت ۶۰ ثانیه/۵ در ساعت/۲۰ IP، session rotation، CSRF بر تمام درخواستهای غیر امن API، CORS allowlist، AdminGuard CIDR، لاگ ساختاریافذ بدون PII، چکهای fail-closed prod (E001–E031).
- **سفارش:** `place_order` اتمیک با row locks، idempotency + fingerprint، کوپن با قفل، ledger موجودی، VAT ۱۰٪، انقضای ۱۵ دقیقهای، لغو و بازگشت موجودی.
- **داده:** `validate_catalog`، import_idempotent با `--dry-run`، تشخیص قیمت کهنه (۷ روز)،hidden-brand در خروجی عمومی، آپدیت امن نرخ ارز (guard ۲۰٪).
- **قرارداد API:** مقایسهٔ خودکار schema تولیدشده Ninja با `contracts/openapi.json` در تستها.

### فرانتاند
- ۱۷ مسیر از جمله خانهٔ ۱۲ بخشی، PLP با فاستها و URL-state، PDP با گالری/تبها/JSON-LD، چکاوت ۴ مرحلهای، سبد شفاف، مقایسه، علاقهمندی، بازگشت، اعلانها، فراموشی رمز.
- ۸ تمthat از `data-theme` پیروی میکنند، GSAP background، لوگوی SVG متحرک Nexus، PWA نصب/آفلاین، A/B cookies.
- دسترسپذیری پایه قوی: skip link، focus ring، reduced-motion، logical properties، `<bdi>`، dialog focus trap.

###506 تست
- بکاند ۲۸۶ تست سبز + `ruff` تمیز؛ UI ۵۴ تست + ۲۶ تست مرورگر؛ `tsc` و `next build` موفق.

---

## ۳. نواقص و عیوب موجود (اولویتبندی شده)

### 🔴 P0 — بحرانی؛ مانع انتشار

| # | مشکل | شواهد | اثر |
|---|---|---|---|
| P0-1 | `deploy.yml` به عنوان نوشته‌شده کار نمیکند: `DEPLOY_DIR` درRemote الزامی است ولی ارسال نمیشود؛ `GITHUB_SHA` به علت quoted heredoc بهremote نمیرسد؛ «rollback» همان `up -d` مجدد است | `.github/workflows/deploy.yml:33-61` | استقرار شکست میخورد و بازگشت وجود ندارد |
| P0-2 | `REQUIRE_IMAGE_LICENSE=True` در prod در حالی که فقط ۲ از ۵۱ عکس مجوز دارند → اکثر محصولات هنگام import به DRAFT تنزل میکنند | `config/settings/prod.py:48`, `import_catalog.py:94-96`, `real-catalog.json` | کاتالوگ تقریباً خالی در محیط واقعی |
| P0-3 | api در compose بدون `RUN_MIGRATIONS=0` است و deploy دوبار migrate میکند؛ قبل از migrate پشتیبان وبازگشت وجود ندارد | `docker-compose.yml:32-44`, `entrypoint.sh:4-6`, `deploy.yml:40` | ریسک خرابی دیتابیس در استقرار |
| P0-4 | کلید کش فاستها فیلترهای `ram_gte/storage_gte/spec/in_stock/on_sale` را نادیده میگیرد | `apps/catalog/api.py:276-282` | شمارش فاستها تا ۶۰ ثانیه اشتباه است |
| P0-5 | Idempotency سفارش نسبت به حروف کوپن حساس است: `save10` → retry همان `save10` = 409 | `apps/orders/services.py:133,195,236` | مشتری هنگامتلاش مجدد پرداخت خطا میگیرد |
| P0-6 | صفحهٔ خانه هیچ `<h1>` ندارد در حالی که E2E انتظار آن را دارد | `app/page.tsx`, `e2e/golden-path.spec.ts:41` | SEO و تست شکسته |

### 🟠 P1 — بالا

**دوزبانگی (بزرگترین نقص تجربی):**
- `LocaleProvider` پیشفرض `"fa"` دارد → کاربر EN ابتدا فارسی میبیند (`.components/locale-provider.tsx:15`).
- `GlobalTranslator` کل DOM را پیمایش و mutate میکند؛ رشتههای کوتاه (رم، حافظه…) ترجمه نمیشوند و ترکیبها خراب میشوند (`Searchی کالا`).
- `formatToman()` همیشه «تومان»، `toFaDigits()` همیشه اعداد فارسی، و تاریخها `fa-IR` — حالت EN Still فارسی است (`packages/ui/src/lib/format.ts`, `account/orders:19`, `notifications:46`, `returns:58`).
- مناطق کاملاً هاردکد: `checkout-flow.tsx` (تقریباً تمام متنها)، `order-view.tsx`، `review-form.tsx`، صفحات account، auth، `/design`.

**بکاند:**
- برند مخفی در `place_order` بررسی نمیشود و مقایسهٔ brand در import case-sensitive است (`orders/services.py:157-175`, `import_catalog.py:75`).
- نویسندهٔ `PriceHistory` وجود ندارد → نمودار قیمت خالی است (`catalog/api.py:371-385`).
- `Shipment` فقط در ادمین است؛ timeline ارسال backend ندارد.
- تنها اعلان in-app کار میکند؛ push/email/sms nunca ارسال نمیشوند.
- refund فقط وضعیت محلی را عوض میکند؛ فراخوان gateway وجود ندارد.
- `verify_order_totals` هزینهٔ حمل ذخیرهشده را بدون برابر với `rate_used/shipping_code` میپذیرد → دستکاری هماهنگ_pass میکند (`orders/services.py:261-279`).
- حد نرخ با LocMem و ۳ worker ضرب میشود (`Dockerfile:17`).

**عملیات:**
- Alertmanager به `hooks.example.com` ارسال میکند؛ تمام `runbook_url` لینکها و anchorها شکستهاند.
- اسکریپت پشتیبان بدون زمانبندی/offsite/تمرین بازیابی؛ RPO «۱۵ دقیقه» با پشتیبان روزانه تناقض دارد.
- بدون Sentry/APM/analytics؛ لودتست فقط GET و بدون چکاوت، اجراشده هم نیست.

**اسناد:**
- README و PHASE-* قدیمی و متناقض با CHANGELOG؛ CHANGELOG بدون تاریخ/نسخه و دارای اعداد نادرست (۲۸۶ در مقابل ۲۸۲، «۲۰ سناریو E2E» در حالی که ۳ سناریو، «تخفیف ۵–۱۰٪» در حالی که ۳–۱۰٪).
- مسیرهای nonexistent: `docs/PRINCIPLES.md`, `CODEX-SHOPPING-DEEP-REVIEW-FA.md`, `contracts/openapi.yaml`.

### 🟡 P2 — متوسط

| مشکل | شواهد |
|---|---|
| Variantها فقط نمایشیاند؛ `variant_id` در سبد/سفارش و کاهش موجودی variant وجود ندارد | `cart/models.py`, `orders/services.py:157-175` |
| جستجو در موبایل غایب است (`.site-header__nav { display:none }` و Sheet فاقد SearchBox) | `enhancements.css:253`, `site-header.tsx:75-97` |
| بنر بروزرسانی PWA dead code است (`codex:sw-update` توسط sw.js ارسال نمیشود) | `pwa-tools.tsx:24`, `public/sw.js` |
| SEO: `openGraph.locale=fa_IR` ثابت، fallback localhost، JSON-LD price=0، بدون canonical/hreflang | `layout.tsx:20,31`, `products/[slug]/page.tsx:70` |
| انیمیشن GSAP `prefers-reduced-motion` را نادیده میگیرد | `cosmic-backdrop.tsx:23-33` |
| ARIA ناقص: gallery tabs بدون tabpanel/ keyboard، search listbox بدون active-descendant | `components/gallery.tsx`, `search-box.tsx` |
| Promise rejectionهای handleنشده در store و آدرسها | `providers.tsx:70-79`, `account/addresses:31-56` |
| پیشنمایش UI قدیمی است (رنگ `#141517` در مقابل `#0B1020`)؛ ۲۶ تست روی اسنپشمولد قدیمی | `preview/design-system.html`, `tokens.css` |
| `REDIS_PASSWORD` چرخانده میشود ولی Redis بدون requirepass است | `rotate-secrets.sh:17`, `docker-compose.yml:19-30` |
| Dockerfile وب از `npm install`به جای `npm ci` و بدون کاربر غیر root | `apps/web/Dockerfile:7,18-29` |
| CI وب E2E/Lighthouse احتمالاً :8000 را هدف میگیرد در حالی که mock روی :4000 است | `web-ci.yml:14,40-42`, `playwright.config.ts` |
| بدون LICENSE/NOTICE پروژه؛ متن OFL فونتها shipping نمیشود | ریشهٔ پروژه، `packages/ui/fonts/README.md` |
| `gap: -2rem` نامعتبر و تناقض با قرارداد «بدون blur/gradient/shadow» | `enhancements.css:184`, `design/page.tsx:21` |
| `JSON.parse` بدون محافظت در client api | `lib/api.ts:33-46` |
| تاریخچهٔ گیت ندارد → ادعای gitleaks قابل بازرسی نیست | پوشهٔ تحویل |

### ⚪ P3 — کم/زیباسازی
- شمارش wishlist شامل محصولات مخفی است (`catalog/api.py:498-505`).
- مقایسهٔ token متریک با `!=`به جای `compare_digest` (`core/api.py:32-36`).
- کد خطاها گاهی متن فارسی است نه کد ساختاریافته (`pricing/api.py`, `catalog/api.py`).
- detector `_bad()` میتواند secret معتبر را رد کند (`core/checks.py:13`).

---

## ۴. پیشنهادها و راهحلها

### ۴.۱ برنامهٔ رفع نواقص (۴ هفته)

**هفته ۱ — رفع P0 (Go/No-Go):**
1. `deploy.yml`: ارسال `DEPLOY_DIR` به remote، export `GITHUB_SHA`، checkout آخرین SHA سالم در rollback + backup قبل migrate + health/web smoke.
2. ایجاد **Image Rights Register** (`overlay/data/image-rights.json`) و پر کردن license/source_for ۴۹ عکس یا تنظیم `REQUIRE_IMAGE_LICENSE=False` موقت + Plan برای اخذ مجوز.
3. `RUN_MIGRATIONS=0` برای `api` در compose و حذف migrate اضافی در deploy.
4. اصلاح cache key فاستها با هش کامل `filters.model_dump()`.
5. نرمالسازی کوپن (`coupon_code.strip().upper()`) در `replay_for` و تست رگرسیون.
6. اضافه کردن `<h1>` به خانه و بهروزرسانی E2E.

**هفته ۲ — دوزبانگی واقعی:**
- `LocaleProvider` مقدار اولیه را از `<html lang>` بخواند.
- حذف تدریجی `GlobalTranslator` و جایگزینی با `t()` در تمام کامپوننتها (شروع از `checkout-flow`, `account/*`, `order-view`).
- `formatToman/formatUsd/toFaDigits` با پارامتر locale؛ اعداد لاتین و «IRR/Toman» در EN؛ `Intl.DateTimeFormat("en-IR")`.
- تست E2E EN کامل.

**هفته ۳ — عملیات:**
- گیرندهٔ واقعی Alertmanager + اصلاح runbook_url و anchorها.
- زمانبدی پشتیبان (systemd timer / cronjob compose) + offsite + تمرین بازیابی.
- نصب Sentry (backend + frontend) و analytics.
- گسترش k6 به مسیر چکاوت و ثبت baseline.

**هفته ۴ — اسناد و حقوقی:**
- بازنویسی README/PHASE-* و CHANGELOG با تاریخ و نسخهها.
- LICENSE + NOTICE + متن OFL فونتها + فهرست حقوق تصاویر.
- رفع CI (npm ci, non-root, E2E target, duplicate key, gitleaks allowlist).
- چکلیست انتشار با مسئول و تاریخ.

### ۴.۲ ایدهها و قابلیتهای پیشنهادی (رشد محصول)

| ایده | ارزش | وضعیت فعلی که از آن شروع میشود |
|---|---|---|
| **موتور شفافیت قیمت (Price Truth Engine)** | تمایز اصلی برند | نمودار تاریخچهٔ قیمت + فیلد `price_checked_on` |
| هشدار کاهش قیمت و اشتراک محصول | retention و بازگشت کاربر | Notification الگوی موجود |
| امتیاز «صداقت آگهی» (قیمت تازه، مجوز عکس، مشخصات کامل) | اعتماد و SEO | `problems_for_publish`, `report_data_quality` |
| خرید variant واقعی + موجودی جداگانه |Increase conversion | مدل Variant و endpoint لیست |
| timeline ارسال + webhook حامل | کاهش تماس پشتیبانی | مدل Shipment |
| جستجوی فارسی هوشمند (Meilisearch/FTS + synonym) | یافتن کالا | `/catalog/suggest` |
| دستیار مقایسهٔ (مشخصات → توصیه) | تجربهٔ متمایز | CompareTable + spec data |
| لینک اشتراک علاقهمندی/مقایسه | viral loop | localStorage compare |
| کوپن/وفاداری و cashback |Repeat purchase | Coupon/CouponUse |
| PWA نصبپذیر کامل (PNG icons, offline cart) | موبایل | SW + manifest |
| Analytics funnel + A/B واقعی | تصمیمگیریdata | A/B cookies موجود |
| داشبورد کیفیت محتوا در ادمین | کاهش خطای اپراتور | admin filters |
| CDN/Image optimization و حذف blur اضافی | Lighthouse ≥90 | next/image + GSAP |

### ۴.۳ بهترین ایدهٔ واحد: «موتور شفافیت قیمت»

چرا: دقیقاً همان وعدهای است که برند بر آن تکیه دارد («تکنولوژی اصیل، قیمتی شفاف») و از داراییهای موجود استفاده میکند.

اجزا:
1. **نویسندهٔ تاریخچه:** `import_catalog` قبل از آپدیت قیمت، ردیف `PriceHistory` اضافه کند؛ job روزانه prices را اسNAPSHOT کند.
2. **هشدارprice:** کاربر روی محصول «به من خبر بده» بزند؛ کانال in-app + email (پس از رفع P1)؛ trigger هنگام کاهش ≥۵٪.
3. **نشان صداقت): ** badge با ۳ معیار (تازگی قیمت، مجوز تصویر، کامل بودن مشخصات) در کارت و PDP.
4. **API عمومی/ویجت:** `GET /catalog/products/{slug}/truth-score` برای نمایش در سایتهای مقایسه و افزونهٔ مرورگر.

مراحل: ۲ هفته بکاند + ۱ هفته UI + ۱ هفته تست/مستندات.

---

## ۵. چکلیست انتشار (Go / No-Go)

| معیار | وضعیت |
|---|---|
| تستها سبز | ✅ |
| deploy سالم و rollback واقعی | ❌ |
| مجوز تصاویر کامل | ❌ |
| migrate با پشتیبان و بدون auto-migrate | ❌ |
| EN بدون رشته فارسی | ❌ |
| هشدارها به مقصد واقعی | ❌ |
| پشتیبان زمانبندیشده و تمرینشده | ❌ |
| Sentry/Analytics | ❌ |
| لودتست چکاوت | ❌ |
| LICENSE/NOTICE | ❌ |

**نتیجه:** هنوز **No-Go** برای تولید. پس از اتمام هفتهٔ ۱–۳ میتوان/staging و سپس انتشار تدریجی اقدام کرد.

---

## ۶. نتیجهٔ نهایی

پروژه یک فروشگاه دیجیتال **بسیار قوی از نظر محصول و طراحی** است: تمام صفحات، سفارش، پرداخت sandbox، دوزبانگی پایه، ۸ تم، تستهای گسترده و امنیت خوب وجود دارد. مشکل اصلی **نه در «ساخته نشدن»، بلکه در «کامل نشدن لایهٔ عملیات و انسجام» است**: استقرار شکسته، مجوزها نامشخص، انگلیسی ناقص، و ابزارهای مشاهده/پشتیبان فقط-configاند. با اجرای چهار هفته فوق، پروژه از «دموی عالی» به «محصول قابل انتشار» تبدیل میشود؛ و با موتور شفافیتprice میشود یک مزیت رقابتیreal.
