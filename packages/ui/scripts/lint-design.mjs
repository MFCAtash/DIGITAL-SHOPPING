// لینتر قواعد طراحی (ADR-002 / docs/PRINCIPLES.md): ظاهر «ساختهشده با الگوهای تکراری» و تخطی از سیستم را در CI رد می‌کند.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(join(root, "src"));
const css = files.filter((f) => f.endsWith(".css") && !f.endsWith("tokens.css"));
const code = files.filter((f) => /\.(ts|tsx)$/.test(f));

const problems = [];
const add = (file, line, msg) => problems.push(`${relative(root, file)}:${line}  ${msg}`);
const lines = (f) => readFileSync(f, "utf8").split("\n");

const RADIUS_OK = (v) => {
  const t = v.trim();
  if (t === "0" || t === "50%" || /^var\(--cx-radius-(0|1|2|round)\)$/.test(t)) return true;
  const m = /^(\d*\.?\d+)(px|rem)$/.exec(t);
  return !!m && (m[2] === "px" ? Number(m[1]) <= 4 : Number(m[1]) * 16 <= 4);
};

for (const f of css) {
  lines(f).forEach((ln, i) => {
    const n = i + 1;
    const l = ln.replace(/\/\*.*?\*\//g, "");
    if (/gradient\(/i.test(l)) add(f, n, "گرادیان ممنوع است (D.۵-۱)");
    if (/backdrop-filter|blur\(/i.test(l)) add(f, n, "blur/backdrop-filter ممنوع است (حباب درخشان و شیشه‌ای)");
    if (/box-shadow|text-shadow|drop-shadow/i.test(l)) add(f, n, "سایه ممنوع است؛ از خط نازک (border) استفاده کنید (D.۳)");
    for (const m of l.matchAll(/border-radius:\s*([^;}]+)/g)) {
      for (const v of m[1].split(/\s+/).filter(Boolean)) if (!RADIUS_OK(v)) add(f, n, `شعاع «${v}» از ۴px بیشتر است (فقط ۰ تا ۴px، ۵۰٪ یا توکن)`);
    }
    if (/#[0-9a-fA-F]{3,8}\b/.test(l)) add(f, n, "رنگ هگز خام؛ فقط توکن var(--cx-*) (رنگ‌ها در tokens.ts تعریف می‌شوند)");
    if (/\b(margin|padding)-(left|right)\b|\b(left|right)\s*:|text-align:\s*(left|right)|border-(left|right)\b/.test(l)) add(f, n, "ویژگی فیزیکی چپ/راست؛ از ویژگی منطقی (inline-start/end) استفاده کنید تا RTL درست شود");
    if (/!important/.test(l) && !/\[hidden\]|animation-duration|transition-duration/.test(l)) add(f, n, "!important فقط برای [hidden] و کاهش حرکت مجاز است");
    if (/letter-spacing\s*:\s*(?!0\b)[^\s;]/.test(l)) add(f, n, "letter-spacing غیرصفر روی متن فارسی اتصال حروف را می‌شکند");
    if (/\b(Inter|Space Grotesk|Poppins)\b/.test(l)) add(f, n, "فونت پیش‌فرض‌مآبانه (Inter/Space Grotesk/Poppins) ممنوع است (D.۴)");
  });
}

const EMOJI = /\p{Extended_Pictographic}/u;
for (const f of code) {
  lines(f).forEach((ln, i) => {
    const n = i + 1;
    if (EMOJI.test(ln)) add(f, n, "ایموجی ممنوع است؛ از آیکون خطی <Icon/> استفاده کنید (D.۵-۴)");
    if (/\b(Inter|Space Grotesk|Poppins)\b/.test(ln) && !/لاتین:|ممنوع|کنار بگذارید/.test(ln)) add(f, n, "فونت پیش‌فرض‌مآبانه ممنوع است (D.۴)");
    if (/dangerouslySetInnerHTML/.test(ln)) add(f, n, "dangerouslySetInnerHTML ممنوع است (XSS)");
    if (/\bstyle=\{\{[^}]*(gradient|blur|boxShadow)/.test(ln)) add(f, n, "استایل درون‌خطی ممنوع (گرادیان/سایه/blur)");
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} تخطی از قواعد طراحی.`);
  process.exit(1);
}
console.log(`قواعد طراحی رعایت شده است (${css.length} فایل CSS، ${code.length} فایل کد).`);
