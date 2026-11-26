"use client";
import { LANGS, type Lang } from "@/lib/i18n";
import { useLang } from "./LangProvider";

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-sw" role="group" aria-label="Language">
      {(Object.keys(LANGS) as Lang[]).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{LANGS[l].label}</button>
      ))}
    </div>
  );
}
