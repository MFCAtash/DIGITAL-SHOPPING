"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, Button, TextField } from "@digital-shopping/ui";
import { auth } from "@/lib/api";
import { useT } from "@/components/locale-provider";

function ResetForm() {
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== repeat) { setError(t("auth.passwordMismatch")); return; }
    if (!uid || !token) { setError(t("auth.incompleteLink")); return; }
    setBusy(true); setError("");
    try {
      await auth.passwordResetConfirm(uid, token, password);
      setDone(true);
      setTimeout(() => router.push("/account"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.invalidLink"));
    } finally { setBusy(false); }
  }

  if (done) return <Alert tone="success" title={t("common.done")}>{t("auth.resetDone")}</Alert>;

  return (
    <form onSubmit={submit} className="form-stack">
      <TextField label={t("account.newPassword")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} contentDir="ltr" autoComplete="new-password" required />
      <TextField label={t("account.repeatPassword")} type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} contentDir="ltr" autoComplete="new-password" required />
      {error ? <Alert tone="danger" title={t("common.errorShort")}>{error}</Alert> : null}
      <Button type="submit" loading={busy}>{t("auth.setNewPassword")}</Button>
    </form>
  );
}

/** لینک ارسالشده توسط سرور؛ توکن در URL است، در لاگ ذخیره نمیشود و پس از تأیید باطل میگردد. */
export default function PasswordResetPage() {
  const { t } = useT();
  return (
    <section className="section" style={{ maxInlineSize: 520, marginInline: "auto" }}>
      <h1 className="section__title">{t("auth.setNewPassword")}</h1>
      <p style={{ color: "var(--cx-muted)" }}>{t("auth.passwordRules")}</p>
      <Suspense fallback={<p>{t("common.loading")}</p>}>
        <ResetForm />
      </Suspense>
      <p><Link href="/forgot-password" className="section__link">{t("auth.newLinkRequest")}</Link></p>
    </section>
  );
}
