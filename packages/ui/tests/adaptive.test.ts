import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveAccent, deriveBoth, FALLBACKS } from "../src/lib/adaptive-accent";
import { hexToHsl, hslToHex } from "../src/lib/color";
import { contrastRatio } from "../src/lib/contrast";
import { colors } from "../src/tokens/tokens";

const L = { bg: colors.light.bg, surface: colors.light.surface };
const D = { bg: colors.dark.bg, surface: colors.dark.surface };

test("تبدیل HSL رفت‌وبرگشتی", () => {
  for (const hex of ["#C42E16", "#1F7A4D", "#2563EB", "#F0D36B", "#808080"]) {
    const [h, s, l] = hexToHsl(hex);
    const back = hslToHex(h, s, l);
    // خطای گردکردن حداکثر یک واحد در هر کانال
    const diff = [1, 3, 5].map((i) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(back.slice(i, i + 2), 16)));
    assert.ok(Math.max(...diff) <= 1, `${hex} → ${back}`);
  }
});

test("رنگ تطبیقی: کنتراست ≥ ۴٫۵ با پس‌زمینه و سطح در هر دو تم، برای رنگ‌های متنوع", () => {
  const samples = ["#FFD60A", "#00C2FF", "#34C759", "#FF2D55", "#5856D6", "#FF9500", "#B8892B", "#1E1E1E", "#EEEEEE", "#000000"];
  for (const hex of samples) {
    const both = deriveBoth(hex, L, D);
    for (const [theme, s] of [["light", L], ["dark", D]] as const) {
      const a = both[theme];
      assert.ok(contrastRatio(a.accent, s.bg) >= 4.5, `${hex} ${theme} bg`);
      assert.ok(contrastRatio(a.accent, s.surface) >= 4.5, `${hex} ${theme} surface`);
      assert.ok(contrastRatio(a.ink, a.accent) >= 4.5, `${hex} ${theme} ink`);
    }
  }
});

test("فام حفظ می‌شود و رنگ خنثی/نامعتبر به رنگ امن می‌رسد", () => {
  const [h0] = hexToHsl("#2563EB");
  const [h1] = hexToHsl(deriveAccent("#2563EB", "light", L).accent);
  assert.ok(Math.abs(h0 - h1) < 6);
  assert.deepEqual(deriveAccent("#808080", "light", L), FALLBACKS.light);
  assert.deepEqual(deriveAccent("#FFFFFF", "dark", D), FALLBACKS.dark);
  assert.deepEqual(deriveAccent("نامعتبر", "light", L), FALLBACKS.light);
  assert.deepEqual(deriveAccent("نامعتبر", "dark", D), FALLBACKS.dark);
});

test("زرد روشن در تم روشن تیره می‌شود و در تم تاریک روشن می‌ماند", () => {
  const light = deriveAccent("#FFD60A", "light", L);
  const dark = deriveAccent("#FFD60A", "dark", D);
  assert.ok(hexToHsl(light.accent)[2] < hexToHsl("#FFD60A")[2]);
  assert.ok(contrastRatio(dark.accent, D.bg) >= 4.5);
});
