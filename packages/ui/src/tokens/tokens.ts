/**
 * منبع یگانهٔ توکن‌های طراحی (ADR-002، جهت A «برگهٔ مشخصات»).
 * tokens.css از همین فایل تولید می‌شود (npm run tokens:build) و نسبت‌های کنتراست در CI از همین‌جا سنجیده می‌شود.
 *
 * اصل (بهروزرسانی): رنگ سیگنال فقط برای قیمت/تخفیف/هشدار، رنگ `brand` برای CTA اصلی؛
 * طلای برند فقط لوگو و نشان (هرگز متن). جداسازی سیگنال از CTA مانع رقابت بصری قیمت و دکمهٔ خرید میشود.
 */
export type ThemeName = "light" | "dark" | "nebula" | "aurora" | "solar" | "ocean" | "rose" | "silver";

/** پوستههای کهکشانی با هاله و پرتو رنگی (انتخاب کاربر). */
export const GALAXY_THEMES = ["nebula", "aurora", "solar", "ocean", "rose", "silver"] as const;
export type GalaxyTheme = (typeof GALAXY_THEMES)[number];

export const GALAXY_LABELS: Record<GalaxyTheme, string> = {
  nebula: "Nebula Violet", aurora: "Aurora Mint", solar: "Solar Gold",
  ocean: "Ocean Blue", rose: "Rose Nebula", silver: "Cosmic Silver",
};

/** رنگهای هالهٔ هر پوستهٔ کهکشانی (برای زمینهٔ پویا توسط GSAP/CSS). */
export const GALAXY_GLOWS: Record<GalaxyTheme, { a: string; b: string }> = {
  nebula: { a: "#7C3AED", b: "#EC4899" },
  aurora: { a: "#10B981", b: "#22D3EE" },
  solar: { a: "#F59E0B", b: "#FDE68A" },
  ocean: { a: "#2563EB", b: "#38BDF8" },
  rose: { a: "#DB2777", b: "#F472B6" },
  silver: { a: "#64748B", b: "#E2E8F0" },
};

export interface ColorTokens {
  bg: string;
  surface: string;
  sunken: string;
  /** صحنهٔ عکس محصول؛ عکس‌های با پس‌زمینهٔ سفید با mix-blend-mode: multiply در آن حل می‌شوند */
  media: string;
  text: string;
  muted: string;
  line: string;
  /** مرز کنترل‌ها (ورودی، چک‌باکس): طبق WCAG 1.4.11 حداقل ۳:۱ */
  lineStrong: string;
  signal: string;
  /** رنگ متن روی پر کردن سیگنال */
  signalInk: string;
  /** رنگ هویتbrand دکمهٔ اصلی (جدا از رنگ قیمت) */
  brand: string;
  /** رنگ متن روی پر کردنbrand */
  brandInk: string;
  positive: string;
  warning: string;
  danger: string;
  /** فقط نشان و لوگو؛ هرگز متن */
  gold: string;
  focus: string;
}

export const colors: Record<ThemeName, ColorTokens> = {
  light: {
    bg: "#F3EFE7",
    surface: "#FBF9F4",
    sunken: "#EAE4D8",
    media: "#E9E3D6",
    text: "#17191C",
    muted: "#5E6168",
    line: "#D9D3C7",
    lineStrong: "#857E70",
    signal: "#C42E16",
    signalInk: "#FFFFFF",
    brand: "#0E5C54",
    brandInk: "#FFFFFF",
    positive: "#1F7A4D",
    warning: "#8A5A00",
    danger: "#B3261E",
    gold: "#B8892B",
    focus: "#17191C",
  },
  // «شب مخملی» — تم تیرهٔ لوکس 선택شده توسط کاربر (بهمراه «کاغذ گرم» بهعنوان تم روشن).
  dark: {
    bg: "#0B1020",
    surface: "#131A2C",
    sunken: "#0F1626",
    media: "#DAD5C9",
    text: "#F4F2ED",
    muted: "#A8B0C2",
    line: "#2A3450",
    lineStrong: "#7A86B8",
    signal: "#FB7185",
    signalInk: "#24090F",
    brand: "#5EEAD4",
    brandInk: "#08201D",
    positive: "#4FB583",
    warning: "#E0A93B",
    danger: "#FF8A80",
    gold: "#D8B46A",
    focus: "#F4F2ED",
  },
  // ---- پوستههای کهکشانی (انتخاب کاربر: تمام شش تم) ----
  nebula: {
    bg: "#0B0716", surface: "#1B1033", sunken: "#07040F", media: "#DAD5C9",
    text: "#F6F4FF", muted: "#C4B9E4", line: "#3B2A5C", lineStrong: "#8B7AB8",
    signal: "#F9A8D4", signalInk: "#2A0716", brand: "#A78BFA", brandInk: "#1A0F2E",
    positive: "#6EE7B7", warning: "#FCD34D", danger: "#FB7185", gold: "#D8B46A", focus: "#F6F4FF",
  },
  aurora: {
    bg: "#04140F", surface: "#06302B", sunken: "#020A08", media: "#DAD5C9",
    text: "#ECFFF9", muted: "#A7E8D5", line: "#125E50", lineStrong: "#5EEAD4",
    signal: "#6EE7B7", signalInk: "#04140F", brand: "#5EEAD4", brandInk: "#04140F",
    positive: "#34D399", warning: "#FDE68A", danger: "#FB7185", gold: "#D8B46A", focus: "#ECFFF9",
  },
  solar: {
    bg: "#140D05", surface: "#3A2109", sunken: "#0A0602", media: "#DAD5C9",
    text: "#FFF7E8", muted: "#E9CFA3", line: "#6B4516", lineStrong: "#D8B46A",
    signal: "#FBBF24", signalInk: "#2A1700", brand: "#FCD34D", brandInk: "#2A1700",
    positive: "#6EE7B7", warning: "#FDE68A", danger: "#FB7185", gold: "#FBBF24", focus: "#FFF7E8",
  },
  ocean: {
    bg: "#020B1A", surface: "#082C55", sunken: "#010713", media: "#DAD5C9",
    text: "#EDF6FF", muted: "#B9D7F7", line: "#1E4E8C", lineStrong: "#60A5FA",
    signal: "#7DD3FC", signalInk: "#02101F", brand: "#60A5FA", brandInk: "#02101F",
    positive: "#6EE7B7", warning: "#FCD34D", danger: "#FB7185", gold: "#D8B46A", focus: "#EDF6FF",
  },
  rose: {
    bg: "#160611", surface: "#431033", sunken: "#0C0309", media: "#DAD5C9",
    text: "#FFF3FA", muted: "#F0C3DD", line: "#7A1E5E", lineStrong: "#F9A8D4",
    signal: "#F9A8D4", signalInk: "#2A0716", brand: "#F472B6", brandInk: "#2A0716",
    positive: "#6EE7B7", warning: "#FCD34D", danger: "#FB7185", gold: "#F0CFA5", focus: "#FFF3FA",
  },
  silver: {
    bg: "#0B0D12", surface: "#202737", sunken: "#05070B", media: "#DAD5C9",
    text: "#F8FAFC", muted: "#BAC4D4", line: "#3B4557", lineStrong: "#94A3B8",
    signal: "#E2E8F0", signalInk: "#0B0D12", brand: "#CBD5E1", brandInk: "#0B0D12",
    positive: "#6EE7B7", warning: "#FCD34D", danger: "#FB7185", gold: "#E2E8F0", focus: "#F8FAFC",
  },
};

/** جفت‌های متن/پس‌زمینه با حداقل نسبت کنتراست؛ ورودی تست کنتراست. */
export interface ContrastPair {
  fg: keyof ColorTokens;
  bg: keyof ColorTokens;
  min: number;
  why: string;
}

export const contrastPairs: readonly ContrastPair[] = [
  { fg: "text", bg: "bg", min: 7, why: "متن اصلی روی صفحه (AAA)" },
  { fg: "text", bg: "surface", min: 7, why: "متن اصلی روی کارت" },
  { fg: "text", bg: "sunken", min: 7, why: "متن روی ناحیهٔ فرورفته" },
  { fg: "muted", bg: "bg", min: 4.5, why: "متن کم‌رنگ روی صفحه" },
  { fg: "muted", bg: "surface", min: 4.5, why: "متن کم‌رنگ روی کارت" },
  { fg: "muted", bg: "sunken", min: 4.5, why: "متن کم‌رنگ روی ناحیهٔ فرورفته" },
  { fg: "signal", bg: "bg", min: 4.5, why: "قیمت و پیوند روی صفحه" },
  { fg: "signal", bg: "surface", min: 4.5, why: "قیمت روی کارت" },
  { fg: "signalInk", bg: "signal", min: 4.5, why: "برچسب روی نشان تخفیف" },
  { fg: "brandInk", bg: "brand", min: 4.5, why: "برچسب دکمهٔ اصلی (جدا از رنگ قیمت)" },
  { fg: "brand", bg: "surface", min: 4.5, why: "دکمهٔ هدایتsecondaryبا رنگbrandروی کارت" },
  { fg: "positive", bg: "bg", min: 4.5, why: "وضعیت «موجود»" },
  { fg: "positive", bg: "surface", min: 4.5, why: "وضعیت «موجود» روی کارت" },
  { fg: "warning", bg: "bg", min: 4.5, why: "وضعیت «کم‌موجود/قیمت قدیمی»" },
  { fg: "warning", bg: "surface", min: 4.5, why: "هشدار روی کارت" },
  { fg: "danger", bg: "bg", min: 4.5, why: "پیام خطا" },
  { fg: "danger", bg: "surface", min: 4.5, why: "پیام خطا روی کارت" },
  { fg: "lineStrong", bg: "bg", min: 3, why: "مرز کنترل‌ها (WCAG 1.4.11)" },
  { fg: "lineStrong", bg: "surface", min: 3, why: "مرز کنترل‌ها روی کارت" },
  { fg: "focus", bg: "bg", min: 3, why: "حلقهٔ فوکوس" },
  { fg: "focus", bg: "surface", min: 3, why: "حلقهٔ فوکوس روی کارت" },
];

export const typeScale = {
  xs: { size: "0.8125rem", lh: "1.6" },
  sm: { size: "0.875rem", lh: "1.7" },
  base: { size: "1rem", lh: "1.9" },
  md: { size: "1.125rem", lh: "1.8" },
  lg: { size: "1.25rem", lh: "1.5" },
  xl: { size: "1.5rem", lh: "1.4" },
  "2xl": { size: "1.875rem", lh: "1.3" },
  "3xl": { size: "2.375rem", lh: "1.2" },
  "4xl": { size: "3rem", lh: "1.1" },
} as const;

/** مقیاس ۴px */
export const space = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

/** شعاع گوشه ۰ تا ۴px؛ «round» فقط برای سوییچ و نقطه. */
export const radius = { 0: "0", 1: "2px", 2: "4px", round: "999px" } as const;

export const motion = {
  fast: "120ms",
  base: "200ms",
  slow: "320ms",
  ease: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const zIndex = { dropdown: 20, sticky: 30, drawer: 40, modal: 50, toast: 60 } as const;

export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const;

/**
 * پشتهٔ فونت. لاتین (IBM Plex) اول می‌آید: حروف لاتین از آن و حروف و ارقام فارسی (که Plex ندارد)
 * به‌صورت خودکار از فونت فارسی می‌آیند. فونت‌های واقعی با next/font متغیرهای --font-* را تعریف می‌کنند.
 */
export const fonts = {
  body: 'var(--font-latin, "IBM Plex Sans"), var(--font-fa, "Estedad"), "Vazirmatn", system-ui, "Segoe UI", Tahoma, sans-serif',
  head: 'var(--font-latin, "IBM Plex Sans"), var(--font-fa-head, var(--font-fa, "Estedad")), "Vazirmatn", system-ui, Tahoma, sans-serif',
  mono: 'var(--font-mono, "IBM Plex Mono"), ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** متغیرهای رنگی یک تم: { "--cx-line-strong": "#…" } */
export function colorVars(theme: ThemeName): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors[theme])) out[`--cx-${kebab(k)}`] = v;
  return out;
}

/** متغیرهای مستقل از تم */
export function staticVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(typeScale)) {
    out[`--cx-text-${k}`] = v.size;
    out[`--cx-lh-${k}`] = v.lh;
  }
  space.forEach((px, i) => (out[`--cx-space-${i}`] = px === 0 ? "0" : `${px / 16}rem`));
  for (const [k, v] of Object.entries(radius)) out[`--cx-radius-${k}`] = v;
  for (const [k, v] of Object.entries(motion)) out[`--cx-motion-${k}`] = v;
  for (const [k, v] of Object.entries(zIndex)) out[`--cx-z-${k}`] = String(v);
  out["--cx-font-body"] = fonts.body;
  out["--cx-font-head"] = fonts.head;
  out["--cx-font-mono"] = fonts.mono;
  out["--cx-focus-width"] = "2px";
  out["--cx-focus-offset"] = "2px";
  out["--cx-measure"] = "68ch";
  return out;
}

const block = (selector: string, vars: Record<string, string>, indent = ""): string =>
  `${indent}${selector} {\n${Object.entries(vars)
    .map(([k, v]) => `${indent}  ${k}: ${v};`)
    .join("\n")}\n${indent}}`;

/** متن کامل tokens.css (قطعی و بدون زمان/تصادف، تا تست همگامی کار کند). */
export function buildTokensCss(): string {
  const header = "/* تولیدشده از src/tokens/tokens.ts با «npm run tokens:build». دستی ویرایش نکنید. */";
  const root = block(":root", { ...staticVars(), ...colorVars("light"), "color-scheme": "light" });
  const darkAuto = `@media (prefers-color-scheme: dark) {\n${block(':root:not([data-theme="light"])', { ...colorVars("dark"), "color-scheme": "dark" }, "  ")}\n}`;
  const darkForced = block(':root[data-theme="dark"]', { ...colorVars("dark"), "color-scheme": "dark" });
  const galaxy = GALAXY_THEMES.map((name) =>
    block(`:root[data-theme="${name}"]`, {
      ...colorVars(name),
      "color-scheme": "dark",
      "--cx-glow-a": GALAXY_GLOWS[name].a,
      "--cx-glow-b": GALAXY_GLOWS[name].b,
      "--cx-cosmic": "1",
    }),
  );
  return [header, root, darkAuto, darkForced, ...galaxy, ""].join("\n\n");
}
