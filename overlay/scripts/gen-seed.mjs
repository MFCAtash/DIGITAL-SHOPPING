// تولید seed-real-products.sql از data/real-catalog.json (یک منبع حقیقت برای داده و SQL)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const cat = JSON.parse(readFileSync(new URL("../data/real-catalog.json", import.meta.url), "utf8"));
const q = (s) => {
  const v = String(s);
  if (v.includes("\u0000")) throw new Error("NUL character in catalog text");
  return "'" + v.replace(/'/g, "''") + "'"; // فرض: standard_conforming_strings=on (پیش‌فرض Postgres و Supabase)
};
const NOTE = { "از": "from", "تقریبی": "approx" };

// اعتبارسنجی کاتالوگ پیش از تولید SQL؛ اعداد و slug مستقیم داخل SQL می‌روند، پس باید دقیقاً همان‌چه انتظار می‌رود باشند.
const errors = [];
const catSlugs = new Set(cat.categories.map((c) => c.slug));
const seen = new Set();
for (const c of cat.categories) {
  if (!/^[a-z0-9-]+$/.test(c.slug ?? "")) errors.push(`category slug نامعتبر: ${c.slug}`);
  if (!Number.isInteger(c.sort ?? 0)) errors.push(`category sort نامعتبر: ${c.slug}`);
}
for (const p of cat.products) {
  const id = p.slug ?? p.name;
  if (!/^[a-z0-9-]+$/.test(p.slug ?? "")) errors.push(`${id}: slug نامعتبر`);
  if (seen.has(p.slug)) errors.push(`${id}: slug تکراری`);
  seen.add(p.slug);
  if (p.usd_cents != null && !(Number.isInteger(p.usd_cents) && p.usd_cents > 0)) errors.push(`${id}: usd_cents باید عدد صحیح مثبت یا null باشد`);
  if (!Number.isInteger(p.stock) || p.stock < 0) errors.push(`${id}: stock باید عدد صحیح ≥ ۰ باشد`);
  if (!catSlugs.has(p.category)) errors.push(`${id}: دستهٔ ناشناخته ${p.category}`);
  if (!/^https:\/\//.test(p.source ?? "")) { if (p.usd_cents) errors.push(`${id}: source باید https باشد`); }
  if (p.checked_on != null && !/^\d{4}-\d{2}-\d{2}$/.test(p.checked_on)) errors.push(`${id}: checked_on باید YYYY-MM-DD باشد`);
  if (p.price_note && !NOTE[p.price_note]) errors.push(`${id}: price_note نامعتبر ${p.price_note}`);
  for (const im of p.images ?? []) if (im.file && !existsSync(new URL("../public/products/" + im.file, import.meta.url))) errors.push(`${id}: فایل عکس وجود ندارد ${im.file}`);
}
if (errors.length) { console.error("خطا در کاتالوگ:\n- " + errors.join("\n- ")); process.exit(1); }

const out = [];
out.push("-- تولیدشده توسط scripts/gen-seed.mjs. دستی ویرایش نکنید؛ data/real-catalog.json را عوض و دوباره تولید کنید.");
out.push("-- ⚠ قبل از اجرا نرخ تبدیل دلار به تومان را در v_rate بنویسید (ستون‌های تومانی سبد و سفارش هنوز لازم‌اند). نرخ عمداً خالی است.");
out.push("-- آگهی‌های بدون قیمت دلاری (مثل TUF) وارد دیتابیس نمی‌شوند.");
out.push("begin;");
out.push("do $seed$"); // برچسب اختصاصی: متن کاتالوگ حتی اگر $$ داشته باشد بلوک را نمی‌شکند
out.push("declare v_rate numeric := null; -- عدد نرخ روز را خودتان اینجا بنویسید");
out.push("begin");
out.push("  if v_rate is null or v_rate <= 0 then raise exception 'SET_V_RATE: نرخ دلار به تومان را در v_rate بنویسید'; end if;");
out.push("  -- انحصاری: همهٔ محصولات قبلی غیرفعال می‌شوند (حذف نمی‌شوند)");
out.push("  update public.products set is_active = false where is_active;");
for (const c of cat.categories) {
  out.push(`  insert into public.categories (slug, name, sort) select ${q(c.slug)}, ${q(c.name)}, ${c.sort ?? 0} where not exists (select 1 from public.categories where slug = ${q(c.slug)});`);
}
let skipped = 0;
for (const p of cat.products) {
  if (!p.usd_cents) { out.push(`  -- بدون قیمت، وارد نشد: ${p.name}`); skipped++; continue; }
  // قانون پروژه: آگهی بدون عکس منتشر نمی‌شود
  if (!(p.images ?? []).some((i) => i.file)) { out.push(`  -- بدون عکس، وارد نشد: ${p.name}`); skipped++; continue; }
  const toman = `round((${p.usd_cents} / 100.0) * v_rate)`;
  const specs = q(JSON.stringify(p.specs));
  const desc = q(p.description ?? "");
  const note = p.price_note ? q(NOTE[p.price_note]) : "null";
  out.push(`  -- ${p.name}`);
  out.push(`  update public.products set name=${q(p.name)}, description=${desc}, is_active=true, price_toman=${toman}, discount_percent=0, stock=${p.stock}, price_usd_cents=${p.usd_cents}, brand=${q(p.brand)}, specs=${specs}::jsonb, price_checked_on=${q(p.checked_on ?? cat.checked_on)}, source_url=${q(p.source)}, price_note=${note} where slug=${q(p.slug)};`);
  out.push(`  insert into public.products (slug, name, description, category_id, price_toman, discount_percent, stock, is_active, price_usd_cents, brand, specs, price_checked_on, source_url, price_note)`);
  out.push(`  select ${q(p.slug)}, ${q(p.name)}, ${desc}, (select id from public.categories where slug=${q(p.category)}), ${toman}, 0, ${p.stock}, true, ${p.usd_cents}, ${q(p.brand)}, ${specs}::jsonb, ${q(p.checked_on ?? cat.checked_on)}, ${q(p.source)}, ${note}`);
  out.push(`  where not exists (select 1 from public.products where slug=${q(p.slug)});`);
  out.push(`  delete from public.product_images where product_id = (select id from public.products where slug=${q(p.slug)});`);
  const imgs = p.images?.length ? p.images : [{ file: null, alt: p.name }];
  imgs.forEach((im, i) => {
    const url = im.file ? `/products/${im.file}` : "/placeholder.svg";
    out.push(`  insert into public.product_images (product_id, url, alt, sort) select id, ${q(url)}, ${q(im.alt)}, ${i} from public.products where slug=${q(p.slug)};`);
  });
}
out.push("end $seed$;");
out.push("commit;");
writeFileSync(new URL("../../legacy/supabase/seed-real-products.sql", import.meta.url), out.join("\n") + "\n");
console.log("imported:", cat.products.length - skipped, "skipped(no price or no image):", skipped);
