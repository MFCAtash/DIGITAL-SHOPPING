// بررسی کاتالوگ پیش از سید/انتشار. اجرا: node scripts/verify-catalog.mjs  (کد خروج ۱ در صورت خطا)
import { existsSync, readFileSync, readdirSync } from "node:fs";
const R = (p) => new URL("../" + p, import.meta.url);
const cat = JSON.parse(readFileSync(R("data/real-catalog.json"), "utf8"));
const M = JSON.parse(readFileSync(R("src/lib/i18n-messages.json"), "utf8"));
const errors = [], warns = [];
const files = new Set(readdirSync(R("public/products")));
const used = new Set(), slugs = new Set();
const catSlugs = new Set(cat.categories.map((c) => c.slug));
for (const p of cat.products) {
  const id = p.slug;
  if (!/^[a-z0-9-]+$/.test(id ?? "")) errors.push(`${id}: slug نامعتبر`);
  if (slugs.has(id)) errors.push(`${id}: slug تکراری`); slugs.add(id);
  if (!catSlugs.has(p.category)) errors.push(`${id}: دستهٔ ناشناخته ${p.category}`);
  if (!p.brand) errors.push(`${id}: برند ندارد`);
  if (!p.description) errors.push(`${id}: توضیح ندارد`);
  if (!Number.isInteger(p.stock) || p.stock < 0) errors.push(`${id}: stock نامعتبر`);
  const live = p.usd_cents != null;
  if (live && !(Number.isInteger(p.usd_cents) && p.usd_cents > 0)) errors.push(`${id}: usd_cents نامعتبر`);
  if (live && !/^https:\/\//.test(p.source ?? "")) errors.push(`${id}: source باید https باشد`);
  if (live && !(p.images ?? []).length) errors.push(`${id}: آگهی قیمت‌دار بدون عکس (طبق قانون پروژه باید عکس داشته باشد)`);
  if (!live) warns.push(`${id}: بدون قیمت؛ وارد سید و پیش‌نمایش نمی‌شود`);
  for (const im of p.images ?? []) {
    used.add(im.file);
    if (!files.has(im.file)) errors.push(`${id}: فایل عکس نیست ${im.file}`);
    if (!im.alt) errors.push(`${id}: alt خالی برای ${im.file}`);
    if (!im.file.endsWith(".webp")) errors.push(`${id}: عکس باید webp باشد ${im.file}`);
  }
  for (const k of Object.keys(p.specs ?? {})) if (!M.en["spec." + k]) errors.push(`${id}: کلید مشخصات بدون ترجمه ${k}`);
}
for (const f of files) if (!used.has(f)) warns.push(`عکس بدون آگهی: ${f}`);
const en = Object.keys(M.en);
for (const l of Object.keys(M)) {
  const k = Object.keys(M[l]);
  const miss = en.filter((x) => !k.includes(x)), extra = k.filter((x) => !en.includes(x));
  if (miss.length || extra.length) errors.push(`i18n ${l}: کم ${miss} اضافه ${extra}`);
}
console.log(`محصولات: ${cat.products.length} | قیمت‌دار: ${cat.products.filter((p) => p.usd_cents).length} | عکس‌ها: ${used.size}`);
for (const w of warns) console.log("هشدار:", w);
if (errors.length) { console.error("خطا:\n- " + errors.join("\n- ")); process.exit(1); }
console.log("کاتالوگ سالم است.");
