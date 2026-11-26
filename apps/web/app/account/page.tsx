"use client";

import Link from "next/link";
import { Button, formatToman, toFaDigits } from "@codex/ui";
import { useStore } from "@/components/providers";
import { useT } from "@/components/locale-provider";

export default function AccountHomePage() {
  const { user, cart, logout } = useStore();
  const { t, locale } = useT();
  if (!user) {
    return (
      <div className="panel">
        <h2>{t("account.notLoggedIn")}</h2>
        <p>{t("account.loginDesc")}</p>
        <Link href="/checkout" className="cx-btn cx-btn--primary">{t("checkout.login")}</Link>
      </div>
    );
  }
  return (
    <div className="panel">
      <h2 style={{ marginBlockStart: 0 }}>{user.name || t("account.guest")}</h2>
      <p dir="ltr" className="cx-num" style={{ color: "var(--cx-muted)" }}>{user.phone}</p>
      <div className="value-row"><span>{t("account.cartItems")}</span><span className="cx-num">{toFaDigits(cart.count, locale)}</span></div>
      <div className="value-row"><span>{t("account.subtotal")}</span><span className="cx-num">{formatToman(cart.subtotal_toman, {}, locale)}</span></div>
      <div style={{ display: "flex", gap: "var(--cx-space-2)", marginBlockStart: "var(--cx-space-4)" }}>
        <Link href="/account/orders" className="cx-btn cx-btn--primary">{t("account.viewOrders")}</Link>
        <Button variant="ghost" onClick={() => void logout().catch(() => undefined)}>{t("account.logout")}</Button>
      </div>
    </div>
  );
}
