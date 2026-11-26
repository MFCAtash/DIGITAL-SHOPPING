/**
 * رنگ تطبیقی صفحهٔ محصول (جهت C در ADR-002): از رنگ غالب عکس یک رنگ تأکید امن می‌سازیم.
 * قاعده: روشنایی آن‌قدر تنظیم می‌شود که کنتراست با پس‌زمینه و سطح هر تم ≥ ۴٫۵ باشد؛ فام (hue) حفظ می‌شود.
 * فقط روی چند عنصر (خط زیر عنوان، نشان واریانت، نوار انتخاب) به کار می‌رود، نه دکمهٔ خرید و قیمت.
 */
import { contrastRatio, parseHex } from "./contrast";
import { hexToHsl, hslToHex } from "./color";

export interface Accent {
  accent: string;
  /** رنگ متن روی پر شدهٔ accent (سیاه یا سفید، هرکدام کنتراست بیشتر) */
  ink: string;
}

export interface ThemeSurfaces {
  bg: string;
  surface: string;
}

const MIN_RATIO = 4.5;

/** رنگ امن وقتی رنگ غالب خنثی/نامعتبر است: همان «muted» هر تم (کنتراست آن در tokens.test سنجیده می‌شود). */
export const FALLBACKS: Record<"light" | "dark", Accent> = {
  light: { accent: "#5E6168", ink: "#FFFFFF" },
  dark: { accent: "#A8B0C2", ink: "#0B1020" },
};

function inkFor(accent: string): string {
  return contrastRatio("#FFFFFF", accent) >= contrastRatio("#141517", accent) ? "#FFFFFF" : "#141517";
}

/** برای یک تم: دور شدن از پس‌زمینه تا رسیدن به کنتراست. تم تاریک روشن‌تر، تم روشن تیره‌تر می‌شود. */
export function deriveAccent(dominantHex: string, theme: "light" | "dark", surfaces: ThemeSurfaces, minRatio = MIN_RATIO): Accent {
  try {
    parseHex(dominantHex);
  } catch {
    return FALLBACKS[theme];
  }
  const [h, s0, l0] = hexToHsl(dominantHex);
  // رنگ‌های تقریباً خنثی (خاکستری/سفید/سیاه) فام معنادار ندارند؛ رنگ خنثی امن برمی‌گردد
  if (s0 < 0.12) return FALLBACKS[theme];
  const s = Math.min(0.72, Math.max(0.35, s0));
  const dir = theme === "light" ? -1 : 1;
  let l = l0;
  for (let i = 0; i < 100; i++) {
    const hex = hslToHex(h, s, l);
    if (contrastRatio(hex, surfaces.bg) >= minRatio && contrastRatio(hex, surfaces.surface) >= minRatio) return { accent: hex, ink: inkFor(hex) };
    l += dir * 0.01;
    if (l <= 0.05 || l >= 0.95) break;
  }
  return FALLBACKS[theme];
}

export function deriveBoth(dominantHex: string, light: ThemeSurfaces, dark: ThemeSurfaces): { light: Accent; dark: Accent } {
  return { light: deriveAccent(dominantHex, "light", light), dark: deriveAccent(dominantHex, "dark", dark) };
}
