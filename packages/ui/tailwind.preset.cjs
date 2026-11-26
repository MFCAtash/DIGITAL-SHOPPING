/**
 * پیش‌تنظیم Tailwind برای سیستم طراحی (ADR-002). رنگ‌ها به متغیرهای CSS وصل‌اند تا تم تاریک خودکار کار کند.
 * قواعد طراحی در خود پیش‌تنظیم اجرا می‌شوند: ابزارهای گرادیان، سایه و blur غیرفعال‌اند.
 *
 * tailwind.config.js:  presets: [require("@codex/ui/tailwind-preset")]
 */
const v = (name) => `var(--cx-${name})`;

module.exports = {
  theme: {
    screens: { sm: "480px", md: "768px", lg: "1024px", xl: "1280px" },
    // فقط رنگ‌های توکن؛ رنگ‌های پیش‌فرض Tailwind عمداً حذف شده‌اند
    colors: {
      transparent: "transparent",
      current: "currentColor",
      bg: v("bg"),
      surface: v("surface"),
      sunken: v("sunken"),
      media: v("media"),
      ink: v("text"),
      muted: v("muted"),
      line: v("line"),
      "line-strong": v("line-strong"),
      signal: v("signal"),
      "signal-ink": v("signal-ink"),
      brand: v("brand"),
      "brand-ink": v("brand-ink"),
      positive: v("positive"),
      warning: v("warning"),
      danger: v("danger"),
      gold: v("gold"),
    },
    borderRadius: { none: "0", sm: "2px", DEFAULT: "4px", full: "9999px" },
    boxShadow: { none: "none" },
    fontFamily: { body: ["var(--cx-font-body)"], head: ["var(--cx-font-head)"], mono: ["var(--cx-font-mono)"] },
    extend: {
      spacing: { 18: "4.5rem", 22: "5.5rem" },
      transitionTimingFunction: { cx: "cubic-bezier(0.2, 0, 0, 1)" },
      transitionDuration: { fast: "120ms", base: "200ms", slow: "320ms" },
    },
  },
  // ابزارهایی که ظاهر «ساخته‌شده با AI» می‌سازند خاموش‌اند (D.۵)
  corePlugins: { backgroundImage: false, gradientColorStops: false, boxShadow: false, dropShadow: false, blur: false, backdropBlur: false, ringWidth: false },
  plugins: [],
};
