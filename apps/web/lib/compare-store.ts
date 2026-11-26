const KEY = "cx_compare";
export const MAX_COMPARE = 4;

export function readCompare(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function writeCompare(slugs: string[]): string[] {
  const next = slugs.slice(0, MAX_COMPARE);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function toggleCompare(slug: string): string[] {
  const cur = readCompare();
  return writeCompare(cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug]);
}
