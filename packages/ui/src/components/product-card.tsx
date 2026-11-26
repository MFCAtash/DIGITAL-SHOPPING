import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import type { PriceNote } from "../lib/price-state";
import { PriceTag } from "./price";
import type { FormatLocale } from "../lib/format";

export interface ProductSummary {
  slug: string;
  name: string;
  brand?: string;
  href: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  finalToman: number | null;
  oldToman?: number | null;
  finalUsdCents?: number | null;
  discountPercent?: number;
  priceNote?: PriceNote;
  priceCheckedOn?: string | null;
  stock: number;
  purchasable?: boolean;
  /** مشخصات کوتاه زیر عنوان (مثلاً «۱۲ گیگ رم · ۲۵۶ گیگ حافظه») */
  highlights?: readonly string[];
}

export type ProductCardVariant = "grid" | "list" | "compact" | "compare";

export interface ProductCardProps {
  product: ProductSummary;
  variant?: ProductCardVariant;
  /** دکمه‌های علاقه‌مندی، مقایسه و … */
  actions?: ReactNode;
  /** جایگزین اختیاری تصویر (`next/image` در اپ Next) بدون وابستگی پکیج UI به Next. */
  image?: ReactNode;
  /** برای تصویر بالای صفحه (LCP) */
  priority?: boolean;
  today?: Date;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  locale?: FormatLocale;
}

/**
 * کارت کالا. عنوان یک پیوند است که با ::after کل کارت را قابل‌کلیک می‌کند (بدون پیوند تکراری برای صفحه‌خوان؛
 * تصویر تزئینی است). ابعاد تصویر مشخص است تا CLS نداشته باشیم. قیمت و موجودی با متن هم گفته می‌شوند.
 */
export function ProductCard({ product: p, variant = "grid", actions, image, priority = false, today, headingLevel = 3, className, locale = "fa" }: ProductCardProps) {
  const H = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <article className={cx("cx-card", `cx-card--${variant}`, className)}>
      {image ?? (p.imageSrc ? (
        <div className="cx-card__media">
          <img src={p.imageSrc} alt="" width={p.imageWidth ?? 400} height={p.imageHeight ?? 500} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : undefined} />
        </div>
      ) : null)}
      <div className="cx-card__body">
        {p.brand ? <p className="cx-card__brand">{p.brand}</p> : null}
        <H className="cx-card__title">
          <a href={p.href} className="cx-card__link"><bdi>{p.name}</bdi></a>
        </H>
        {variant !== "compact" && p.highlights?.length ? <p className="cx-card__spec">{p.highlights.join(" · ")}</p> : null}
        <PriceTag
          finalToman={p.finalToman}
          oldToman={p.oldToman}
          finalUsdCents={variant === "grid" || variant === "list" ? p.finalUsdCents : null}
          discountPercent={p.discountPercent}
          note={p.priceNote}
          checkedOn={p.priceCheckedOn}
          today={today}
          locale={locale}
        />
      </div>
      {actions ? <div className="cx-card__actions">{actions}</div> : null}
    </article>
  );
}
