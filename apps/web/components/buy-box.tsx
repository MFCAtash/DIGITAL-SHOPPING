"use client";

import { useMemo, useState } from "react";
import { Button, QuantityStepper, toFaDigits } from "@digital-shopping/ui";
import { useStore } from "./providers";
import { useT } from "./locale-provider";
import type { ProductDto, VariantDto } from "@/lib/types";

export function BuyBox({ product }: { product: ProductDto }) {
  const { addToCart } = useStore();
  const { t, locale } = useT();
  const variants = useMemo(() => (product.variants ?? []).filter((v) => v.is_active), [product.variants]);
  const [sku, setSku] = useState<string | null>(variants[0]?.sku ?? null);
  const [qty, setQty] = useState(1);
  const selected: VariantDto | undefined = variants.find((v) => v.sku === sku);

  const options = useMemo(() => {
    const keys = new Set<string>();
    variants.forEach((v) => Object.keys(v.options ?? {}).forEach((k) => keys.add(k)));
    return [...keys];
  }, [variants]);

  const disabled = variants.length > 0 && !selected;

  return (
    <div>
      {variants.length > 0 ? (
        <fieldset className="cx-fieldset" style={{ marginBlockEnd: "var(--cx-space-4)" }}>
          <legend className="cx-field__label">{t("pdp.variantSelect")}</legend>
          {options.map((key) => (
            <div key={key} style={{ marginBlockEnd: "var(--cx-space-2)" }}>
              <p style={{ fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)", margin: 0 }}>{key}</p>
              <div className="chip-row">
                {variants.map((v) => {
                  const value = v.options?.[key];
                  if (!value) return null;
                  return (
                    <button
                      key={`${key}-${v.sku}`}
                      type="button"
                      className={`chip ${sku === v.sku ? "chip--active" : ""}`}
                      aria-pressed={sku === v.sku}
                      onClick={() => setSku(v.sku)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}

      <div className="pdp__buy">
        <QuantityStepper value={qty} onChange={setQty} min={1} max={Math.max(1, selected?.stock ?? 10)} itemName={product.name} />
        <Button variant="primary" size="lg" disabled={disabled} onClick={() => void addToCart(product.slug, qty)}>
          {t("pdp.add")}
        </Button>
      </div>

      {selected ? (
        <p style={{ fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)" }}>
          {t("pdp.variantStockPrefix")}{toFaDigits(selected.stock, locale)}{t("pdp.variantStockSuffix")}
        </p>
      ) : null}
    </div>
  );
}
