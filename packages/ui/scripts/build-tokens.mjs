// تولید (یا بررسی همگامی) src/styles/tokens.css از src/tokens/tokens.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTs } from "./_load.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/styles/tokens.css");
const { buildTokensCss } = await loadTs(join(root, "src/tokens/tokens.ts"));
const next = buildTokensCss();

if (process.argv.includes("--check")) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== next) {
    console.error("tokens.css با tokens.ts همگام نیست. «npm run tokens:build» را اجرا و commit کنید.");
    process.exit(1);
  }
  console.log("tokens.css همگام است.");
} else {
  writeFileSync(target, next);
  console.log(`نوشته شد: ${target}`);
}
