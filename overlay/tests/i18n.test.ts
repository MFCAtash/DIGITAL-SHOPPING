import { describe, expect, it } from "vitest";
import { DEFAULT_LANG, LANGS, isLang, translate } from "@/lib/i18n";
import messages from "@/lib/i18n-messages.json";

describe("i18n", () => {
  it("accepts only real languages (no prototype keys)", () => {
    expect(isLang("fa")).toBe(true);
    expect(isLang("constructor")).toBe(false);
    expect(isLang("__proto__")).toBe(false);
    expect(isLang("toString")).toBe(false);
    expect(isLang(null)).toBe(false);
  });
  it("falls back to English and then to the key", () => {
    expect(translate("fa", "search")).toBe(messages.fa.search);
    expect(translate("en", "no.such.key")).toBe("no.such.key");
    expect(translate("en", "constructor")).toBe("constructor");
    expect(translate("constructor" as never, "search")).toBe(messages[DEFAULT_LANG].search);
  });
  it("substitutes variables literally", () => {
    expect(translate("en", "off", { n: 15 })).toBe("15% off");
    expect(translate("en", "off", { n: "$&" })).toBe("$&% off");
    expect(translate("en", "cmpCount", { n: 2 })).toBe("Compare (2 of 3)");
  });
  it("has identical keys and placeholders in every language", () => {
    const en = Object.keys(messages.en).sort();
    for (const l of Object.keys(LANGS)) {
      const m = (messages as Record<string, Record<string, string>>)[l];
      expect(Object.keys(m).sort().join("|")).toBe(en.join("|"));
      for (const k of en) expect((m[k].match(/\{\w+\}/g) ?? []).sort().join()).toBe((messages.en as Record<string, string>)[k].match(/\{\w+\}/g)?.sort().join() ?? "");
    }
  });
});
