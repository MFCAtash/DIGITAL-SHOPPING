# زبان طراحی Digital Shopping

> مرجع زندهٔ این سند در مسیر `/design` اپلیکیشن وب است: همان توکنها و کامپوننتها را رندر میکند.
> منبع توکنها: `packages/ui/src/tokens/tokens.ts` → `styles/tokens.css` (تولیدشده، دستی ویرایش نشود).

## ۱٫ اصول (ADR-002)
- **برگهٔ مشخصات، نه تبلیغات:** اطلاعات فنی استانداردشده، قیمت قابل اثبات و تاریخ بررسی.
- **کاغذ گرم:** پسزمینهٔ `#F3EFE7`، سطحها `#FBF9F4`، خطهای مویی ۱px، گوشههای ۲px.
- **بدون جلوهٔ تزئینی:** نه blur، نه gradient، نه سایهٔ نرم، نه انیمیشن بیهوده. تنها خط، فاصله و تایپوگرافی.
- **رنگ معناست، نه تزئین:** قرمز (`--cx-signal`) فقط قیمت/تخفیف؛ سبزآبی (`--cx-brand`) فقط CTA؛ زرد طلایی فقط علامت تجاری.
- **RTL-native:** همهٔ چیدمانها با `logical properties`، آیکونها با `mirror`، اعداد با ارقام فارسی و `tabular-nums`.

## ۲٫ تایپوگرافی
- فارسی: **Vazirmatn** (self-hosted، `font-display: swap`)؛ لاتین: **IBM Plex Sans**؛ اعداد/کد: **IBM Plex Mono**.
- فونتها در `apps/web/public/fonts` قرار دارند و با `@font-face` در `app/fonts.css` تعریف میشوند؛
  دو فونت حیاتی با `<link rel=preload>` در `<head>` بارگذاری میشوند (بدون درخواست به Google).
- مقیاس: `--cx-text-xs … 4xl` و `--cx-lh-*`. عناوین با `clamp()` رواناند (fluid type) و در موبایل کوچکتر میشوند.
- متنها حداکثر `--cx-measure` پهنا دارند؛ `bdi` برای نام کالاها و `cx-num` برای اعداد.

## ۳٫ رنگ و توکنها
| توکن | کاربرد |
|---|---|
| `--cx-bg`, `--cx-surface`, `--cx-sunken`, `--cx-media` | بستر، کارت، فرورفته، بستر تصویر |
| `--cx-text`, `--cx-muted`, `--cx-line`, `--cx-line-strong` | متن، متن ثانویه، خط مویی، خط تأکید |
| `--cx-signal`, `--cx-signal-ink` | **قیمت و تخفیف** |
| `--cx-brand`, `--cx-brand-ink` | **دکمهٔ اصلی و لینک اقدام** |
| `--cx-positive`, `--cx-warning`, `--cx-danger`, `--cx-gold` | موجودی، تقریبی، خطا، علامت تجاری |
| `--cx-focus` | حلقهٔ تمرکز ۲px با فاصلهٔ ۲px |

هشت پوستهٔ قابل چرخش: **کاغذ گرم**، **شب مخملی** و شش تم کهکشانی (`nebula`, `aurora`, `solar`,
`ocean`, `rose`, `silver`). پوستهها توسط `data-theme` روی `:root` اعمال و توسط دکمهٔ چرخشی هدر
جابجا میشوند؛ تمهای کهکشانی `data-cosmic="true"` را هم ست میکنند تا زمینهٔ پویا فعال شود.
زمینه و هالهها با **GSAP + ScrollTrigger** انیمیشن میگیرند (`components/cosmic-backdrop.tsx`) و
رنگها از منبع واحد `tokens.ts` تولید میشوند. تمام جفتهای کنتراست هشت تم در CI بررسی میشوند.
زبان رابط کاملاً دوزبانهٔ fa/en است (`lib/i18n.ts` + `LocaleProvider`).
تم تمام جفتهای رنگی توسط `npm run contrast` در CI از نظر WCAG بررسی میشوند.

## ۴٫ فاصله، شکل، حرکت
- فاصلهها فقط از `--cx-space-0 … 12`؛ شعاعها `--cx-radius-1/2/round` (حداکثر ۲px مگر دایره).
- لایهها: `--cx-z-dropdown`, `sticky`, `drawer`, `modal`, `toast`.
- حرکت: `--cx-motion-fast/base/slow/ease` و `prefers-reduced-motion` همیشه رعایت میشود.
- «برجستگی» با ۱px خط حاشیه و تغییر سطح ساخته میشود، نه با `box-shadow`.

## ۵٫ کامپوننتها
تمام کامپوننتها در `packages/ui` و مستقل از فریمورکاند (فقط React): `Button`, `ProductCard`, `PriceTag`,
`Gallery`, `Tabs`, `Accordion`, `FilterPanel/Sheet`, `Form fields`, `Modal/Sheet`, `Toast`, `Stepper`,
`SpecTable`, `CompareTable`, `Countdown`, `OrderTimeline`, `OtpInput`, `AddressForm`, `Combobox`, `SearchBox`,
`Skeleton`, `EmptyState`, `OfflineBanner`. اپ وب تنها لایهٔ `next/image` را اضافه میکند (`ProductImage`)
و آنرا از طریق prop `image` به `ProductCard` میدهد تا پکیج UI به Next وابسته نشود.

### قواعد دسترسپذیری
- هر ورودی برچسب و پیام خطای متنی دارد؛ خطاها فقط رنگ نیستند.
- مدالها `<dialog>` بومیاند، Esc و تمرکز را مدیریت میکنند.
- تبها و آکوردئونها الگوی APG و جهت RTL را رعایت میکنند.
- تصاویر محصول تزئینیاند (`alt=""`) چون عنوان پیوند در همان کارت است؛ تصویر اصلی PDP `alt` معنی دار دارد.
- بودجهٔ Lighthouse موبایل: Performance ≥ ۸۵٪، A11y ۱۰۰٪، Best practices ≥ ۹۵٪، SEO ≥ ۹۰٪
  (`apps/web/lighthouserc.json`).

## ۶٫ چکلیست قبل از merge
1. `npm run check` در `packages/ui` (توکنها، کنتراست، قواعد طراحی، tsc، ۵۴ تست).
2. `npm run typecheck` و `npm run build` در `apps/web`.
3. بررسی SVGها: بدون `filter`, `linearGradient`, `blur`.
4. بررسی RTL با `dir=rtl` و `lang=fa` و اعداد فارسی.
5. مقایسهٔ صفحه با `/design` تا از انحراف بصری جلوگیری شود.
