import { toEnDigits } from "./format";

/** عدد صحیح بین min و max؛ ورودی نامعتبر به min برمی‌گردد. */
export function clampQty(value: number, min = 1, max = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function parseQty(raw: string, min = 1, max = Number.POSITIVE_INFINITY): number {
  const n = Number.parseInt(toEnDigits(raw).replace(/\D/g, ""), 10);
  return clampQty(Number.isNaN(n) ? min : n, min, max);
}
