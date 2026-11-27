# افزونهٔ ۲ه: تم آبی و سبز یشمی

> **سند تاریخی (HISTORICAL):** تم قدیمی `shop-theme.css` و `AuroraBackground` منسوخاند.
> جایگزین فعلی: `@digital-shopping/ui` و ۸ تم در `apps/web` (۶ کهکشانی + کاغذ گرم/شب مخملی)؛
> وضعیت فعلی را در [README.md](../../README.md) و [PHASE-D-STATUS.md](../PHASE-D-STATUS.md) ببینید.

## فایل‌ها
- `src/styles/shop-theme.css`: توکن‌ها (روشن/تاریک خودکار؛ `data-theme` برای اجبار)، شفق سه‌لکه (۳۰ تا ۴۰ ثانیه)، لایهٔ نقطه‌ای دور، نویز، نور موس، هدر شیشه‌ای، کارت، هالهٔ پشت محصول، قیمت، چیپ، دکمه، اسکلتون، `prefers-reduced-motion`.
- `src/components/shop/`: `AuroraBackground`، `PriceTag`، `ProductCard` و `ProductCardSkeleton`.
- `tailwind.shop-preset.cjs`: توکن‌های Tailwind (`bg-surface`, `text-muted`, `text-jade-text`, …).
- `scripts/build-preview.mjs`: ساخت `preview/index.html` از کاتالوگ ۲د (`node scripts/build-preview.mjs`).

## اتصال (۳ مرحله)
1. در `globals.css`: `@import "../styles/shop-theme.css";` (مسیر را با جای فایل تنظیم کنید).
2. در `layout.tsx`: بدنه را `<div className="shop-root">` کنید، `<AuroraBackground />` را اول بگذارید و بقیه را در `<div className="shop-content">` بپیچید.
3. در لیست محصولات `ProductCard` را به‌جای کارت فعلی بگذارید: `priceCents=price_usd_cents`، `finalCents=final_usd_cents`، `image` اولین `product_images.url`.
   اگر Tailwind دارید: v3 در `presets: [require("./tailwind.shop-preset.cjs")]`؛ v4 با `@config`.

## تفاوت‌ها با پیشنهاد اولیه (برای تضاد ۴٫۵ به ۱)
- متن یشمی در حالت روشن `#0A7A68` است، نه `#0E9F86` (تضاد `#0E9F86` روی سفید حدود ۳٫۳ است).
- متن دکمه در حالت تاریک تیره است (`#03141C`)؛ سفید روی `#19C3A0` خوانا نیست. در حالت روشن گرادیان تا `#0A7F6B` می‌رود تا متن سفید خوانا بماند.
- قیمت قرمزِ حالت روشن `#C2363B` برای متن کوچک و `#E5484D` فقط برای قیمت بزرگ مجاز است؛ در CSS همان `#C2363B` استفاده شده.

## وضعیت راستی‌آزمایی
> وضعیت فعلی: `tsc` و `next build` در `apps/web` و `npm run check` در `packages/ui` سبزاند (۵۴ تست و ۲۶ تست مرورگر).

---
# فاز ۲و: Codex Shopping، سه‌زبانه، طلایی و اسکرول نرم

## اتصال اضافه
1. در `globals.css` بعد از `shop-theme.css`: `@import "../styles/shop-gold.css";`
2. در `layout.tsx`: `<html className={fontVars}>` (از `@/lib/fonts`)، سپس `<LangProvider>` دور همه، و داخلش `<SmoothScroll />`، `<AuroraBackground />` و در هدر `<BrandMark />` و `<LangSwitcher />`.
3. کارت‌ها را با `<Reveal delay={i % 4 * 70}>` بپیچید.
4. متن‌های ثابت را با `const { t } = useLang(); t("search")` بخوانید. کلیدها در `src/lib/i18n-messages.json` هستند (en، fa، de). جهت صفحه (`dir`) و `lang` خودکار عوض می‌شود.

## فونت‌ها (Google Fonts)
برند: Cinzel Decorative. تیتر انگلیسی و آلمانی: Playfair Display. متن انگلیسی و آلمانی: Inter. متن فارسی: Vazirmatn. تیتر فارسی: Lalezar.

## نکات
- توضیح فارسی محصولات در کاتالوگ هست؛ برای انگلیسی و آلمانی فعلاً خلاصهٔ مشخصات نمایش داده می‌شود. برای متن توصیفی ترجمه‌شده باید `description_en` و `description_de` به کاتالوگ و جدول اضافه شوند.
- نام محصولات و مقادیر مشخصات (مثل «6.9 inch…») ترجمه نشده‌اند.
- اسکرول نرم در لمسی، reduced-motion و داخل عنصرهای `data-native-scroll` خاموش است.
- فونت‌ها در محیط آزمایش من بدون اینترنت بارگذاری نشدند؛ ظاهر نهایی فونت‌ها را در مرورگر خودتان ببینید.
