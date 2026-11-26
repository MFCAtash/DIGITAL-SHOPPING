"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { t as translate, type Locale } from "@/lib/i18n";

interface I18nValue {
  locale: Locale;
  t: (key: string) => string;
}

const Ctx = createContext<I18nValue>({ locale: "fa", t: (key) => translate(key, "fa") });

function fromDocument(): Locale {
  return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "fa";
}

/** زبان را از <html lang> میخواند و با تغییر سوئیچ زبان، دیکشنری را زنده بهروز میکند. */
export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  // مقدار سرور دقیقاً همان چیزی است که در <html lang> نوشته شده؛ روی کلاینت نیز از آن خوانده میشود.
  const [locale, setLocale] = useState<Locale>(() => initialLocale ?? fromDocument());

  useEffect(() => {
    const sync = () => setLocale(fromDocument());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  return <Ctx.Provider value={{ locale, t: (key) => translate(key, locale) }}>{children}</Ctx.Provider>;
}

export function useT(): I18nValue {
  return useContext(Ctx);
}
