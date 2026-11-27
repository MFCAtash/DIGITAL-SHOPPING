import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@digital-shopping/ui";
import { OrderView } from "@/components/order-view";
import { serverGet } from "@/lib/server-api";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";
import type { OrderDto } from "@/lib/types";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/orders", "meta.orderTrack", "meta.orderTrackDesc");
}

export default async function OrderPage({ params }: Props) {
  const { number } = await params;
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  const order = await serverGet<OrderDto>(`/orders/${encodeURIComponent(number)}`);
  return (
    <>
      <Breadcrumb label={tr("common.breadcrumb")} items={[{ label: tr("common.home"), href: "/" }, { label: tr("account.orders"), href: "/account/orders" }, { label: number }]} />
      <h1 className="section__title" style={{ marginBlockStart: "var(--cx-space-4)" }}>{tr("meta.orderTrack")}</h1>
      {order ? <OrderView initial={order} /> : (
        <div className="panel">
          <h2>{tr("order.notFoundTitle")}</h2>
          <p>{tr("order.notFoundDesc")}</p>
          <Link href="/account/orders" className="cx-btn cx-btn--primary">{tr("account.viewOrders")}</Link>
        </div>
      )}
    </>
  );
}
