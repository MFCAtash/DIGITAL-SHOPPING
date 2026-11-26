import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import { applyTheme, themeInitScript, THEME_KEY } from "../src/lib/theme";
import { colors } from "../src/tokens/tokens";

const requireCjs = createRequire(import.meta.url);

test("اسکریپت init تم: از localStorage می‌خواند و بدون مقدار دست نمی‌زند", () => {
  const run = (stored: string | null, throws = false) => {
    const attrs: Record<string, string> = {};
    vm.runInNewContext(themeInitScript, {
      localStorage: { getItem: () => { if (throws) throw new Error("denied"); return stored; } },
      document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    });
    return attrs;
  };
  assert.deepEqual(run("dark"), { "data-theme": "dark" });
  assert.deepEqual(run("light"), { "data-theme": "light" });
  assert.deepEqual(run(null), { "data-theme": "nebula", "data-cosmic": "true" });
  assert.deepEqual(run("evil\"><script>"), { "data-theme": "nebula", "data-cosmic": "true" }); // مقدار ناشناخته نادیده گرفته و تم پیشفرض بنفش اعمال میشود
  assert.deepEqual(run("dark", true), {}); // حالت خصوصی/ممنوعیت storage خطا نمی‌دهد
  assert.ok(!/<\/script/i.test(themeInitScript));
});

test("applyTheme: اعمال، ذخیره، بازگشت به سیستم و تحمل خطای storage", () => {
  const attrs: Record<string, string> = {};
  const store: Record<string, string> = {};
  const root = { setAttribute: (k: string, v: string) => (attrs[k] = v), removeAttribute: (k: string) => delete attrs[k] };
  const storage = { setItem: (k: string, v: string) => (store[k] = v), removeItem: (k: string) => delete store[k] };
  applyTheme("dark", root, storage);
  assert.deepEqual([attrs["data-theme"], store[THEME_KEY]], ["dark", "dark"]);
  applyTheme("system", root, storage);
  assert.deepEqual([attrs["data-theme"], store[THEME_KEY]], [undefined, undefined]);
  const broken = { setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("quota"); } };
  applyTheme("light", root, broken); // نباید پرتاب کند
  assert.equal(attrs["data-theme"], "light");
  applyTheme("system", root, broken);
  applyTheme("dark", root, null);
});

test("پیش‌تنظیم Tailwind: رنگ‌ها فقط توکن، بدون سایه/گرادیان/blur", () => {
  const preset = requireCjs("../tailwind.preset.cjs");
  const tokenKeys = Object.keys(colors.light).filter((k) => k !== "focus");
  for (const k of tokenKeys) {
    const twName = k === "text" ? "ink" : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    assert.ok(preset.theme.colors[twName], `رنگ ${twName} در پیش‌تنظیم نیست`);
    assert.match(preset.theme.colors[twName], /^var\(--cx-[a-z-]+\)$/);
  }
  assert.equal(preset.theme.colors.red, undefined); // رنگ‌های پیش‌فرض Tailwind حذف شده‌اند
  assert.deepEqual(preset.theme.boxShadow, { none: "none" });
  for (const p of ["backgroundImage", "gradientColorStops", "boxShadow", "dropShadow", "blur", "backdropBlur"]) assert.equal(preset.corePlugins[p], false, p);
  for (const r of Object.values(preset.theme.borderRadius) as string[]) assert.ok(r === "9999px" || parseInt(r, 10) <= 4);
});
