import type { Metadata } from "next";
import { Breadcrumb } from "@codex/ui";
import { CartView } from "@/components/cart-view";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/cart", "meta.cart", "meta.cartDesc");
}

export default async function CartPage() {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  return (
    <>
      <Breadcrumb label={tr("common.breadcrumb")} items={[{ label: tr("common.home"), href: "/" }, { label: tr("cart.title") }]} />
      <h1 className="section__title" style={{ marginBlockStart: "var(--cx-space-4)" }}>{tr("cart.title")}</h1>
      <CartView />
    </>
  );
}
