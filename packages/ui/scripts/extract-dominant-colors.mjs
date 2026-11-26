// رنگ غالب هر کالا را از اولین عکسش استخراج می‌کند (جهت C در ADR-002) و در overlay/data/adaptive-colors.json می‌نویسد.
// الگوریتم: کوچک‌سازی ۴۸×۴۸ ← حذف پیکسل‌های شفاف/تقریباً سفید/تقریباً سیاه/کم‌رنگ ← جعبه‌بندی فام در ۲۴ سطل ←
// سطل با بیشترین وزن (شمار × اشباع) ← میانگین رنگ همان سطل. اگر رنگ معناداری نبود null (UI رنگ خنثی می‌گذارد).
// استفاده: npm run extract-colors  (نیازمند sharp)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const catalog = JSON.parse(readFileSync(join(root, "overlay/data/real-catalog.json"), "utf8"));
const BINS = 24;

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max ? d / max : 0, max / 255];
}

export async function dominant(file) {
  const { data, info } = await sharp(file).resize(48, 48, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = Array.from({ length: BINS }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 200) continue;
    const [h, s, v] = rgbToHsv(r, g, b);
    if (s < 0.25 || v < 0.18 || v > 0.97) continue; // خنثی، خیلی تیره یا خیلی روشن
    const bin = bins[Math.floor(h / (360 / BINS)) % BINS];
    const w = s * s; // رنگ‌های اشباع‌تر وزن بیشتری دارند
    bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
  }
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  if (best.w < 1.5) return null; // رنگ معنادار پیدا نشد
  const hex = [best.r, best.g, best.b].map((c) => Math.round(c / best.w).toString(16).padStart(2, "0")).join("");
  return `#${hex.toUpperCase()}`;
}

const out = {};
for (const p of catalog.products) {
  const first = p.images?.[0]?.file;
  if (!first) { out[p.slug] = null; continue; }
  try {
    out[p.slug] = await dominant(join(root, "overlay/public/products", first));
  } catch (e) {
    console.warn(`رد شد (${p.slug}): ${e.message}`);
    out[p.slug] = null;
  }
}
const target = join(root, "overlay/data/adaptive-colors.json");
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`${Object.values(out).filter(Boolean).length}/${Object.keys(out).length} کالا رنگ غالب دارند → ${target}`);
