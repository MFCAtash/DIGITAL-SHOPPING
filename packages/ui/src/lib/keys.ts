/** ناوبری کیبورد (تب‌ها، گروه رادیو): در RTL جهت فلش‌های افقی برعکس می‌شود. */

export type Dir = "rtl" | "ltr";
export type Orientation = "horizontal" | "vertical";

export function nextIndex(opts: { key: string; index: number; count: number; dir?: Dir; orientation?: Orientation; loop?: boolean }): number | null {
  const { key, index, count, dir = "rtl", orientation = "horizontal", loop = true } = opts;
  if (count <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  let step = 0;
  if (orientation === "vertical") {
    if (key === "ArrowDown") step = 1;
    else if (key === "ArrowUp") step = -1;
  } else if (key === "ArrowRight") step = dir === "rtl" ? -1 : 1;
  else if (key === "ArrowLeft") step = dir === "rtl" ? 1 : -1;
  if (step === 0) return null;
  const n = index + step;
  if (n < 0 || n >= count) return loop ? (n + count) % count : index;
  return n;
}

/** حرکت گزینهٔ فعال در فهرست (combobox). current=-1 یعنی هیچ‌کدام. */
export function moveActive(current: number, delta: 1 | -1, count: number, loop = true): number {
  if (count <= 0) return -1;
  if (current < 0) return delta === 1 ? 0 : count - 1;
  const n = current + delta;
  if (n < 0) return loop ? count - 1 : 0;
  if (n >= count) return loop ? 0 : count - 1;
  return n;
}
