/** تایمر رزرو موجودی (همان ORDER_EXPIRY_MINUTES سمت سرور). */

export function remainingSeconds(expiresAt: string | number | Date, now: number = Date.now()): number {
  const end = expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - now) / 1000));
}

export type Urgency = "normal" | "warn" | "expired";

export function urgency(seconds: number, warnAt = 120): Urgency {
  if (seconds <= 0) return "expired";
  return seconds <= warnAt ? "warn" : "normal";
}

/** صفحه‌خوان فقط هر دقیقه و در آستانه‌ها اعلام می‌کند، نه هر ثانیه. */
export function shouldAnnounce(seconds: number): boolean {
  return seconds <= 0 || seconds === 30 || seconds === 10 || (seconds > 0 && seconds % 60 === 0);
}
