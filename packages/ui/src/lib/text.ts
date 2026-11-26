import { toEnDigits } from "./format";

/** نرمال‌سازی برای مقایسه: ی/ک عربی، همزه/تشدید/اعراب، نیم‌فاصله، ارقام، حروف بزرگ. */
export function normalizeFa(input: string): string {
  return toEnDigits(input)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // اعراب و کشیده
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

/** جست‌وجوی ساده روی برچسب: تطبیق پیشوند کلمه‌ها اول می‌آید، سپس شمول. */
export function filterOptions<T extends Option>(options: readonly T[], query: string, limit = 8): T[] {
  const q = normalizeFa(query);
  if (!q) return options.slice(0, limit);
  const starts: T[] = [];
  const contains: T[] = [];
  for (const o of options) {
    const label = normalizeFa(o.label);
    if (label.startsWith(q) || label.split(" ").some((w) => w.startsWith(q))) starts.push(o);
    else if (label.includes(q)) contains.push(o);
  }
  return [...starts, ...contains].slice(0, limit);
}
