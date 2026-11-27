# @digital-shopping/ui — سیستم طراحی Digital Shopping

توکن‌ها، کامپوننت‌های React 19 (بدون وابستگی زمان‌اجرا)، پیش‌تنظیم Tailwind و قواعد طراحی. تصمیم: [ADR-002](../../docs/adr/0002-design-direction.md). اصول: [docs/PRINCIPLES.md](docs/PRINCIPLES.md). فهرست: [docs/COMPONENTS.md](docs/COMPONENTS.md).

## نصب و استفاده (Next.js App Router)
```bash
npm i                                   # در packages/ui؛ در پروژهٔ Next: workspace یا file:
```
```tsx
// app/layout.tsx
import "@digital-shopping/ui/styles.css";
import { themeInitScript } from "@digital-shopping/ui";
import { fontClasses } from "./fonts";    // نگاه کنید به next/fonts.ts

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={fontClasses} suppressHydrationWarning>
      <head><script>{themeInitScript}</script></head>
      <body>{children}</body>
    </html>
  );
}
```
```tsx
import { ProductCard, PriceTag, Button } from "@digital-shopping/ui";
```
Tailwind (اختیاری): `presets: [require("@digital-shopping/ui/tailwind-preset")]` — رنگ‌ها فقط توکن‌اند و ابزارهای گرادیان/سایه/blur خاموش.

## دستورها
| دستور | کار |
|---|---|
| `npm run tokens:build` / `tokens:check` | تولید/بررسی همگامی `tokens.css` از `tokens.ts` |
| `npm run contrast` | سنجش ۳۸ جفت رنگ در هر دو تم |
| `npm run lint:design` | قواعد «سبک بصری اختصاصی» روی CSS و کد |
| `npm run typecheck` | `tsc` با `@types/react` (محیط بدون آن: `typecheck:stub`) |
| `npm test` | تست‌های واحد، SSR و تست متقابل با بک‌اند روی `contracts/` (۵۳ تست) |
| `npm run preview` | ساخت `preview/design-system.html` (SSR + هیدراسیون واقعی) |
| `npm run e2e` | ۲۶ تست رفتاری در Chromium واقعی (نیازمند `preview` و playwright) |
| `npm run extract-colors` | رنگ غالب عکس هر کالا ← `overlay/data/adaptive-colors.json` |
| `npm run check` | همهٔ بررسی‌های بالا به‌جز e2e |

## نکات
- اگر `data-theme` نباشد، `prefers-color-scheme` تم را تعیین می‌کند؛ `applyTheme("dark" | "light" | "system")` ترجیح را ذخیره می‌کند.
- کامپوننت‌ها فقط ویژگی‌های منطقی CSS می‌خوانند؛ `dir="ltr"` را فقط روی ورودی‌های عددی (موبایل، کد پستی، OTP) بگذارید.
- پیش‌نمایش از نرخ ارز نمایشی (۱۰۰٬۰۰۰ تومان) و فونت پیش‌فرض سیستم استفاده می‌کند؛ ظاهر نهایی با فونت‌های `next/fonts.ts` است.
