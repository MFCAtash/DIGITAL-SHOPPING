// بارگذاری فایل TypeScript بدون ابزار اضافه: با esbuild به یک ماژول موقت تبدیل و import می‌شود.
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function loadTs(entry) {
  const dir = mkdtempSync(join(tmpdir(), "cx-ui-"));
  const out = join(dir, "m.mjs");
  try {
    await build({ entryPoints: [resolve(entry)], outfile: out, bundle: true, format: "esm", platform: "node", logLevel: "silent" });
    return await import(pathToFileURL(out).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
