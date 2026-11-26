"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, TextField } from "@codex/ui";
import { auth } from "@/lib/api";
import { useT } from "@/components/locale-provider";

/** درخواست لینک زماندار بازنشانی رمز؛ پاسخ سرور همیشه یکسان است تا وجود حساب فاش نشود. */
export default function ForgotPasswordPage() {
  const { t } = useT();
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.passwordResetRequest(phone.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" style={{ maxInlineSize: 520, marginInline: "auto" }}>
      <h1 className="section__title">{t("auth.resetTitle")}</h1>
      <p style={{ color: "var(--cx-muted)" }}>{t("auth.resetLinkNote")}</p>
      {done ? (
        <Alert tone="success" title={t("common.sent")}>{t("auth.resetSentDesc")}</Alert>
      ) : (
        <form onSubmit={submit} className="form-stack">
          <TextField label={t("checkout.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" inputMode="tel" contentDir="ltr" required />
          {error ? <Alert tone="danger" title={t("common.errorShort")}>{error}</Alert> : null}
          <Button type="submit" loading={busy}>{t("auth.sendResetLink")}</Button>
        </form>
      )}
    </section>
  );
}
