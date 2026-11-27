import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Breadcrumb } from "@digital-shopping/ui";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/account", "meta.account", "meta.accountDesc");
}

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  const TABS = [
    { href: "/account", label: tr("account.overview") },
    { href: "/account/orders", label: tr("account.orders") },
    { href: "/account/addresses", label: tr("account.addresses") },
    { href: "/account/wishlist", label: tr("account.wishlist") },
    { href: "/account/password", label: tr("account.password") },
    { href: "/account/returns", label: tr("account.returns") },
    { href: "/account/notifications", label: tr("account.notifications") },
  ];
  return (
    <>
      <Breadcrumb label={tr("common.breadcrumb")} items={[{ label: tr("common.home"), href: "/" }, { label: tr("account.title") }]} />
      <h1 className="section__title" style={{ marginBlockStart: "var(--cx-space-4)" }}>{tr("account.title")}</h1>
      <nav className="chip-row" aria-label={tr("account.title")} style={{ marginBlockStart: "var(--cx-space-4)" }}>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className="chip">{tab.label}</Link>
        ))}
      </nav>
      {children}
    </>
  );
}
