/** نمودار پلکانی تاریخچهٔ قیمت (قیمت تا تغییر بعدی ثابت است). خروجی مسیر SVG؛ بدون کتابخانه. */

export interface PricePoint {
  /** برچسب خوانا برای جدول دسترس‌پذیر (مثلاً تاریخ شمسی) */
  label: string;
  /** زمان (ms) برای فاصله‌گذاری افقی */
  t: number;
  /** مقدار (مثلاً تومان) */
  v: number;
}

export interface ChartGeometry {
  d: string;
  points: Array<{ x: number; y: number; label: string; v: number }>;
  min: number;
  max: number;
  width: number;
  height: number;
}

const r = (n: number): number => Math.round(n * 100) / 100;

export function buildStepChart(data: readonly PricePoint[], width: number, height: number, pad = 8): ChartGeometry {
  const pts = [...data].sort((a, b) => a.t - b.t);
  if (pts.length === 0) return { d: "", points: [], min: 0, max: 0, width, height };
  const vs = pts.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const t0 = pts[0]!.t;
  const span = Math.max(1, pts[pts.length - 1]!.t - t0);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const x = (t: number): number => (pts.length === 1 ? width / 2 : pad + ((t - t0) / span) * innerW);
  const y = (v: number): number => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * innerH);
  const coords = pts.map((p) => ({ x: r(x(p.t)), y: r(y(p.v)), label: p.label, v: p.v }));
  let d = `M${coords[0]!.x} ${coords[0]!.y}`;
  for (let i = 1; i < coords.length; i++) d += ` H${coords[i]!.x} V${coords[i]!.y}`;
  if (coords.length > 1) d += ` H${r(pad + innerW)}`; // ادامهٔ آخرین قیمت تا امروز
  return { d, points: coords, min, max, width, height };
}
