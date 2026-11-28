"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Icon, OtpInput, toFaDigits } from "@digital-shopping/ui";
import { auth } from "@/lib/api";
import { useStore } from "@/components/providers";
import { useT } from "@/components/locale-provider";

/** صفحهٔ اختصاصی ورود/ثبت نام با احراز هویت کد یکبارمصرف. */
export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useT();
  const { user, ready, refreshUser, refreshCart, notify } = useStore();
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [next, setNext] = useState("/account");
  const countdownActive = resendIn > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("next");
    if (target && target.startsWith("/") && !target.startsWith("//")) setNext(target);
  }, []);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  useEffect(() => {
    if (!countdownActive) return;
    const timer = window.setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdownActive]);

  async function requestOtp() {
    if (phone.trim().length < 11) {
      setError(t("login.invalidPhone"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await auth.requestOtp(phone.trim());
      setOtpSent(true);
      setResendIn(result.resend_in);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(code: string) {
    setBusy(true);
    setError("");
    try {
      await auth.verifyOtp(phone.trim(), code);
      await Promise.allSettled([refreshUser(), refreshCart()]);
      notify(t("login.success"), "success");
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-card__glow" aria-hidden="true" />
        <span className="auth-card__icon" aria-hidden="true"><Icon name="user" size={28} /></span>
        <h1 id="auth-title">{t("login.title")}</h1>
        <p className="auth-card__lead">{t("login.subtitle")}</p>

        {!otpSent ? (
          <div className="form-stack">
            <label htmlFor="auth-phone">{t("login.phone")}</label>
            <input
              id="auth-phone"
              className="cx-input auth-input"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void requestOtp(); }}
            />
            <Button variant="primary" loading={busy} onClick={() => void requestOtp()}>
              {t("login.getCode")}
            </Button>
            <p className="auth-card__hint">{t("login.hint")}</p>
          </div>
        ) : (
          <div className="form-stack">
            <p className="auth-card__sent">
              {t("login.codeSent")} <b dir="ltr" className="cx-num">{phone}</b>
            </p>
            <OtpInput onComplete={(value) => void verifyOtp(value)} error={error} disabled={busy} />
            {countdownActive ? (
              <p className="auth-card__hint">{t("checkout.resendPrefix")}{toFaDigits(resendIn, locale)}{t("checkout.resendSuffix")}</p>
            ) : (
              <Button variant="ghost" loading={busy} onClick={() => void requestOtp()}>{t("login.resend")}</Button>
            )}
          </div>
        )}

        {error && otpSent ? <p className="auth-card__error" role="alert">{error}</p> : null}
        {error && !otpSent ? <p className="auth-card__error" role="alert">{error}</p> : null}

        <div className="auth-card__footer">
          <Link href="/forgot-password">{t("login.forgot")}</Link>
          <span>·</span>
          <Link href="/">{t("nav.home")}</Link>
        </div>
      </section>
    </main>
  );
}
