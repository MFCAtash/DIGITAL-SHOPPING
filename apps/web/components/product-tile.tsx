"use client";

import { ProductCard, toFaDigits, type ProductSummary } from "@codex/ui";
import { useEffect, useState } from "react";
import { useStore } from "./providers";
import { imageUrl } from "@/lib/media";
import { ProductImage } from "./product-image";
import { readCompare, toggleCompare } from "@/lib/compare-store";
import { useT } from "./locale-provider";
import { t as translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { ProductDto } from "@/lib/types";

export function toSummary(p: ProductDto, locale: Locale = "fa"): ProductSummary {
  const oldToman = p.discount_percent > 0 && p.price_toman != null
    ? Math.round(p.price_toman / (1 - p.discount_percent / 100))
    : null;
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    href: `/products/${p.slug}`,
    imageSrc: imageUrl(p.images[0]?.file),
    imageWidth: 400,
    imageHeight: 500,
    finalToman: p.price_toman,
    oldToman,
    finalUsdCents: p.final_usd_cents,
    discountPercent: p.discount_percent,
    priceNote: p.price_note || undefined,
    priceCheckedOn: p.price_checked_on,
    stock: p.in_stock ? p.stock : 0,
    purchasable: p.purchasable,
    highlights: [
      p.specs?.["ram"] ? `${p.specs["ram"]} ${translate("spec.ram", locale)}` : null,
      p.specs?.["storage"] ? `${p.specs["storage"]} ${translate("spec.storage", locale)}` : null,
    ].filter(Boolean) as string[],
  };
}

export function ProductTile({ product, priority = false, headingLevel = 3 }: { product: ProductDto; priority?: boolean; headingLevel?: 2 | 3 | 4 }) {
  const { addToCart, notify } = useStore();
  const { t, locale } = useT();
  const [compared, setCompared] = useState(false);
  useEffect(() => setCompared(readCompare().includes(product.slug)), [product.slug]);
  const summary = toSummary(product, locale);
  return (
    <ProductCard
      product={summary}
      locale={locale}
      priority={priority}
      headingLevel={headingLevel}
      image={summary.imageSrc ? (
        <div className="cx-card__media">
          {product.discount_percent > 0 ? <span className="campaign-badge">BLACK FRIDAY · {toFaDigits(product.discount_percent, locale)}{t("common.percent")}</span> : null}
          <ProductImage src={summary.imageSrc} priority={priority} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
        </div>
      ) : undefined}
      actions={
        <div style={{ display: "flex", gap: "var(--cx-space-1)", inlineSize: "100%" }}>
          <button
            type="button"
            className="cx-btn cx-btn--primary cx-btn--sm"
            style={{ flex: 1 }}
            onClick={() => void addToCart(product.slug)}
            aria-label={`${t("pdp.addCartPrefix")}${product.name}${t("pdp.addCartSuffix")}`}
          >
            {t("pdp.add")}
          </button>
          <button
            type="button"
            className={`chip ${compared ? "chip--active" : ""}`}
            aria-pressed={compared}
            aria-label={`${t(compared ? "compare.removePrefix" : "compare.addPrefix")}${product.name}${t(compared ? "compare.removeSuffix" : "compare.addSuffix")}`}
            onClick={() => {
              const next = toggleCompare(product.slug);
              setCompared(next.includes(product.slug));
              notify(next.includes(product.slug) ? t("compare.added") : t("compare.removed"), "info");
            }}
          >
            {t("nav.compare")}
          </button>
        </div>
      }
    />
  );
}

export function ProductCount({ count }: { count: number }) {
  const { locale } = useT();
  return <span className="cx-num">{toFaDigits(count, locale)}</span>;
}
