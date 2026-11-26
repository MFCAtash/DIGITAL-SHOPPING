/** مدیریت تم روشن/تاریک/کهکشانی بدون «پرش رنگ» هنگام بارگذاری. */
import { GALAXY_THEMES, type GalaxyTheme, type ThemeName } from "../tokens/tokens";

export type ThemePreference = ThemeName | "system";
export const THEME_KEY = "cx-theme";
export const ALL_THEMES: readonly ThemePreference[] = ["light", "dark", ...GALAXY_THEMES];
const VALID = JSON.stringify(ALL_THEMES.filter((t) => t !== "system"));

/**
 * اسکریپت درونخطی برای <head> (پیش از اولین رنگآمیزی).
 * «system» یعنی بدون data-theme تا prefers-color-scheme اعمال شود.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(${VALID}.indexOf(t)>-1){document.documentElement.setAttribute("data-theme",t);if(${JSON.stringify(GALAXY_THEMES)}.indexOf(t)>-1){document.documentElement.setAttribute("data-cosmic","true")}else{document.documentElement.removeAttribute("data-cosmic")}}else{document.documentElement.setAttribute("data-theme","nebula");document.documentElement.setAttribute("data-cosmic","true")}}catch(e){}})();`;

/** تم را اعمال و (در صورت امکان) ذخیره میکند. */
export function applyTheme(
  pref: ThemePreference,
  root: { setAttribute(k: string, v: string): void; removeAttribute(k: string): void } = document.documentElement,
  storage: Pick<Storage, "setItem" | "removeItem"> | null = safeStorage(),
): void {
  if (pref === "system") {
    root.removeAttribute("data-theme");
    try { storage?.removeItem(THEME_KEY); } catch { /* حالت خصوصی مرورگر */ }
    return;
  }
  root.setAttribute("data-theme", pref);
  try { storage?.setItem(THEME_KEY, pref); } catch { /* حالت خصوصی مرورگر */ }
}

/** آیا تم یک پوستهٔ کهکشانی است؟ */
export function isGalaxyTheme(pref: ThemePreference): pref is GalaxyTheme {
  return (GALAXY_THEMES as readonly string[]).includes(pref);
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
