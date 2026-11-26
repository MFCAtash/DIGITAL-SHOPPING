import type { Dir } from "../lib/keys";

/** جهت واقعی عنصر (فقط در رویدادهای کلاینت صدا بزنید). */
export function dirOf(el: Element | null | undefined): Dir {
  if (!el || typeof getComputedStyle === "undefined") return "rtl";
  return getComputedStyle(el).direction === "ltr" ? "ltr" : "rtl";
}
