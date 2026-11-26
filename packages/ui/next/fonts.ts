/**
 * فونت‌ها با next/font (خودمیزبان در بیلد؛ بدون درخواست به گوگل هنگام اجرا). این فایل را در پروژهٔ Next
 * (مثلاً app/fonts.ts) کپی کنید؛ بیرون از tsconfig این پکیج است چون به «next» وابسته است.
 *
 * - لاتین: IBM Plex Sans/Mono (Inter و Space Grotesk عمداً کنار گذاشته شده‌اند؛ docs/PRINCIPLES.md).
 * - فارسی: گزینهٔ A «Estedad» (محلی، تمایز بیشتر) یا گزینهٔ B «Vazirmatn» (گوگل، بدون فایل دستی).
 *   پیش‌فرض B است تا بدون کار اضافه بالا بیاید. مجوز هر فونت را پیش از استفادهٔ تجاری بررسی کنید.
 */
import { IBM_Plex_Mono, IBM_Plex_Sans, Vazirmatn } from "next/font/google";
// import localFont from "next/font/local";

export const latin = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-latin", display: "swap" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

// گزینهٔ B (پیش‌فرض)
export const fa = Vazirmatn({ subsets: ["arabic"], variable: "--font-fa", display: "swap" });

// گزینهٔ A: فایل‌های woff2 را در fonts/ بگذارید (نگاه کنید به fonts/README.md) و این را به‌جای B فعال کنید.
// export const fa = localFont({
//   src: [
//     { path: "../fonts/Estedad-Regular.woff2", weight: "400" },
//     { path: "../fonts/Estedad-SemiBold.woff2", weight: "600" },
//     { path: "../fonts/Estedad-Bold.woff2", weight: "700" },
//   ],
//   variable: "--font-fa",
//   display: "swap",
// });

/** کلاس‌هایی که باید روی <html> بنشینند: <html lang="fa" dir="rtl" className={fontClasses}> */
export const fontClasses = [latin.variable, mono.variable, fa.variable].join(" ");
