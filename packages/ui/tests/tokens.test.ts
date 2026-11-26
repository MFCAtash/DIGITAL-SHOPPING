import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio, luminance, parseHex, toHex } from "../src/lib/contrast";
import { FALLBACKS } from "../src/lib/adaptive-accent";
import { buildTokensCss, colors, contrastPairs, GALAXY_THEMES, radius } from "../src/tokens/tokens";

test("ریاضی کنتراست (مقادیر مرجع WCAG)", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF").toFixed(2), "21.00");
  assert.equal(contrastRatio("#FFFFFF", "#FFFFFF").toFixed(2), "1.00");
  assert.equal(contrastRatio("#777777", "#FFFFFF").toFixed(2), "4.48");
  assert.ok(luminance("#FFFFFF") > luminance("#000000"));
  assert.deepEqual(parseHex("#0a141e"), [10, 20, 30]);
  assert.equal(toHex([10, 20, 30]), "#0A141E");
  assert.throws(() => parseHex("red"));
});

test("همهٔ جفت‌های کنتراست توکن‌ها در هر دو تم قبول‌اند", () => {
  for (const theme of ["light", "dark"] as const)
    for (const p of contrastPairs) {
      const ratio = contrastRatio(colors[theme][p.fg], colors[theme][p.bg]);
      assert.ok(ratio >= p.min, `${theme}: ${p.fg}/${p.bg} = ${ratio.toFixed(2)} < ${p.min} (${p.why})`);
    }
});

test("قواعد طراحی در توکن‌ها", () => {
  // شعاع‌ها ۰ تا ۴px (به‌جز round برای سوییچ و نقطه)
  for (const [k, v] of Object.entries(radius)) if (k !== "round") assert.ok(parseInt(v, 10) <= 4, `radius ${k}`);
  // طلای برند هرگز در جفت‌های متنی نیست
  assert.ok(!contrastPairs.some((p) => p.fg === "gold" || p.bg === "gold"));
  // تم‌ها کلیدهای یکسان دارند
  assert.deepEqual(Object.keys(colors.light), Object.keys(colors.dark));
});

test("tokens.css قطعی است و هر دو تم + حالت اجباری دارد", () => {
  const css = buildTokensCss();
  assert.equal(css, buildTokensCss());
  assert.match(css, /--cx-signal: #C42E16;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.ok(!/gradient/i.test(css));
});

test("تمهای کهکشانی تمام جفتهای کنتراست را رعایت میکنند", () => {
  for (const theme of GALAXY_THEMES) {
    for (const pair of contrastPairs) {
      const ratio = contrastRatio(colors[theme][pair.fg], colors[theme][pair.bg]);
      assert.ok(ratio >= pair.min, `${theme}: ${pair.fg} on ${pair.bg} = ${ratio.toFixed(2)} < ${pair.min}`);
    }
  }
});

test("رنگ‌های امن رنگ تطبیقی با توکنهای هر تم کنتراست کافی دارند", () => {
  for (const theme of ["light", "dark"] as const) {
    const f = FALLBACKS[theme];
    assert.equal(f.accent.toLowerCase(), colors[theme].muted.toLowerCase());
    for (const bg of [colors[theme].bg, colors[theme].surface]) assert.ok(contrastRatio(f.accent, bg) >= 4.5, `${theme} fallback on ${bg}`);
    assert.ok(contrastRatio(f.ink, f.accent) >= 4.5, `${theme} fallback ink`);
  }
});

test("صحنهٔ عکس (media): روشن‌تر از پس‌زمینهٔ تاریک و تیره‌تر از سفید تا عکس‌های سفید حل شوند", () => {
  for (const theme of ["light", "dark"] as const) {
    const ratioToWhite = contrastRatio(colors[theme].media, "#FFFFFF");
    assert.ok(ratioToWhite > 1.05 && ratioToWhite < 1.6, `${theme}: media باید به سفید نزدیک (نه سفید خالص) باشد، ${ratioToWhite.toFixed(2)}`);
  }
  // در تم تاریک هم صحنه روشن می‌ماند (عکس‌ها روی پس‌زمینهٔ سفیدند)
  assert.ok(contrastRatio(colors.dark.media, colors.dark.bg) > 8);
});
