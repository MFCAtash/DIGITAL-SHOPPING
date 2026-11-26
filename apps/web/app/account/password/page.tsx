"use client";

import { useState, type FormEvent } from "react";
import { Alert, Button, TextField } from "@codex/ui";
import { auth } from "@/lib/api";
import { useStore } from "@/components/providers";
import { useT } from "@/components/locale-provider";

export default function AccountPasswordPage() {
  const { user } = useStore();
  const { t } = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "danger">("success");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent, mode: "set" | "change") {
    e.preventDefault();
    setMessage("");
    if (next !== repeat) { setTone("danger"); setMessage(t("auth.passwordMismatch")); return; }
    setBusy(true);
    try {
      if (mode === "set") await auth.passwordSet(next);
      else await auth.passwordChange(current, next);
      setTone("success"); setMessage(t("auth.passwordSaved"));
      setCurrent(""); setNext(""); setRepeat("");
    } catch (err) {
      setTone("danger");
      setMessage(err instanceof Error ? err.message : t("common.actionFailed"));
    } finally { setBusy(false); }
  }

  return (
    <section className="section" style={{ maxInlineSize: 560 }}>
      <h2 className="section__title">{t("account.password")}</h2>
      <p style={{ color: "var(--cx-muted)" }}>{t("auth.passwordNote")}</p>
      {message ? <Alert tone={tone} title={t(tone === "success" ? "common.done" : "common.errorShort")}>{message}</Alert> : null}
      <form onSubmit={(e) => void submit(e, "change")} className="form-stack">
        <TextField label={t("account.currentPassword")} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} contentDir="ltr" autoComplete="current-password" required />
        <TextField label={t("account.newPassword")} type="password" value={next} onChange={(e) => setNext(e.target.value)} contentDir="ltr" autoComplete="new-password" required />
        <TextField label={t("account.repeatPassword")} type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} contentDir="ltr" autoComplete="new-password" required />
        <Button type="submit" loading={busy}>{t("account.changePassword")}</Button>
      </form>
      <p style={{ marginBlockStart: "var(--cx-space-4)" }}>
        {t("auth.forgotQuestion")} <a href="/forgot-password">{t("auth.getResetLink")}</a>
      </p>
      {user ? <small>{t("auth.accountLabel")}{user.phone}</small> : null}
    </section>
  );
}
