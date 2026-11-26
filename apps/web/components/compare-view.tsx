"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CompareTable, EmptyState } from "@codex/ui";
import { product as fetchProduct } from "@/lib/api";
import { readCompare, writeCompare } from "@/lib/compare-store";
import { imageUrl } from "@/lib/media";
import type { ProductDto } from "@/lib/types";
import { useT } from "./locale-provider";

export function CompareView() {
  const { t } = useT();
  const [items, setItems] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const slugs = readCompare();
      const rows = await Promise.all(slugs.map((s) => fetchProduct(s).catch(() => null)));
      if (alive) {
        setItems(rows.filter((p): p is ProductDto => p != null));
        setLoading(false);
      }
    })().catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function remove(slug: string) {
    writeCompare(readCompare().filter((s) => s !== slug));
    setItems((prev) => prev.filter((p) => p.slug !== slug));
  }

  if (loading) return <p>{t("common.loading")}</p>;
  if (!items.length) {
    return (
      <EmptyState
        title={t("compare.emptyTitle")}
        description={t("compare.emptyDesc")}
        action={<Link href="/products" className="cx-btn cx-btn--primary">{t("hero.cta")}</Link>}
      />
    );
  }

  const keys = [...new Set(items.flatMap((p) => Object.keys(p.specs ?? {})))];
  return (
    <CompareTable
      products={items.map((p) => ({
        id: p.slug,
        name: p.name,
        href: `/products/${p.slug}`,
        imageSrc: imageUrl(p.images[0]?.file),
      }))}
      rows={[
        { key: "price", label: t("compare.priceLabel"), values: items.map((p) => p.price_toman) },
        { key: "brand", label: t("plp.brand"), values: items.map((p) => p.brand) },
        ...keys.map((k) => {
          const labelKey = `spec.${k}`;
          const label = t(labelKey) === labelKey ? k : t(labelKey);
          return { key: k, label, values: items.map((p) => p.specs?.[k] ?? null) };
        }),
      ]}
      onRemove={remove}
    />
  );
}
