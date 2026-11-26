import { cx } from "../lib/cx";

export interface BrandMarkProps {
  size?: number;
  /** نام فروشگاه کنار نشان */
  wordmark?: string;
  className?: string;
}

/**
 * نشان برند: شمسهٔ هشت‌پر خطی (دو مربع چرخیده + دایره) با طلای برند.
 * طلا فقط همین‌جا و روی نشان‌ها به کار می‌رود، هرگز متن و هرگز گرادیان.
 */
export function BrandMark({ size = 28, wordmark, className }: BrandMarkProps) {
  return (
    <span className={cx("cx-brand", className)}>
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="var(--cx-gold)" strokeWidth={1.4} strokeLinejoin="round" aria-hidden="true" focusable="false">
        <rect x="6.5" y="6.5" width="19" height="19" />
        <rect x="6.5" y="6.5" width="19" height="19" transform="rotate(45 16 16)" />
        <circle cx="16" cy="16" r="4.2" />
      </svg>
      {wordmark ? <span className="cx-brand__word">{wordmark}</span> : null}
    </span>
  );
}
