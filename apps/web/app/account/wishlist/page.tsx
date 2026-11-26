import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import { serverGet } from "@/lib/server-api";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import type { ProductDto } from "@/lib/types";

export default async function WishlistPage() {
  const locale = await getLocale();
  const data = await serverGet<{ items: ProductDto[] }>("/catalog/wishlist");
  if (!data?.items.length) {
    return (
      <div className="panel">
        <h2>{t("account.noWishlistTitle", locale)}</h2>
        <Link href="/products" className="cx-btn cx-btn--primary">{t("hero.cta", locale)}</Link>
      </div>
    );
  }
  return (
    <div className="product-grid" style={{ marginBlockStart: "var(--cx-space-4)" }}>
      {data.items.map((p) => <ProductTile key={p.slug} product={p} />)}
    </div>
  );
}
