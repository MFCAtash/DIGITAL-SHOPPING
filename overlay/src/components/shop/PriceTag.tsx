"use client";
import { formatUsd } from "@/lib/usd";
import { useLang } from "./LangProvider";

type Props = { priceCents: number | null; finalCents: number | null; discountPercent?: number; note?: "from" | "approx" | null; size?: "md" | "lg" };

/** قیمت بزرگ با ارقام هم‌عرض؛ رنگ تأکید فقط برای قیمت و تخفیف. */
export function PriceTag({ priceCents, finalCents, discountPercent = 0, note, size = "md" }: Props) {
  const { t } = useLang();
  if (finalCents == null) return <span className="s-price__from">{t("contact")}</span>;
  return (
    <div className={`s-price${size === "lg" ? " s-price--lg" : ""}`}>
      {note ? <span className="s-price__from">{t(note)}</span> : null}
      <span className="s-price__v" dir="ltr">{formatUsd(finalCents)}</span>
      {discountPercent > 0 && priceCents != null ? (
        <>
          <span className="s-price__old" dir="ltr">{formatUsd(priceCents)}</span>
          <span className="s-chip s-chip--off">{t("off", { n: discountPercent })}</span>
        </>
      ) : null}
    </div>
  );
}
