// ساخت پیش‌نمایش تعاملی: preview/design-system.html (SSR + هیدراسیون واقعی با خود کامپوننت‌ها).
// بیلد: esbuild (SSR برای Node و bundle مرورگر). نیازمند react و react-dom (devDependencies).
import { build } from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(pkg, "..", "..");
const read = (p) => readFileSync(join(pkg, p), "utf8");

const catalog = JSON.parse(readFileSync(join(repo, "overlay/data/real-catalog.json"), "utf8"));
// همان سیاست HIDDEN_BRANDS که در API بکاند اعمال میشود، در پیشنمایش هم رعایت شود.
const hiddenBrands = new Set((process.env.HIDDEN_BRANDS ?? "Starlink").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
let dominant = {};
try { dominant = JSON.parse(readFileSync(join(repo, "overlay/data/adaptive-colors.json"), "utf8")); } catch { /* اختیاری */ }

const data = {
  rate: 100_000, // نرخ نمایشی؛ نرخ واقعی از ادمین می‌آید
  imageBase: "../../../overlay/public/products",
  today: new Date().toISOString().slice(0, 10),
  items: catalog.products.filter((p) => !hiddenBrands.has(String(p.brand ?? "").toLowerCase())).map((p) => ({
    slug: p.slug, name: p.name, brand: p.brand, usd_cents: p.usd_cents ?? null, discount_percent: p.discount_percent ?? 0,
    price_note: p.price_note ?? null, stock: p.stock ?? 0, specs: typeof p.specs === "object" ? p.specs : {}, images: p.images ?? [], dominant: dominant[p.slug] ?? null,
  })),
};

// پوشهٔ موقت داخل پکیج تا import «react» از node_modules همین پکیج حل شود
const tmp = join(pkg, ".build-preview");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
try {
  await build({ entryPoints: [join(pkg, "preview/Preview.tsx")], outfile: join(tmp, "ssr.mjs"), bundle: true, format: "esm", platform: "node", packages: "external", jsx: "automatic", logLevel: "error" });
  await build({ entryPoints: [join(pkg, "preview/client.tsx")], outfile: join(tmp, "client.js"), bundle: true, format: "iife", platform: "browser", minify: true, jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, logLevel: "error" });
  const { Preview } = await import(pathToFileURL(join(tmp, "ssr.mjs")).href);
  const React = (await import("react")).default;
  const { renderToString } = await import("react-dom/server");
  const body = renderToString(React.createElement(Preview, { data }));
  const css = ["src/styles/tokens.css", "src/styles/base.css", "src/styles/components.css", "preview/preview.css"].map(read).join("\n");
  const js = readFileSync(join(tmp, "client.js"), "utf8");
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>سیستم طراحی Digital Shopping — پیش‌نمایش</title>
<style>${css}</style>
</head>
<body>
<div id="root">${body}</div>
<script>window.__PREVIEW__=${json};</script>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
  const out = join(pkg, "preview/design-system.html");
  writeFileSync(out, html);
  console.log(`نوشته شد: ${out} (${(html.length / 1024).toFixed(0)}KB)`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
