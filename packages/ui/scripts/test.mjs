// اجرای تست‌ها: هر tests/*.test.ts(x) با esbuild به ESM تبدیل (وابستگی‌های npm بیرونی می‌مانند) و با node --test اجرا می‌شود.
import { build } from "esbuild";
import { readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".build");
rmSync(out, { recursive: true, force: true });
const entries = readdirSync(join(root, "tests")).filter((f) => /\.test\.tsx?$/.test(f)).map((f) => join(root, "tests", f));
await build({
  entryPoints: entries,
  outdir: out,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  jsx: "automatic",
  outExtension: { ".js": ".mjs" },
  logLevel: "error",
});
const files = readdirSync(out).filter((f) => f.endsWith(".mjs")).map((f) => join(out, f));
const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
