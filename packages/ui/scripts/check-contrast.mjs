// سنجش همهٔ جفت‌های کنتراست توکن‌ها در هر دو تم؛ شکست = کد خروج ۱
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTs } from "./_load.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { colors, contrastPairs } = await loadTs(join(root, "src/tokens/tokens.ts"));
const { contrastRatio } = await loadTs(join(root, "src/lib/contrast.ts"));

let failed = 0;
for (const theme of ["light", "dark"]) {
  console.log(`\n[${theme}]`);
  for (const p of contrastPairs) {
    const ratio = contrastRatio(colors[theme][p.fg], colors[theme][p.bg]);
    const ok = ratio >= p.min;
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} ${p.fg} روی ${p.bg}: ${ratio.toFixed(2)} (حداقل ${p.min}) — ${p.why}`);
  }
}
if (failed) {
  console.error(`\n${failed} جفت رنگ کنتراست کافی ندارند.`);
  process.exit(1);
}
console.log("\nهمهٔ جفت‌ها قبول‌اند.");
