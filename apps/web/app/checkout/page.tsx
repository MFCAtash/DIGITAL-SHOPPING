import type { Metadata } from "next";
import { Breadcrumb } from "@digital-shopping/ui";
import { CheckoutFlow } from "@/components/checkout-flow";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/checkout", "meta.checkout", "meta.checkoutDesc");
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  return (
    <>
      <Breadcrumb label={tr("common.breadcrumb")} items={[{ label: tr("common.home"), href: "/" }, { label: tr("cart.title"), href: "/cart" }, { label: tr("checkout.title") }]} />
      <h1 className="section__title" style={{ marginBlockStart: "var(--cx-space-4)" }}>{tr("checkout.title")}</h1>
      <CheckoutFlow />
    </>
  );
}
