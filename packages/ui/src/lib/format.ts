/** قالببندی اعداد و تاریخ: فارسی پیشفرض است و زبان انگلیسی اختیاری است (سازگاری با نسخهٔ قبل). */

export type FormatLocale = "fa" | "en";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
const THOUSANDS = "٬"; // U+066C

/** ارقام لاتین (و عربی) را فارسی میکند؛ در حالت en همان ارقام لاتین برگردانده میشود. */
export function toFaDigits(input: string | number, locale: FormatLocale = "fa"): string {
  const s = String(input);
  if (locale === "en") return toEnDigits(s);
  return s.replace(/[0-9٠-٩]/g, (d) => {
    const i = AR.indexOf(d);
    return FA[i >= 0 ? i : Number(d)]!;
  });
}

/** ارقام فارسی و عربی را به لاتین برمیگرداند (برای اعتبارسنجی ورودی کاربر). */
export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const f = FA.indexOf(d);
    return String(f >= 0 ? f : AR.indexOf(d));
  });
}

function group(n: number, locale: FormatLocale = "fa"): string {
  const sep = locale === "fa" ? THOUSANDS : ",";
  return Math.trunc(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** ۱٬۲۵۰٬۰۰۰ (یا 1,250,000 در حالت en). */
export function formatNumber(n: number | null | undefined, _opts: { unit?: boolean } = {}, locale: FormatLocale = "fa"): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return locale === "en" ? `${sign}${group(n, "en")}` : toFaDigits(`${sign}${group(n, "fa")}`);
}

/** «۱۲٬۵۰۰٬۰۰۰ تومان» یا «12,500,000 IRR». واحد در حالت en IRR (تومان) است. */
export function formatToman(n: number | null | undefined, opts: { unit?: boolean } = {}, locale: FormatLocale = "fa"): string {
  const s = formatNumber(n, opts, locale);
  return s === "—" || opts.unit === false ? s : `${s} ${locale === "fa" ? "تومان" : "IRR"}`;
}

/** $1,299 یا US$1,299 — قیمت دلاری همیشه LTR و با ارقام لاتین نمایش داده میشود. */
export function formatUsdCents(cents: number | null | undefined, locale: FormatLocale = "fa"): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const c = Math.round(cents);
  const prefix = locale === "en" ? "US$" : "$";
  const whole = group(Math.floor(c / 100), "en");
  return c % 100 === 0 ? `${prefix}${whole}` : `${prefix}${whole}.${String(c % 100).padStart(2, "0")}`;
}

/** تاریخ شمسی (پیشفرض) یا میلادی هنگام locale=en. */
export function formatJalali(
  date: Date | string | number,
  style: "numeric" | "long" = "numeric",
  timeZone = "Asia/Tehran",
  locale: FormatLocale = "fa",
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  if (locale === "en") {
    const opts: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: style === "long" ? "short" : "numeric",
      day: "numeric",
      timeZone,
    };
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  }
  const opts: Intl.DateTimeFormatOptions =
    style === "long" ? { year: "numeric", month: "long", day: "numeric", timeZone } : { year: "numeric", month: "numeric", day: "numeric", timeZone };
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", opts).format(d);
}

/** ۱۴:۵۹ — برای تایمر رزرو. */
export function formatClock(totalSeconds: number, locale: FormatLocale = "fa"): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return toFaDigits(`${mm}:${ss}`, locale);
}
