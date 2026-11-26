import type { Dir } from "./keys";

/** +1 = کالای بعدی، -1 = قبلی، null = اشارهٔ نامعتبر. در RTL کشیدن به راست یعنی «بعدی». */
export function swipeToStep(dx: number, dy: number, dir: Dir = "rtl", threshold = 40): 1 | -1 | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  const towardEnd = dir === "rtl" ? dx > 0 : dx < 0;
  return towardEnd ? 1 : -1;
}
