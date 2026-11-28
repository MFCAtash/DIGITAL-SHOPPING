# تغییرات

## [2026.11.28] — ویدیو معرفی، چیدمان استقرار و پاک‌سازی نهایی

- **ویدیو معرفی ۱:۴۸:** نسخهٔ ۱۰۸۰p (۱۵٫۴MB)، ۷۲۰p (۸٫۱MB)، پوستر، پیشنمایش متحرک WebP، اسکریت پیشنمایش نوار پیشروی و ترک فصلها در `docs/media/`؛ پیشنمایش متحرک در بالای README، پلیر کامل `docs/watch.html` و پلیر توکار هاب بصری با فصلبندی، سرعت، کیفیت، تمامصفحه، تصویر در تصویر و میانبرها.
- **استقرار:** `docker-compose.yml` به ریشهٔ مخزن منتقل شد تا `deploy.yml` بدون `-f` آن را پیدا کند؛ مسیرهای build/volume اصلاح و `.dockerignore` ریشه و بک‌اند اضافه شد.
- **استاتیک تولید:** entrypoint در زمان اجرا `collectstatic` را انجام می‌دهد و Caddy مسیر `/static/*` را به API می‌فرستد؛ پنل ادمین در production استایل‌دار می‌شود.
- **پاک‌سازی برند:** تمام شناسه‌های داخلی، متریک‌ها، کش، سرویس‌ورکر، پشتیبان‌ها و داشبوردها به `digital-shopping`/`digital_shopping` یکدست شدند؛ هیچ اشارهٔ برند قدیمی باقی نماند.
- **بهداشت وابستگی‌ها:** بازبینی هفتگی آسیب‌پذیری‌ها به گردش‌کار `security` اضافه شد؛ `dependency-review` و auditهای CI مرجع هستند.

## [2026.11.27] — تکمیل نهایی مخزن (دوزبانگی README، مجوز محافظت شده و اتوماسیون)

- **README دو زبانه:** بخش کامل انگلیسی پیش از بخش کامل فارسی، همراه سوییچ زبان، نمودارهای Mermaid معماری و چکاوت، جدول تصاویر، کارت کیفیت و لینک هاب زندهٔ Pages.
- **مجوز جدید:** لایسنس MIT به «Digital Shopping Source-Available v1.0» تغییر یافت — مخزن عمومی و فقط قابل مشاهده، بدون حق کپی/استفاده/انتشار. اسناد `LICENSE`، `NOTICE`، `docs/LEGAL.md` و تمام نشانها بهروز شدند.
- **گالری بصری:** ۱۰ اسکرینشات تولیدشده توسط Playwright (fa/en، سه تم، کاتالوگ، PDP، چکاوت، موبایل و اعلان سبد) در `docs/screenshots/` + اسکریپت production-ready `scripts/capture-screenshots.mjs`.
- **تست دوزبانگی:** `scripts/check-i18n.mjs` با مرورگر واقعی، ۱۴ مسیر en را بدون هیچ متن فارسی تأیید میکند و در `web-ci` اجرا میشود. سه نشت واقعی زبان (عنوان فیلترها، تعدادها و توضیحاتmeta محصول) رفع شدند.
- **یکدستسازی برند:** تمام بسته‌ها زیر فضای نام واحد `@digital-shopping/*` یکدست شدند (۴۷ فایل + lockfileها) بدون شکست تستها.
- **اتوماسیون و امنیت:** گردشکارهای CodeQL، Dependency Review، lychee Link Check، OpenSSF Scorecard، GitHub Pages، Container Images (GHCR + SBOM + cosign) و Release Assets اضافه شدند؛ آپلود Codecov و دوازده topics/GitHub Discussions/Ruleset برای `main` پیکربندی شدند.
- **نظم اسناد:** شش فایل کارگاهی از ریشه به `docs/internal/` منتقل، `docs/REPO-MAP.md`، `docs/IMAGE-RIGHTS.md`، `docs/index.html` و `docs/api.html` اضافه شدند.
- **جامعه:** برچسبهای Issue، سه مسئلهٔ «good first issue» و ادغام دو PR سبز automated dependency updates.
- **انتشار:** نسخهٔ `v1.0.0` با کاورها و پوسترها بهعنوان Asset بهروز شد.

## [2026.11.27] — انتشار عمومی در GitHub

- مخزن عمومی **`MFCAtash/DIGITAL-SHOPPING`** ساخته و کل تاریخچه (۶۱۱ فایل) به شاخهٔ `main` منتقل شد.
- هر چهار گردش‌کار CI روی `main` سبز شدند: **backend-ci** (۳۱۱ تست + گیت پوشش ۹۳٪ منطق پول)، **ui-ci** (۵۴ تست)، **web-ci** (typecheck، build، E2E و Lighthouse) و **security** (gitleaks + pip/npm audit).
- دسترس‌پذیری **۱۰۰** در Lighthouse برای `/`، `/products`، `/cart` و `/account`: ترتیب صحیح سرتیترها در فهرست کالا، نام دسترس‌پذیر سازگار با متن دیده‌شده برای برند/زبان/سبد، و حذف `aria-label` از عناصر عمومی.
- کاور **Nebula Hero** و نشان‌های CI در README نصب شدند؛ راهنمای `docs/GITHUB-SETUP.md` با آدرس واقعی مخزن به‌روز شد.
- automated dependency updates با گروه‌بندی و سقف PR بازنویسی شد تا فهرست Pull Requestها خوانا بماند و ارتقاهای سراسری فریم‌ورک دستی انجام شوند.

## [2026.11.26] — نسخهٔ تحویل (همراستاسازی اسناد، CI و عملیات)

### کاور رسمی GitHub (انتخاب ۲۷ نوامبر ۲۰۲۶)
- پنج کاور ۱۲۰۰×۶۳۰ طراحی و بصورت بصری مقایسه شدند؛ **Nebula Hero** توسط کاربر بهعنوان بهترین و شیکترین گزینه انتخاب شد.
- فایلهای نهایی: `docs/github-posters/cover.svg`، `cover.png` (۱۲۰۰×۶۳۰) و `cover@2x.png` (۲۴۰۰×۱۲۶۰)؛ گالری کامل در `docs/github-posters/index.html`.
- کاور در بالای README و بهعنوان Open Graph تصویر (`apps/web/public/og-cover.png` + metadata در `layout.tsx`) نصب شد.

### بستهٔ نهایی رفع نواقص (همان روز)
- **بکاند/Deploy:** `deploy.yml` با پشتیبان قبل از migrate، یک بار migrate، بررسی سلامت API و وب و rollback واقعی به SHA سالم؛ `RUN_MIGRATIONS=0` در compose، Redis با رمز، worker heartbeat.
- **داده:** دفتر حقوق عکسها (`overlay/data/image-rights.json`) با ۵۱ ورودی صادقانه (۴۹ `needs-review` و ۲ متعلق به کاربر)، فیلد `rights_status`، دستورهای `report_image_rights` و `snapshot_prices`، ثبت خودکار price در import، نام انگلیسی دستهبندیها و بررسی برند مخفی در سفارش.
- **رفع باگها:** کلید کش فاستها شامل تمام فیلترها، idempotency کوپن بدون حساسیت به حروف، `compare_digest` برای توکن متریک، بررسی نرخ ارز در ادمین، refund واقعی gateway، ارسال دورهای اعلانها، shipment سرویسپذیر، نویسندهٔ history قیمت.
- **دوزبانگی:** `PriceTag`، `ProductCard` و نمودار تاریخچهٔ قیمت با پارامتر `locale` — اعداد لاتین، «IRR»، «From/Approx./% off/Previous price» در en؛ `LocaleProvider` از `<html lang>`؛ ترجمهٔ ۱۵۰ کلید جدید و تست E2E=en.
- **تجربه:** اعلان ویژهٔ «افزودن به سبد» با گرادینت Aurora، تصویر محصول، نام/برند/تعداد/قیمت، دکمهٔ «مشاهدهٔ سبد» و بستهشدن خودکار؛ جستجو در موبایل، هدف E2E=Lighthouse، reduced-motion، ARIA و Metadata/SEO.

### نتیجهٔ بازبینی نهایی
- **۱۴ صفحه** در حالت en (`/`, products, PDP, cart, checkout, account و subpages, compare, design, forgot-password) بدون **هیچ کاراکتر فارسی** تأیید شد؛ حالت fa با RTL و ۲۷۲۳ کاراکتر فارسی سالم است.
- تست نهایی: بکاند **۳۱۱ passing + ۲ skipped**، UI **۵۴**، `ruff` / `tsc` / `next build` موفق، تمام مسیرها HTTP 200 و سلامت بکاند `ok`.

### وضعیت راستیآزمایی (اعداد معتبر)
- بکاند: **۳۱۱ تست Passed + ۲ Skipped** (دو تست همزمانی روی SQLite؛ CI با Postgres اجرا میکند) و ۸۲ subtests.
- رابط کاربری: **۵۴ تست unit/SSR** در `packages/ui`، **۲۶ تست E2E** پیشنمایش و **۴ تست E2E** وب.
- قرارداد: **۳۹ مسیر** در `contracts/openapi.json`؛ کاتالوگ: **۲۸ محصول**؛ تمها: **۶ تم کهکشانی + کاغذ گرم/شب مخملی**.

### مستندات
- README تنها مرجع وضعیت شد؛ شمار تستها، فازها، مسیر اسناد و متغیرهای محیطی بهروز شدند.
- اسناد وضعیت فازها با برچسب HISTORICAL مشخص شدند و لینکهای به فایلهای وجود نداشته حذف شدند.
- `docs/SLO.md`، `docs/RUNBOOK.md`، امنیت و چرخش رازها با پیکربندی واقعی همراستا شدند؛
  لنگرهای Runbook توسط هشدارها استفاده میشوند و آستانهٔ p95 همان ۸۰۰ms SLO است.
- مجوز MIT (`LICENSE`)، `NOTICE`، مجوز OFL فونتها و خلاصهٔ منبع عکسها (`docs/ASSET-PROVENANCE.md`) اضافه شدند.

### CI و عملیات
- کلید تکراری `PAYMENT_CALLBACK_SECRET` در `backend-ci.yml` حذف و مقادیر ثابت CI در `.gitleaks.toml` مجاز شدند.
- `web-ci.yml`: API شبیهسازی شدهٔ پورت ۴۰۰۰ هنگام بیلد و اجرا بهطور یکسان تنظیم شد
  (rewrites در `next.config.mjs` در زمان بیلد ثبت میشود)؛ Lighthouse با همان API و
  بودجههای `apps/web/lighthouserc.json` اجرا میشود.
- اعلانها از طریق متغیرهای محیطی (`SLACK_WEBHOOK_URL`، `EMAIL_TO`) با پیشفرض بیخطر رندر میشوند
  (`ops/monitoring/render-alertmanager.sh`)؛ Runbookها به لنگرهای موجود میپردازند.
- زمانبند بکاپ ۱۵ دقیقهای (`ops/backup/backup-cron`) با رمزگذاری GPG و مقصد offsite اختیاراً و
  RPO ≤ ۱۵ دقیقه؛ مسیر خرید sandbox در `ops/k6/load.js` (`K6_CHECKOUT=1`).
- ایمیج وب با `npm ci` ساخته میشود و بهعنوان کاربر غیر root اجرا میگردد.
- توضیح `contracts/openapi.json` به جای `openapi.yaml` وجودنداشته، به خود فایل میپردازد.

### لوگوی جدید «حلقهٔ نکسوس» (مرحلهٔ ۱ تا ۷ تأییدشد)
- لوگوی جدید بر پایهٔ کانسپت B (Nexus Loop) با پالت Aurora (`#22D3EE → #6366F1 → #A855F7`)، هالهٔ ذرهای، تایپوگرافی دووزن (Digital ضخیم / Shopping نازک) و انیمیشن چرخش نور (۵ ثانیه) انتخاب شد.
- اعمال در هدر، فوتر، فاویکن/PWA و لودر صفحات؛ رنگ روبانها و هاله با ۶ تم کهکشانی سازگار است.
- مستندات کانسپت و پیشنمایش بصری: `docs/LOGO-CONCEPTS-2026-FA.md` و `docs/logo-concepts/{index,final-preview}.html`.

### دوزبانهسازی کامل و محصول GTA VI
- لایهٔ `GlobalTranslator` تمام رشتههای فارسی باقیمانده را هنگام انتخاب en ترجمه میکند؛ دیکشنری fa/en گسترده و صفحات/products/home/PDP زبان را در درخواست API ارسال میکنند. توضیحات انگلیسی محصولات توسط import_catalog تولید میشود.
- محصول **Grand Theft Auto VI — Global Edition** با قیمت جهانی **$69.99** و تخفیف **۳٪** اضافه شد (کد `grand-theft-auto-vi`).
- تصاویر نهایی دقیقاً همان دو عکسی که کاربر ارسال کرد (`images (1).jpg` بهعنوان جلد اصلی و `images.jpg` بهعنوان تصویر ترکیبی) بدون برش، چرخش یا تغییر نسبت نصب شدند. نسخهٔ HD با فیلتر Lanczos3 و unsharp-mask ملایم تهیه شد: جلد **۱۸۶۰×۲۶۳۶** و تصویر ترکیبی **۱۶۰۸×۲۰۰۸** (WebP کیفیت ۹۵، بدون subsample رنگ). نام فایلهها به `gta-vi-cover-hd.webp` / `gta-vi-collage-hd.webp` تغییر کرد تا هم کش قدیمی `next/image` باطل شود و هم بالاترین رزولوشن در srcset در دسترس باشد.

### منو و لوگوی انتخابشده
- منوی بالای صفحه به ترکیب **Pill Navigation + Glass Dock + Neon Serif** تغییر یافت: داک شیشهای با انعکاس نور، آیتمهای کپسولی و آیتم فعال با تایپوگرافی سریف درخشان.
- لوگوی بالای صفحه به **Diamond Halo** سهبعدی با هالهٔ دو رنگ، انعکاس و شناوری ملایم تغییر یافت.

### تخفیف بلک فرایدی و سبد شفاف
- تمام ۲۶ کالای دارای قیمت تخفیف **۵ تا ۱۰٪** بلک فرایدی گرفتند (`apply_black_friday_discounts` + بهروزرسانی `real-catalog.json`) و برچسب «BLACK FRIDAY · تخفیف ویژه» روی کارت و PDP نمایش داده میشود.
- خطوط سبد با برند، مشخصات فنی، قیمت قبل/بعد تخفیف، تخفیف بلک فرایدی، جمع خط و کنترل تعداد بصورت شفاف و مرتب نمایش داده میشوند.
- پیشنهادهای بصری منو (۵ مدل) و لوگو (۵ مدل) در `docs/header-logo-concepts.html` اراعه و منتظر انتخاب کاربراند.

### تم پیشفرض بنفش و رفع خطای افزودن به سبد
- تم پیشفرض به **Nebula Violet** تغییر یافت (`data-theme="nebula"` در `<html>` و اسکریپت پیش از رنگآمیزی)؛ حالتهای ذخیرهشده کاربر همچنان اعمال میشوند.
- علت خطای «افزودن به سبد ممکن نشد» شناسایی شد: درخواست PUT با 403 و دلیل `Origin checking failed - http://localhost:3100 does not match any trusted origins` رد میشد. `CSRF_TRUSTED_ORIGINS` و `CORS_ALLOWED_ORIGINS` در تنظیمات دمو برای پورت ۳۱۰۰ تکمیل و `FRONTEND_URL` به ۳۱۰۰ اصلاح شد.
- کلاینت API در صورت 403 `csrf_failed` یکبار توکن تازه گرفته و درخواست را تکرار میکند؛ تست مرورگر: PUT موفق (200).

### حذف پیامهای منفی و فعالسازی افزودن به سبد
- متنهای «قابل خرید نیست»، «قیمت تقریبی؛ قابل خرید نیست»، «قیمت ممکن است قدیمی باشد» و «فقط مشاهده» از کارت کالا، برچسب قیمت و هشدارهای سبد حذف شد.
- پرچم قدیمی `purchasable` دیگر مانع سبد یا سفارش نمیشود؛ تمام کالاهای فعال دارای قیمت قابل افزودناند.
- چیدمان PDP به بخشهای منظم (سربرند، پانل قیمت، توضیح، مشخصات کلیدی، خرید، گارانتی) بازطراحی و کارت کالا فشردهتر شد.

### یکدستسازی کاور
- تصاویر ۸ محصول به **ابعاد و object-fit یکسان** (`4/5`, contain) بدون چرخش/خمیدگی درآمدند؛ چیدمان ۴×۲ کاملاً صاف و مرتب است.
- پسزمینهٔ کاور به **آسمان کهکشانی یکپارچه** (gradient واحد آبی-بنفش + هاله و پرتو نور) تغییر یافت.
- دکمهٔ تغییر تم ۸ حالته علاوه بر هدر، بالای خود کاور هم قرار گرفت و دو دکمه با رویداد `cx:theme-change` هماهنگاند.

### کاور ترکیبی ۸ محصولی (انتخاب کاربر)
- کاور خانه به **۸ محصول واقعی** گسترش یافت: آیفون، سامسونگ، لپتاپ ROG، PlayStation، شیائومی، Legion، iPhone Air و POCO.
- چیدمان ترکیبی **Constellation + Prism Beams** با هالهٔ **Ocean Blue** و پرتوی **Rose Nebula** اعمال شد (`home-cover--hybrid`)؛ مسیرهای ناوبری بالای خانه حفظ شدند.

### کاور سهبعدی و منوی هماهنگ با تم
- **خانه:** متن بالای صفحه حذف و بهجای آن کاور بزرگ سهبعدی از محصولات واقعی (آیفون، سامسونگ گلکسی، لپتاپ ROG) با زمینهٔ درخشان هماهنگ با تم + ۶ مسیر ناوبری به sections قرار گرفت.
- **هدر:** دکمهٔ تغییر تم ۸ حالته دقیقاً کنار منوی دستهبندیها منتقل و منوی کشویی با پنل الهامگرفته از رنگ تم، چیدمان دوستونی و کارت ویژه بازطراحی شد.

### اجرای کامل تمهای کهکشانی و دوزبانهسازی
- **تمها:** تمام شش پوستهٔ کهکشانی (Nebula Violet، Aurora Mint، Solar Gold، Ocean Blue، Rose Nebula، Cosmic Silver) در `tokens.ts` اعمال، `tokens.css` تولید و چرخش دکمهٔ تم به ۸ پوسته گسترش یافت.
- **انیمیشن:** `gsap` + `ScrollTrigger` نصب و `components/cosmic-backdrop.tsx` با هالهها و ستارگان متحرک و پارالاکس اسکرول اضافه شد. تست کنتراست تمام ۸ تم سبز است.
- **زبان:** دیکشنری fa/en گسترش یافت، `LocaleProvider` و `useT` اضافه و صفحات خانه، فهرست، کالا، سبد، فوتر، حساب، مرجوعی و اعلانها به ترجمه متصل شدند؛ سوئیچ زبان `lang`، `dir` و کوکی را زنده بهروز میکند.
- **منو:** منوی کشویی هوشمند با Escape و کلیک بیرون و لینکهای سریع در هدر قرار گرفت.

### برند Digital Shopping، منوی هوشمند و تمهای کهکشانی
- **برند:** نام فروشگاه به **Digital Shopping** یکدست شد (metadata، عنوان، manifest، هدر، فوتر و صفحهٔ طراحی)؛ بخش قدیمی معرفی برند و چهار بند آن حذف شد؛ لوگوی Diamond در هدر بازطراحی شد.
- **منو:** منوی کشویی هوشمند دستهبندیها (`components/category-menu.tsx`) با بستن توسط Escape/کلیک بیرون، دسترسپذیری ARIA و لینکهای سریع اضافه شد؛ دکمهٔ تغییر تم در بالای هدر باقی ماند.
- **پیشنمایش بصری:** شش تم کهکشانی با هاله و پرتوی رنگی در `docs/galaxy-themes.html` و مستند `docs/GALAXY-THEMES-FA.md` اراعه شد؛ اکنون در `tokens.ts` اعمالاند.

### تمها و کمبودهای اولویت بالا
- **تمها:** پوستهٔ «شب مخملی» بهعنوان تم تیرهٔ انتخابشده در `tokens.ts` اعمال و `tokens.css` تولید شد؛ تمام جفتهای کنتراست با `npm run contrast` سبزاند.
- **مرجوعی:** `POST /orders/{number}/returns` و `GET /orders/returns`، سرویس `request_return` با مهلت ۷ روزه، تأیید/بازپرداخت ادمین همراه با بازگشت موجودی، `StockMovement` و AuditLog، صفحهٔ `/account/returns`.
- **اعلانها:** `GET /notifications`، علامت خواندهشده و خواندنهمه، اعلان خودکار هنگام پرداخت و درخواست مرجوعی، صفحهٔ `/account/notifications`.
- **قرارداد:** OpenAPI به ۳۹ مسیر بهروز شد؛ مجموعاً **۲۸۶ تست بکاند** Passed و ۲ Skipped.

### سختسازی امنیتی جامع
- **احراز هویت و رمز:** تنظیم/تغییر رمز با اعتبارسنجی سرور و هش PBKDF2؛ بازنشانی با لینک زماندار ۱۵ دقیقهای و توکن تکمصرفه؛ باطل شدن نشستها پس از تغییر رمز.
- **رازها و تنظیمات:** system checkهای fail-closed در `apps/core/checks.py`؛ حذف کلید تکراری `PAYMENT_GATEWAY` و الزام `sslmode=require`.
- **CSRF و ادمین:** `ApiCsrfMiddleware` برای تمام نوشتارهای API حتی سبد مهمان؛ `AdminGuardMiddleware` با CIDR و لاگ رد شدن؛ `SuspiciousActivityMiddleware`.
- **لاگ امنیتی:** `log_security` با اثر انگشت بدون PII.
- **XSS/هدرها:** CSP و X-Frame-Options و COOP/CORP و Permissions-Policy در Next و Caddy؛ مسدود کردن `/api/v1/metrics` از بیرون.
- **پرداخت:** `verify_order_totals()` پیش از شروع پرداخت بهعنوان دفاع در عمق.
- **وابستگیها و اسکن:** حذف `hypothesis`، `pip-tools`، `build` و `wheel`؛ `scripts/security_scan.py` و `scripts/rotate-secrets.sh`.
- **مستندات:** `docs/SECURITY-AUDIT-REPORT-FA.md`، `docs/SECRETS-ROTATION.md` و بهروزرسانی `SECURITY.md`.
- **رفع باگهای نهایی:** معافیت صریح callback پرداخت از CSRF (امنیت با HMAC و verify سرور)، محدود شدن `remotePatterns` تصویر، الزام HTTPS برای `FRONTEND_URL`/`PUBLIC_BASE_URL`.
- **تستها:** ۷ تست امنیتی جدید (رمز، بازنشانی، CSRF، ادمین، برابر بودن مبلغ، callback پرداخت، چکهای تولید).

### نقشهٔ راه ۵ فازه (تثبیت، بصری، تجربه، مقیاس، بلوغ)
- **بکاند:** کوپن پیش از مالیات، فیلترها و `/catalog/facets`، `/catalog/suggest`، محصولات مرتبط، بازبینی نظرات، `StockMovement`، متریکهای Prometheus، `REDIS_URL`، تنظیمات `test_sqlite.py`.
- **فرانت:** فونت self-hosted، `next/image`، هدر موبایل و تم سهحالته، خانهٔ ۱۲ بخشی، PLP فاستدار، PDP با تبها و JSON-LD، صفحهٔ `/design`، sitemap/robots.
- **عملیات:** Redis، Prometheus، Alertmanager، Grafana، exporters، هشدارها، PWA، `restore.sh` و گردش کار deploy.
- **مستندات:** `docs/DESIGN-LANGUAGE.md`، `docs/SLO.md`، `docs/ROADMAP.md` و `ops/monitoring/README.md`.

### فاز تثبیت و ساخت فروشگاه
- اضافه شدن تمام migrationهای کامیتشده برای ۷ اپ.
- رفع ۲ خطای TypeScript در Design System و سبز شدن typecheck.
- اعمال سیاست `HIDDEN_BRANDS` در API عمومی و سبد.
- fail-closed شدن `SMS_GATEWAY` و اضافه شدن آداپتور `HttpSms`.
- اضافه شدن `number` به `OrderAdmin.search_fields`؛ کامیت lockfileها و تغییر CI به `npm ci`.
- اپلیکیشن Next.js (`apps/web`) با مسیرهای خانه، فهرست، محصول، سبد، تسویه، پیگیری سفارش، حساب و مقایسه.
- مدلها و APIهای واریانت، نظر، علاقهمندی، کوپن، تاریخچهٔ قیمت، موجودی، ارسال، مرجوعی و اعلان.
- CTA جداگانه، CTA چسبان موبایل، Skeleton، Empty/Error state و PWA.
- CI وب، Lighthouse budgets، Playwright، Prometheus alerts، بکاپ و runbook.
