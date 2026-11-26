"use client";

import { useEffect, useState } from "react";
import { AddressForm, Button } from "@codex/ui";
import { addresses } from "@/lib/api";
import type { AddressDto } from "@/lib/types";
import { useStore } from "@/components/providers";
import { useT } from "@/components/locale-provider";

export default function AddressesPage() {
  const { notify } = useStore();
  const { t, locale } = useT();
  const [rows, setRows] = useState<AddressDto[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void addresses.list().then(setRows).catch(() => setRows([]));
  }, []);

  function makeDefault(id: number) {
    void addresses.setDefault(id)
      .then(() => addresses.list())
      .then((list) => { setRows(list); notify(t("address.defaultChanged"), "success"); })
      .catch(() => notify(t("common.actionFailed"), "danger"));
  }

  function remove(id: number) {
    void addresses.remove(id)
      .then(() => setRows((p) => p.filter((x) => x.id !== id)))
      .catch(() => notify(t("common.actionFailed"), "danger"));
  }

  return (
    <div style={{ marginBlockStart: "var(--cx-space-4)" }}>
      {rows.map((a) => (
        <div key={a.id} className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{a.receiver_name}</strong> {a.is_default ? <span className="chip">{t("account.setDefault")}</span> : null}
            <p style={{ margin: 0, fontSize: "var(--cx-text-sm)", color: "var(--cx-muted)" }}>
              {[a.province, a.city, a.street].filter(Boolean).join(locale === "fa" ? "، " : ", ")} — {t("address.postalCode")} <span dir="ltr" className="cx-num">{a.postal_code}</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--cx-space-2)" }}>
            {!a.is_default ? (
              <Button variant="ghost" size="sm" onClick={() => makeDefault(a.id)}>{t("address.makeDefault")}</Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>{t("cart.remove")}</Button>
          </div>
        </div>
      ))}
      {adding ? (
        <section className="panel">
          <h2>{t("checkout.newAddress")}</h2>
          <AddressForm
            loading={busy}
            onSubmit={(a) => {
              setBusy(true);
              void addresses.create({
                receiver_name: a.receiverName, receiver_phone: a.receiverPhone, province: a.province,
                city: a.city, postal_code: a.postalCode, street: a.street, plate: a.plate, unit: a.unit,
              }).then((created) => {
                setRows((p) => [...p, created]);
                setAdding(false);
                notify(t("address.saved"), "success");
              }).catch(() => notify(t("common.actionFailed"), "danger"))
                .finally(() => setBusy(false));
            }}
          />
        </section>
      ) : <Button variant="secondary" onClick={() => setAdding(true)}>{t("account.addAddress")}</Button>}
    </div>
  );
}
