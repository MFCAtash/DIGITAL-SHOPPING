"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, PriceTag, formatJalali, toFaDigits } from "@codex/ui";
import { orders, returnsApi } from "@/lib/api";
import { useT } from "@/components/locale-provider";
import type { OrderDto, ReturnDto } from "@/lib/types";

const STATUS: Record<ReturnDto["status"], { key: string; tone: "neutral" | "positive" | "warning" | "danger" }> = {
  requested: { key: "returns.requested", tone: "warning" },
  approved: { key: "returns.approved", tone: "positive" },
  rejected: { key: "returns.rejected", tone: "danger" },
  refunded: { key: "returns.refunded", tone: "positive" },
};

/** درخواست و پیگیری مرجوعی: فقط سفارشهای تحویلشده در مهلت ۷ روزه قابل درخواستاند. */
export default function AccountReturnsPage() {
  const { t, locale } = useT();
  const [items, setItems] = useState<ReturnDto[]>([]);
  const [ordersList, setOrdersList] = useState<OrderDto[]>([]);
  const [reasonFor, setReasonFor] = useState<{ number: string; item: number; slug: string } | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    void returnsApi.list().then((r) => setItems(r.items)).catch(() => undefined);
    void orders.list().then((r) => setOrdersList(r.items)).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function submit() {
    if (!reasonFor || !reason.trim()) return;
    setError(""); setMessage("");
    try {
      await returnsApi.create(reasonFor.number, reasonFor.item, reason.trim());
      setMessage(t("returns.created"));
      setReasonFor(null); setReason("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("returns.createFailed"));
    }
  }

  return (
    <section className="section">
      <h2 className="section__title">{t("returns.title")}</h2>
      <p style={{ color: "var(--cx-muted)" }}>{t("returns.windowNote")}</p>
      {message ? <Alert tone="success" title={t("common.done")}>{message}</Alert> : null}
      {error ? <Alert tone="danger" title={t("common.errorShort")}>{error}</Alert> : null}

      {items.length ? (
        <ul className="line-list">
          {items.map((r) => (
            <li key={r.id} className="panel" style={{ margin: 0 }}>
              <strong>{r.order_number}</strong> — <bdi>{r.item_slug}</bdi> <Badge tone={STATUS[r.status].tone}>{t(STATUS[r.status].key)}</Badge>
              <p style={{ marginBlockEnd: 0 }}>{r.reason}</p>
              <small>{formatJalali(r.created_at, "numeric", "Asia/Tehran", locale)}</small>
            </li>
          ))}
        </ul>
      ) : <p style={{ color: "var(--cx-muted)" }}>{t("returns.emptyMine")}</p>}

      <h3 style={{ marginBlockStart: "var(--cx-space-6)" }}>{t("returns.new")}</h3>
      <div className="home-grid">
        {ordersList.map((o) => (
          <div key={o.number} className="panel" style={{ margin: 0 }}>
            <strong className="cx-num">{o.number}</strong> — <PriceTag finalToman={o.total_toman} locale={locale} />
            {o.status === "delivered" ? (
              <ul style={{ listStyle: "none", padding: 0, margin: "var(--cx-space-2) 0" }}>
                {o.items.map((it) => (
                  <li key={it.slug} style={{ display: "flex", gap: "var(--cx-space-2)", alignItems: "center", paddingBlock: "var(--cx-space-1)", borderBlockEnd: "1px solid var(--cx-line)" }}>
                    <bdi style={{ flex: 1 }}>{it.name}</bdi>
                    <span className="cx-num">×{toFaDigits(it.qty, locale)}</span>
                    <button type="button" className="cx-btn cx-btn--secondary cx-btn--sm" onClick={() => setReasonFor({ number: o.number, item: it.id, slug: it.slug })}>{t("returns.request")}</button>
                  </li>
                ))}
              </ul>
            ) : <small>{t("returns.deliveredOnly")}</small>}
          </div>
        ))}
      </div>

      {reasonFor ? (
        <div className="panel" style={{ marginBlockStart: "var(--cx-space-4)", maxInlineSize: 520 }}>
          <h3>{t("returns.reason")} — <bdi>{reasonFor.slug}</bdi></h3>
          <textarea className="cx-input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t("returns.reason")} placeholder={t("returns.reasonPlaceholder")} />
          <div style={{ display: "flex", gap: "var(--cx-space-2)", marginBlockStart: "var(--cx-space-3)" }}>
            <Button onClick={() => void submit()} disabled={!reason.trim()}>{t("returns.submit")}</Button>
            <Button variant="secondary" onClick={() => { setReasonFor(null); setReason(""); }}>{t("common.cancel")}</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
