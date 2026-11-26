// توکن‌های Tailwind (v3: presets، v4: با @config). رنگ‌ها از CSS variables می‌آیند تا حالت روشن/تاریک خودکار باشد.
// توجه: چون مقدار رنگ‌ها var(...) است، پسوند شفافیت (مثل bg-surface/50) کار نمی‌کند؛ برای شفافیت از color-mix در CSS استفاده کنید.
const v = (n) => `var(--${n})`;
module.exports = { theme: { extend: { colors: {
  bg: v("bg"), surface: v("surface"), "surface-2": v("surface-2"), text: v("text"), muted: v("muted"),
  // آبجکت با DEFAULT: پالت پیش‌فرض blue-50..blue-950 تیلویند حفظ می‌شود (رشتهٔ ساده کل پالت را حذف می‌کرد و کلاس‌های موجود پروژه مثل bg-blue-600 می‌شکست)
  blue: { DEFAULT: v("blue") },
  jade: v("jade"), "jade-text": v("jade-text"), accent: v("accent-text"), line: v("line"),
}}}};
