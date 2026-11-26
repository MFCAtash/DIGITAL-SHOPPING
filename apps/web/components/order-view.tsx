"use client";

import { Button, Countdown, OrderTimeline, formatToman, toFaDigits } from "@codex/ui";
import { useState } from "react";
import { orders } from "@/lib/api";
import type { OrderDto } from "@/lib/types";
import { useStore } from "./providers";
import { imageUrl } from "@/lib/media";
import { ProductImage } from "./product-image";
import { useT } from "./locale-provider";

const STATUS: Record<string, Parameters<typeof OrderTimeline>[0]["status"]> = {
  pending: "pending",
  needs_review: "needs_review",
  paid: "paid",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
};

export function OrderView({ initial }: { initial: OrderDto }) {
  const { notify } = useStore();
  const { t, locale } = useT();
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const money = (n: number) => formatToman(n, {}, locale);

  async function cancel() {
    setBusy(true);
    try {
      setOrder(await orders.cancel(order.number));
      notify(t("order.cancelled"), "info");
    } catch (e) {
      notify(e instanceof Error ? e.message : t("order.cancelFailed"), "danger");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    try {
      const r = await orders.pay(order.number);
      window.location.assign(r.redirect_url);
    } catch (e) {
      notify(e instanceof Error ? e.message : t("order.payFailed"), "danger");
      setBusy(false);
    }
  }

  const status = STATUS[order.status] ?? "pending";

  return (
    <div className="checkout-layout">
      <div>
        <section className="panel">
          <div className="section__head">
            <div>
              <p style={{ margin: 0, color: "var(--cx-muted)", fontSize: "var(--cx-text-sm)" }}>{t("order.number")}</p>
              <h2 className="cx-num" style={{ margin: 0 }}>{order.number}</h2>
            </div>
            <span className="chip">{order.status.replace(/_/g, " ")}</span>
          </div>
          <OrderTimeline status={status} />
          {order.expires_at && order.status === "pending" ? <Countdown expiresAt={order.expires_at} /> : null}
          {order.shipment?.tracking_number ? (
            <p className="notice">
              {t("order.tracking")}: <strong dir="ltr" className="cx-num">{order.shipment.tracking_number}</strong> — {order.shipment.carrier}
            </p>
          ) : null}
        </section>

        <section className="panel">
          <h2>{t("order.itemsTitle")}</h2>
          <ul className="line-list">
            {order.items.map((it) => (
              <li key={it.slug} className="line-item">
                {it.image ? (
                  <ProductImage src={imageUrl(it.image) ?? ""} width={88} height={88} sizes="88px" />
                ) : <div style={{ inlineSize: 88, blockSize: 88, background: "var(--cx-media)" }} />}
                <div>
                  <bdi>{it.name}</bdi>
                  <p style={{ margin: 0, fontSize: "var(--cx-text-sm)", color: "var(--cx-muted)" }}>{toFaDigits(it.qty, locale)} {t("common.piece")}</p>
                </div>
                <strong className="cx-num">{money(it.unit_toman * it.qty)}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="summary-card">
        <h2 style={{ marginBlockStart: 0 }}>{t("order.summary")}</h2>
        <div className="value-row"><span>{t("cart.items")}</span><span className="cx-num">{money(order.subtotal_toman)}</span></div>
        <div className="value-row"><span>{t("order.shipping")}</span><span className="cx-num">{money(order.shipping_toman)}</span></div>
        <div className="value-row"><span>{t("order.tax")}</span><span className="cx-num">{money(order.tax_toman)}</span></div>
        <div className="value-row value-row--total"><span>{t("order.total")}</span><span className="cx-num">{money(order.total_toman)}</span></div>
        {order.status === "pending" ? (
          <div style={{ display: "grid", gap: "var(--cx-space-2)", marginBlockStart: "var(--cx-space-4)" }}>
            <Button variant="primary" fullWidth loading={busy} onClick={() => void pay()}>{t("order.pay")}</Button>
            <Button variant="ghost" fullWidth loading={busy} onClick={() => void cancel()}>{t("order.cancel")}</Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
