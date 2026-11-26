import { cookies } from "next/headers";
import { LOCALES, LOCALE_COOKIE, type Locale } from "./i18n";

/** زبان از کوکی خوانده میشود تا SSR و کلاینت همان جهت و زبان را داشته باشند. */
export async function getLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    const value = jar.get(LOCALE_COOKIE)?.value;
    if (value && (LOCALES as readonly string[]).includes(value)) return value as Locale;
  } catch {
    /* خارج از درخواست (build) */
  }
  return "fa";
}
