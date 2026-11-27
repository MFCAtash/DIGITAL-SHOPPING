import Link from "next/link";
import { formatJalali, formatToman, toFaDigits } from "@digital-shopping/ui";
import { serverGet } from "@/lib/server-api";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import type { OrderListDto } from "@/lib/types";

export default async function OrdersPage() {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  const data = await serverGet<OrderListDto>("/orders");
  if (!data?.items.length) {
    return (
      <div className="panel">
        <h2>{tr("account.noOrdersTitle")}</h2>
        <Link href="/products" className="cx-btn cx-btn--primary">{tr("hero.cta")}</Link>
      </div>
    );
  }
  return (
    <ul className="line-list" style={{ marginBlockStart: "var(--cx-space-4)" }}>
      {data.items.map((o) => (
        <li key={o.number} className="panel" style={{ margin: 0 }}>
          <div className="section__head" style={{ marginBlockEnd: "var(--cx-space-2)" }}>
            <div>
              <Link href={`/orders/${o.number}`} className="cx-num" style={{ fontWeight: 700 }}>{o.number}</Link>
              <p style={{ margin: 0, fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)" }}>
                {formatJalali(o.created_at, "numeric", "Asia/Tehran", locale)} — {toFaDigits(o.items.length, locale)} {tr("common.itemUnit")}
              </p>
            </div>
            <strong className="cx-num">{formatToman(o.total_toman, {}, locale)}</strong>
          </div>
          <span className="chip">{o.status.replace(/_/g, " ")}</span>
        </li>
      ))}
    </ul>
  );
}
