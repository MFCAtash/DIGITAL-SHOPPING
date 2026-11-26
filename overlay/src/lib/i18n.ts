import messages from "./i18n-messages.json";

export const LANGS = { en: { label: "English", dir: "ltr" }, fa: { label: "فارسی", dir: "rtl" }, de: { label: "Deutsch", dir: "ltr" } } as const;
export type Lang = keyof typeof LANGS;
export const DEFAULT_LANG: Lang = "en";

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** فقط کلیدهای خود LANGS؛ کلیدهای prototype مثل "constructor" یا "__proto__" (مثلاً از localStorage دستکاری‌شده) رد می‌شوند. */
export const isLang = (v: unknown): v is Lang => typeof v === "string" && has(LANGS, v);

type Dict = Record<string, string>;
const dict = messages as Record<Lang, Dict>;

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const pick = (l: Lang) => (has(dict[l], key) ? dict[l][key] : undefined);
  let s = pick(isLang(lang) ? lang : DEFAULT_LANG) ?? pick(DEFAULT_LANG) ?? key;
  if (vars) {
    // تابع جایگزین: الگوهای ویژهٔ $& و $$ در مقدار متغیر تفسیر نمی‌شوند؛ همهٔ تکرارها جایگزین می‌شوند.
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}
