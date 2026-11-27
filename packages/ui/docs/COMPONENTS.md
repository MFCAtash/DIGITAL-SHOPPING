# فهرست کامپوننت‌ها

همه با `import { … } from "@digital-shopping/ui"`؛ استایل: `@digital-shopping/ui/styles.css`. پیش‌نمایش زنده: `npm run preview` ← `preview/design-system.html`.
«منطق خالص» = بدون Django/DOM و با تست واحد؛ «مرورگر» = در `npm run e2e` با Chromium واقعی آزموده می‌شود.

| گروه | کامپوننت | نکات رفتاری و دسترس‌پذیری | تست |
|---|---|---|---|
| پایه | `Button`, `ButtonLink`, `IconButton` | `loading` ⇒ disabled + `aria-busy`؛ `IconButton` بدون `label` کامپایل نمی‌شود؛ `primary` فقط یک‌بار در صفحه | SSR، مرورگر |
| | `TextField`, `TextAreaField`, `SelectField` | برچسب دائمی، `aria-describedby`، `aria-invalid`، خطا با آیکون+متن؛ Select بومی | SSR |
| | `Checkbox`, `RadioGroup`, `Switch` | ورودی واقعی بالای جعبهٔ ظاهری؛ RadioGroup با fieldset/legend؛ Switch با `role=switch` | SSR، مرورگر |
| | `Tabs`, `Accordion` | roving tabindex؛ در RTL فلش چپ = بعدی؛ Home/End؛ Accordion تک/چندبازشو | منطق، SSR، مرورگر |
| | `Modal`, `Sheet`, `Tooltip`, `ToastProvider/useToast` | `<dialog>` بومی؛ قفل اسکرول؛ Sheet از پایین (موبایل) و لبهٔ انتها (دسکتاپ)؛ خطا `role=alert` و ماندگار | منطق، مرورگر |
| فروشگاه | `PriceTag` | حالت‌ها: دقیق، «از»، «حدود»، تماس بگیرید، قدیمی؛ قدیمی/تقریبی با متن و آیکون | منطق (هم‌منطق بک‌اند)، SSR |
| | `StockIndicator` | موجود، کم‌موجود (≤۳)، ناموجود، فقط مشاهده؛ آیکون+متن | منطق، SSR |
| | `ProductCard` (grid/list/compact/compare) | کل کارت با یک پیوند (`::after`)؛ عکس تزئینی با ابعاد مشخص؛ `priority` برای LCP | SSR، مرورگر |
| | `Gallery` | قبلی/بعدی جهت‌دار، کشیدن انگشت (RTL-aware)، بندانگشتی، زوم در Modal | منطق، مرورگر |
| | `SpecTable`, `CompareTable` | `scope`‌ها؛ ستون اول چسبان در RTL؛ «فقط تفاوت‌ها»؛ علامت تفاوت با نشان+متن؛ مقادیر در `<bdi>` | منطق، SSR، مرورگر |
| | `PriceHistoryChart` | نمودار پلکانی SVG + خلاصه + جدول مقادیر | منطق، SSR، مرورگر |
| کشف | `Combobox`, `SearchBox` | ARIA 1.2؛ ↑↓ Enter Esc؛ فیلتر فارسی (ی/ک، ارقام، نیم‌فاصله) | منطق، SSR، مرورگر |
| | `FilterPanel`, `FilterSheet`, `SortMenu` | fieldset/legend؛ شمار نتیجه فارسی؛ دکمهٔ «نمایش N کالا» | SSR، مرورگر |
| | `Breadcrumb`, `Pagination`, `Stepper` | `aria-current`؛ صفحه‌بندی با `hrefFor` پیوند واقعی (سئو) | منطق، SSR، مرورگر |
| خرید | `QuantityStepper`, `MiniCart`, `Countdown` | حد min/max؛ هشدار تغییر قیمت؛ تایمر بدون اعلام هر ثانیه و بدون ناسازگاری SSR | منطق، SSR، مرورگر |
| | `AddressForm` | استان/شهر Combobox؛ کد پستی ۵-۵؛ اعتبارسنجی هم‌قاعدهٔ بک‌اند؛ فوکوس اولین خطا | منطق، مرورگر |
| هویت | `OtpInput`, `useWebOtp` | ارقام همیشه LTR؛ autofill با `one-time-code` فقط خانهٔ اول؛ جای‌گذاری کل کد؛ Backspace هوشمند | منطق، مرورگر |
| | `OrderTimeline` | نگاشت وضعیت‌های سفارش بک‌اند؛ وضعیت‌های بحرانی با رنگ+متن | منطق، SSR |
| حالت‌ها | `Skeleton`, `ProductCardSkeleton`, `EmptyState`, `ErrorState`, `Alert`, `Badge`, `OfflineBanner` | اسکلت هم‌شکل؛ `OfflineBanner` رویداد online/offline | SSR |
| برند | `BrandMark`, `AdaptiveAccent` | طلا فقط روی نشان؛ رنگ تطبیقی با کنتراست تضمین‌شده | منطق، SSR |
| زیرساخت | `Icon` (۲۴ آیکون خطی)، `applyTheme`, `themeInitScript` | آیکون جهت‌دار با `mirror`؛ تم بدون پرش | SSR، منطق |

## کتابخانهٔ منطق خالص (`src/lib`)
`format` (ارقام/تومان/دلار/شمسی/تایمر)، `price-state`، `stock`، `keys`، `otp`، `qty`، `pagination`، `compare`، `address`، `countdown`، `order-timeline`، `chart`، `swipe`، `toast`، `text` (نرمال‌سازی فارسی)، `contrast`، `color`، `adaptive-accent`، `theme`.
