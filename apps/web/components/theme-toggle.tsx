"use client";

import { useEffect, useState } from "react";
import { ALL_THEMES, applyTheme, GALAXY_LABELS, isGalaxyTheme, type ThemePreference } from "@digital-shopping/ui";
import { useT } from "./locale-provider";
const GLYPH: Record<ThemePreference, string> = {
  light: "☀", dark: "☾", system: "◐",
  nebula: "✦", aurora: "❋", solar: "◉", ocean: "◍", rose: "✿", silver: "◇",
};

/** چرخش ساده میان تمام پوستهها: کاغذ گرم، شب مخملی و شش تم کهکشانی. */
export function ThemeToggle() {
  const { t } = useT();
  const [pref, setPref] = useState<ThemePreference>("nebula");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cx-theme");
      if (saved && (ALL_THEMES as readonly string[]).includes(saved)) setPref(saved as ThemePreference);
    } catch {
      /* حالت خصوصی */
    }
    const sync = (e: Event) => setPref((e as CustomEvent<ThemePreference>).detail);
    window.addEventListener("cx:theme-change", sync);
    return () => window.removeEventListener("cx:theme-change", sync);
  }, []);

  function next() {
    const value = ALL_THEMES[(ALL_THEMES.indexOf(pref) + 1) % ALL_THEMES.length];
    setPref(value);
    applyTheme(value);
    if (isGalaxyTheme(value)) document.documentElement.setAttribute("data-cosmic", "true");
    else document.documentElement.removeAttribute("data-cosmic");
    window.dispatchEvent(new CustomEvent("cx:theme-change", { detail: value }));
  }

  const label = pref === "light" ? t("theme.light") : pref === "dark" ? t("theme.dark") : pref === "system" ? t("theme.system") : GALAXY_LABELS[pref];
  return (
    <button
      type="button"
      className="cx-btn cx-btn--ghost cx-btn--sm site-header__icon"
      onClick={next}
      aria-label={`${t("theme.prefix")}${label}`}
      title={`${t("theme.prefix")}${label}`}
      data-galaxy={isGalaxyTheme(pref)}
    >
      <span aria-hidden="true">{GLYPH[pref]}</span>
      <span className="cx-sr-only">{label}</span>
    </button>
  );
}
