import type { CSSProperties, ReactNode } from "react";
import { deriveBoth } from "../lib/adaptive-accent";
import { colors } from "../tokens/tokens";

export interface AdaptiveAccentProps {
  /** رنگ غالب عکس (از «npm run extract-colors») */
  dominant: string;
  children: ReactNode;
  className?: string;
}

/**
 * رنگ تطبیقی صفحهٔ محصول (جهت C در ADR-002). متغیرهای --cx-adaptive را برای هر دو تم می‌سازد؛ کنتراست در
 * deriveAccent تضمین می‌شود. فقط برای نوار انتخاب واریانت، خط زیر عنوان و نشان‌ها؛ نه دکمهٔ خرید و قیمت.
 */
export function AdaptiveAccent({ dominant, children, className }: AdaptiveAccentProps) {
  const a = deriveBoth(dominant, colors.light, colors.dark);
  // CSS سفارشی با پیشوند -- توسط تایپ‌های React به رسمیت شناخته نمی‌شود؛
  // انتقال صریح به CSSProperties بدون تغییر در خروجی رندر، خطای TS2559 را برطرف می‌کند.
  const style = {
    "--cx-adaptive-l": a.light.accent,
    "--cx-adaptive-l-ink": a.light.ink,
    "--cx-adaptive-d": a.dark.accent,
    "--cx-adaptive-d-ink": a.dark.ink,
  } as CSSProperties;
  return (
    <div className={["cx-adaptive", className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}
