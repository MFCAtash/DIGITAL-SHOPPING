"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

const LABEL: Record<Locale, string> = { fa: "FA", en: "EN" };

/** ذخیرهٔ زبان در کوکی و تازهسازی سرور تا جهت سند (rtl/ltr) و محتوا هماهنگ شوند. */
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const next = locale === "fa" ? "en" : "fa";
  const label = t(next === "fa" ? "locale.toFa" : "locale.toEn", locale);

  function change() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
    router.refresh();
  }

  return (
    <button
      type="button"
      className="cx-btn cx-btn--ghost cx-btn--sm site-header__icon"
      onClick={change}
      aria-label={`${LABEL[next]} — ${label}`}
      title={`${t("locale.current", locale)}${locale.toUpperCase()}`}
    >
      <span aria-hidden="true">{LABEL[next]}</span>
    </button>
  );
}

export { LOCALES };
