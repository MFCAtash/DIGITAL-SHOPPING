export type PageItem = number | "gap";

/** صفحه‌بندی فشرده: همیشه اولین و آخرین صفحه + همسایه‌های صفحهٔ جاری؛ فاصله‌ها «gap». */
export function pageRange(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 0) return [];
  const cur = Math.min(Math.max(1, current), total);
  const start = Math.max(2, cur - siblings);
  const end = Math.min(total - 1, cur + siblings);
  const out: PageItem[] = [1];
  if (start > 2) out.push(start === 3 ? 2 : "gap");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push(end === total - 2 ? total - 1 : "gap");
  if (total > 1) out.push(total);
  return out;
}
