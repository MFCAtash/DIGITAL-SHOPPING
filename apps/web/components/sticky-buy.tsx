"use client";

import { formatToman } from "@digital-shopping/ui";
import { useStore } from "./providers";
import { useT } from "./locale-provider";

/** نوار خرید چسبان موبایل در صفحهٔ محصول (رفع باگ PDP بدون CTA ثابت). */
export function StickyBuy({ slug, priceToman }: { slug: string; priceToman: number | null }) {
  const { addToCart } = useStore();
  const { t, locale } = useT();
  return (
    <div className="sticky-buy">
      <div>
        <span style={{ display: "block", fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)" }}>{t("cart.subtotal")}</span>
        <strong className="cx-num">{priceToman == null ? t("pdp.contactPrice") : formatToman(priceToman, {}, locale)}</strong>
      </div>
      <button type="button" className="cx-btn cx-btn--primary" onClick={() => void addToCart(slug)}>
        {t("pdp.add")}
      </button>
    </div>
  );
}
