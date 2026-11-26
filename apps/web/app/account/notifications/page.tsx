"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, formatJalali, toFaDigits } from "@codex/ui";
import { notifications } from "@/lib/api";
import { useT } from "@/components/locale-provider";
import type { NotificationDto } from "@/lib/types";

/** صندوق اعلانات درونبرنامهای: خواندن تکی و علامتزدنهمه بهعنوان خواندهشده. */
export default function AccountNotificationsPage() {
  const { t, locale } = useT();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    void notifications.list().then((r) => { setItems(r.items); setUnread(r.unread_count); }).catch((e) => setError(e instanceof Error ? e.message : t("notifications.loadError")));
  }, [t]);
  useEffect(load, [load]);

  async function mark(id: number) {
    await notifications.read(id).catch(() => undefined);
    load();
  }
  async function markAll() {
    await notifications.readAll().catch(() => undefined);
    load();
  }

  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title">{t("notifications.title")} {unread ? <Badge tone="warning">{toFaDigits(unread, locale)} {t("notifications.unread")}</Badge> : null}</h2>
        {unread ? <Button variant="secondary" onClick={() => void markAll()}>{t("notifications.readAll")}</Button> : null}
      </div>
      {error ? <Alert tone="danger" title={t("common.errorShort")}>{error}</Alert> : null}
      {items.length ? (
        <ul className="line-list">
          {items.map((n) => (
            <li key={n.id} className="panel" style={{ margin: 0, borderInlineStart: n.read_at ? undefined : "2px solid var(--cx-brand)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--cx-space-3)" }}>
                <strong>{n.title}</strong>
                {n.read_at ? <small>✓</small> : <button type="button" className="cx-btn cx-btn--ghost cx-btn--sm" onClick={() => void mark(n.id)}>{t("notifications.read")}</button>}
              </div>
              {n.body ? <p style={{ marginBlockEnd: 0 }}>{n.body}</p> : null}
              <small>{formatJalali(n.created_at, "numeric", "Asia/Tehran", locale)}</small>
            </li>
          ))}
        </ul>
      ) : <p style={{ color: "var(--cx-muted)" }}>{t("notifications.empty")}</p>}
    </section>
  );
}
