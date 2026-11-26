/** منطق خالص تقسیمبندی A/B (بدون وابستگی به next/headers تا در middleware هم قابل استفاده باشد). */
export type Variant = "A" | "B";

export const EXPERIMENTS = { hero: "hero", trustOrder: "trust_order" } as const;

export function bucket(key: string, id: string): Variant {
  let h = 2166136261;
  for (const ch of `${key}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2 === 0 ? "A" : "B";
}
