import { cx } from "../lib/cx";
import { buildStepChart, type PricePoint } from "../lib/chart";
import { formatToman, formatUsdCents, toFaDigits, type FormatLocale } from "../lib/format";
import { priceState, type PriceNote } from "../lib/price-state";
import { stockLevel, type StockLevel } from "../lib/stock";
import { Icon, type IconName } from "../icons/Icon";
import { Badge } from "./feedback";

/* ---------- PriceTag ---------- */

export interface PriceTagProps {
  /** قیمت نهایی (تومان) یا null ⇒ «تماس بگیرید» */
  finalToman: number | null;
  /** قیمت قبل از تخفیف (تومان) */
  oldToman?: number | null;
  finalUsdCents?: number | null;
  discountPercent?: number;
  note?: PriceNote;
  /** تاریخ بررسی قیمت (YYYY-MM-DD) برای نشان «قدیمی» */
  checkedOn?: string | null;
  size?: "md" | "lg";
  showUsd?: boolean;
  /** برای تست و SSR قطعی */
  today?: Date;
  className?: string;
  /** زبان رابط برای اعداد، واحد پول و برچسبها (پیشفرض fa). */
  locale?: FormatLocale;
}

/**
 * قیمت. رنگ سیگنال فقط روی خود قیمت؛ حالت‌ها با متن/آیکون هم گفته می‌شوند (نه فقط رنگ):
 * «از …»، «حدود …» (تقریبی و غیرقابل خرید)، «قیمت ممکن است قدیمی باشد».
 */
export function PriceTag({ finalToman, oldToman, finalUsdCents, discountPercent = 0, note, checkedOn, size = "md", showUsd = true, today, className, locale = "fa" }: PriceTagProps) {
  const st = priceState({ priceCents: oldToman ?? null, finalCents: finalToman, discountPercent, note, checkedOn }, today);
  if (st.kind === "contact") return <span className={cx("cx-price", "cx-price--contact", className)}>{locale === "en" ? "Contact for price" : "برای قیمت تماس بگیرید"}</span>;
  return (
    <div className={cx("cx-price", size === "lg" && "cx-price--lg", className)}>
      <div className="cx-price__row">
        {st.kind === "from" ? <span className="cx-price__prefix">{locale === "en" ? "From" : "از"}</span> : null}
        {st.kind === "approx" ? <span className="cx-price__prefix">{locale === "en" ? "Approx." : "حدود"}</span> : null}
        <data value={finalToman ?? undefined} className="cx-price__value cx-num">{formatToman(finalToman, {}, locale)}</data>
        {st.hasDiscount ? <Badge tone="signal">{locale === "en" ? `${toFaDigits(discountPercent, "en")}% off` : `${toFaDigits(discountPercent)}٪ تخفیف`}</Badge> : null}
      </div>
      {st.hasDiscount && oldToman != null ? (
        <p className="cx-price__old">
          <span className="cx-sr-only">{locale === "en" ? "Previous price: " : "قیمت قبلی: "}</span>
          <s className="cx-num">{formatToman(oldToman, {}, locale)}</s>
        </p>
      ) : null}
      {showUsd && finalUsdCents != null ? <p className="cx-price__usd cx-num" dir="ltr">{formatUsdCents(finalUsdCents, locale)}</p> : null}
    </div>
  );
}

/* ---------- StockIndicator ---------- */

const STOCK_ICON: Record<StockLevel, IconName> = { in: "check", low: "alert", out: "close", unavailable: "info" };

export function stockLabel(level: StockLevel, stock: number): string {
  switch (level) {
    case "in":
      return "موجود";
    case "low":
      return `فقط ${toFaDigits(stock)} عدد باقی مانده`;
    case "out":
      return "ناموجود";
    case "unavailable":
      return "فقط مشاهده (قابل خرید نیست)";
  }
}

/** وضعیت موجودی با آیکون و متن؛ رنگ فقط تأکید است. */
export function StockIndicator({ stock, purchasable = true, className }: { stock: number; purchasable?: boolean; className?: string }) {
  const level = stockLevel(stock, purchasable);
  return (
    <span className={cx("cx-stock", `cx-stock--${level}`, className)}>
      <Icon name={STOCK_ICON[level]} size={16} />
      {stockLabel(level, stock)}
    </span>
  );
}

/* ---------- PriceHistoryChart ---------- */

export interface PriceHistoryChartProps {
  data: readonly PricePoint[];
  width?: number;
  height?: number;
  title?: string;
  className?: string;
  locale?: FormatLocale;
}

/**
 * نمودار پلکانی تاریخچهٔ قیمت (SVG خام). برای صفحه‌خوان: خلاصهٔ متنی + جدول داده‌ها (نمودار به‌تنهایی قابل‌دسترس نیست).
 */
export function PriceHistoryChart({ data, width = 320, height = 120, title, className, locale = "fa" }: PriceHistoryChartProps) {
  const heading = title ?? (locale === "en" ? "Price history" : "تاریخچهٔ قیمت");
  const g = buildStepChart(data, width, height);
  if (g.points.length === 0) return <p className="cx-chart__empty">{locale === "en" ? "No price history recorded yet." : "هنوز تاریخچه‌ای ثبت نشده است."}</p>;
  const last = g.points[g.points.length - 1]!;
  const summary = locale === "en"
    ? `${heading}: min ${formatToman(g.min, {}, locale)}, max ${formatToman(g.max, {}, locale)}, current ${formatToman(last.v, {}, locale)}.`
    : `${heading}: کمترین ${formatToman(g.min)}، بیشترین ${formatToman(g.max)}، قیمت فعلی ${formatToman(last.v)}.`;
  return (
    <figure className={cx("cx-chart", className)}>
      <figcaption className="cx-chart__title">{heading}</figcaption>
      <div className="cx-chart__plot">
        <span className="cx-chart__label cx-num">{formatToman(g.max, { unit: false }, locale)}</span>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={summary} preserveAspectRatio="none" className="cx-chart__svg">
          <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} className="cx-chart__axis" />
          <path d={g.d} className="cx-chart__line" fill="none" vectorEffect="non-scaling-stroke" />
          <circle cx={last.x} cy={last.y} r="3.5" className="cx-chart__dot" />
        </svg>
        <span className="cx-chart__label cx-num">{formatToman(g.min, { unit: false }, locale)}</span>
      </div>
      <details className="cx-chart__data">
        <summary>{locale === "en" ? "Values table" : "جدول مقادیر"}</summary>
        <table>
          <thead>
            <tr><th scope="col">{locale === "en" ? "Date" : "تاریخ"}</th><th scope="col">{locale === "en" ? "Price (IRR)" : "قیمت (تومان)"}</th></tr>
          </thead>
          <tbody>
            {g.points.map((p) => (
              <tr key={`${p.label}-${p.v}`}>
                <th scope="row">{p.label}</th>
                <td className="cx-num">{formatToman(p.v, { unit: false }, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
