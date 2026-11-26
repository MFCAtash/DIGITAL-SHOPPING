/** حالت‌های نمایش قیمت: دقیق، «از»، «تقریبی»، «تماس بگیرید»، و قدیمی‌بودن. منطق خالص و قابل تست. */

export type PriceNote = "from" | "approx" | null | undefined;
export type PriceKind = "contact" | "exact" | "from" | "approx";

export interface PriceInput {
  priceCents: number | null;
  finalCents: number | null;
  discountPercent?: number;
  note?: PriceNote;
  /** تاریخ بررسی قیمت (YYYY-MM-DD) */
  checkedOn?: string | null;
}

export interface PriceState {
  kind: PriceKind;
  hasDiscount: boolean;
  /** قیمت قدیمی‌تر از آستانه (یا بدون تاریخ) */
  stale: boolean;
  /** «تقریبی» قابل خرید نیست و باید بازبینی شود */
  indicative: boolean;
}

const DAY_MS = 86_400_000;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** دقیقاً `days` روز پیش هنوز تازه است؛ هم‌منطق با backend/apps/catalog/freshness.py */
export function isStale(checkedOn: string | null | undefined, today: Date = new Date(), days = 7): boolean {
  if (!checkedOn || !/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)) return true;
  const t = Math.floor(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) / DAY_MS);
  return dayNumber(checkedOn) < t - days;
}

export function priceState(input: PriceInput, today: Date = new Date(), staleDays = 7): PriceState {
  if (input.finalCents == null) return { kind: "contact", hasDiscount: false, stale: false, indicative: false };
  const kind: PriceKind = input.note === "approx" ? "approx" : input.note === "from" ? "from" : "exact";
  const hasDiscount = (input.discountPercent ?? 0) > 0 && input.priceCents != null && input.priceCents > input.finalCents;
  return { kind, hasDiscount, stale: isStale(input.checkedOn, today, staleDays), indicative: kind === "approx" };
}
