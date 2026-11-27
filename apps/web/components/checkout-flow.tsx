"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddressForm, Button, OtpInput, Stepper, formatToman, toFaDigits, type AddressInput as UiAddressInput } from "@digital-shopping/ui";
import { addresses, auth, engagement, orders, shippingMethods } from "@/lib/api";
import type { AddressDto, OrderDto, ShippingQuote } from "@/lib/types";
import { useStore } from "./providers";
import { useT } from "./locale-provider";

function toApiAddress(a: UiAddressInput) {
  return {
    receiver_name: a.receiverName,
    receiver_phone: a.receiverPhone,
    province: a.province,
    city: a.city,
    postal_code: a.postalCode,
    street: a.street,
    plate: a.plate ?? "",
    unit: a.unit ?? "",
  };
}

export function CheckoutFlow() {
  const router = useRouter();
  const { t, locale } = useT();
  const steps = [t("checkout.login"), t("checkout.address"), t("checkout.shipping"), t("checkout.payment")];
  const money = (n: number) => formatToman(n, {}, locale);
  const { cart, user, refreshCart, refreshUser, notify, ready } = useStore();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [list, setList] = useState<AddressDto[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [methods, setMethods] = useState<ShippingQuote[]>([]);
  const [shippingCode, setShippingCode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderDto | null>(null);

  const effectiveStep = user ? Math.max(1, step) : 0;

  // کاربری که از قبل وارد شده است باید مستقیماً وارد مرحلهٔ نشانی شود.
  useEffect(() => {
    if (!user || step !== 0 || list.length) return;
    void (async () => {
      try {
        const rows = await addresses.list();
        setList(rows);
        if (rows.length) {
          setAddressId(rows.find((a) => a.is_default)?.id ?? rows[0].id);
          setStep(1);
        } else {
          setShowNew(true);
          setStep(1);
        }
      } catch {
        setStep(1);
      }
    })();
  }, [user, step, list.length]);

  async function requestOtp() {
    setBusy(true);
    setError("");
    try {
      const r = await auth.requestOtp(phone);
      setOtpSent(true);
      setResendIn(r.resend_in);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.otpFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(value: string) {
    setCode(value);
    setBusy(true);
    setError("");
    try {
      await auth.verifyOtp(phone, value);
      await refreshUser();
      notify(t("checkout.signedIn"), "success");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.invalidCode"));
    } finally {
      setBusy(false);
    }
  }

  async function loadAddresses() {
    setBusy(true);
    setError("");
    try {
      const rows = await addresses.list();
      setList(rows);
      if (rows.length) setAddressId((prev) => prev ?? rows.find((a) => a.is_default)?.id ?? rows[0].id);
      if (rows.length) setStep(2);
      else setShowNew(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.addressesFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveAddress(a: UiAddressInput) {
    setBusy(true);
    setError("");
    try {
      const created = await addresses.create(toApiAddress(a));
      setList((prev) => [...prev, created]);
      setAddressId(created.id);
      setShowNew(false);
      setStep(2);
      notify(t("address.saved"), "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.addressSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function loadShipping() {
    const province = list.find((a) => a.id === addressId)?.province ?? "";
    setBusy(true);
    setError("");
    try {
      const rows = await shippingMethods(province, cart.subtotal_toman - discount);
      setMethods(rows);
      const available = rows.find((r) => r.cost_toman != null);
      if (available) setShippingCode(available.code);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.shippingFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function applyCoupon() {
    setError("");
    try {
      const r = await engagement.coupon(coupon, cart.subtotal_toman);
      setDiscount(r.discount_toman);
      notify(`${t("checkout.discountAppliedPrefix")}${money(r.discount_toman)}${t("checkout.discountAppliedSuffix")}`, "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.invalidCoupon"));
    }
  }

  async function placeOrder() {
    setBusy(true);
    setError("");
    try {
      const created = await orders.create({ address_id: addressId, shipping_code: shippingCode, coupon_code: coupon.trim() || undefined });
      setOrder(created);
      await refreshCart();
      notify(t("checkout.success"), "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.orderFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      const r = await orders.pay(order.number);
      window.location.assign(r.redirect_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.payFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p>{t("common.preparing")}</p>;
  if (!cart.lines.length && !order) {
    return (
      <div className="panel">
        <h2>{t("cart.empty")}</h2>
        <Button variant="primary" onClick={() => router.push("/products")}>{t("hero.cta")}</Button>
      </div>
    );
  }

  const selectedMethod = methods.find((m) => m.code === shippingCode);
  const shippingCost = selectedMethod?.cost_toman ?? 0;

  return (
    <>
      <Stepper steps={steps} current={effectiveStep} locale={locale} />
      {error ? <p className="notice" role="alert">{error}</p> : null}

      {order ? (
        <section className="panel" style={{ marginBlockStart: "var(--cx-space-5)" }}>
          <h2>{t("checkout.success")}</h2>
          <p>{t("order.number")}: <strong className="cx-num">{order.number}</strong></p>
          <div className="value-row"><span>{t("cart.subtotal")}</span><span className="cx-num">{money(order.subtotal_toman)}</span></div>
          <div className="value-row"><span>{t("order.shipping")}</span><span className="cx-num">{money(order.shipping_toman)}</span></div>
          <div className="value-row"><span>{t("order.tax")}</span><span className="cx-num">{money(order.tax_toman)}</span></div>
          <div className="value-row value-row--total"><span>{t("order.payable")}</span><span className="cx-num">{money(order.total_toman)}</span></div>
          <div style={{ display: "flex", gap: "var(--cx-space-2)", marginBlockStart: "var(--cx-space-4)" }}>
            <Button variant="primary" loading={busy} onClick={() => void pay()}>{t("checkout.payNow")}</Button>
            <Button variant="secondary" onClick={() => router.push(`/orders/${order.number}`)}>{t("checkout.track")}</Button>
          </div>
        </section>
      ) : (
        <div className="checkout-layout" style={{ marginBlockStart: "var(--cx-space-5)" }}>
          <div>
            {!user || step === 0 ? (
              <section className="panel">
                <h2>{t("checkout.loginTitle")}</h2>
                {!otpSent ? (
                  <div className="form-stack">
                    <label htmlFor="phone">{t("checkout.phone")}</label>
                    <input id="phone" className="cx-input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" />
                    <Button variant="primary" loading={busy} onClick={() => void requestOtp()} disabled={phone.trim().length < 11}>{t("checkout.getCode")}</Button>
                  </div>
                ) : (
                  <div className="form-stack">
                    <p>{t("checkout.codeSentPrefix")}<span dir="ltr" className="cx-num">{phone}</span>{t("checkout.codeSentSuffix")}</p>
                    <OtpInput onComplete={(v) => void verifyOtp(v)} error={error} disabled={busy} />
                    {resendIn > 0 ? <p style={{ fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)" }}>{t("checkout.resendPrefix")}{toFaDigits(resendIn, locale)}{t("checkout.resendSuffix")}</p> : null}
                  </div>
                )}
              </section>
            ) : null}

            {user && step >= 1 && step === 1 ? (
              <section className="panel">
                <h2>{t("checkout.deliveryAddress")}</h2>
                {list.length ? (
                  <div className="form-stack">
                    {list.map((a) => (
                      <label key={a.id} className="chip" style={{ display: "flex", alignItems: "flex-start" }}>
                        <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                        <span>{a.receiver_name} — {[a.province, a.city, a.street].filter(Boolean).join(locale === "fa" ? "، " : ", ")}</span>
                      </label>
                    ))}
                    <Button variant="secondary" onClick={() => setShowNew(true)}>{t("checkout.newAddress")}</Button>
                    <Button variant="primary" loading={busy} onClick={() => void loadShipping()}>{t("common.continue")}</Button>
                  </div>
                ) : null}
                {showNew || !list.length ? (
                  <div style={{ marginBlockStart: "var(--cx-space-4)" }}>
                    <AddressForm onSubmit={saveAddress} submitLabel={t("checkout.saveContinue")} loading={busy} />
                  </div>
                ) : null}
              </section>
            ) : null}

            {user && step >= 1 && step === 2 ? (
              <section className="panel">
                <h2>{t("checkout.shipping")}</h2>
                <div className="form-stack">
                  {methods.length ? methods.map((m) => (
                    <label key={m.code} className="chip" style={{ display: "flex", justifyContent: "space-between", borderRadius: 0 }}>
                      <span>
                        <input type="radio" name="shipping" checked={shippingCode === m.code} onChange={() => setShippingCode(m.code)} disabled={m.cost_toman == null} />
                        {" "}{m.name} — {m.eta}
                      </span>
                      <span className="cx-num">{m.cost_toman == null ? t("common.unavailable") : m.cost_toman === 0 ? t("common.free") : money(m.cost_toman)}</span>
                    </label>
                  )) : <Button variant="secondary" loading={busy} onClick={() => void loadShipping()}>{t("checkout.shipping")}</Button>}
                  <Button variant="primary" onClick={() => setStep(3)}>{t("checkout.continuePayment")}</Button>
                </div>
              </section>
            ) : null}

            {user && step >= 1 && step === 3 ? (
              <section className="panel">
                <h2>{t("checkout.reviewPay")}</h2>
                <div className="form-stack">
                  <div>
                    <label htmlFor="coupon">{t("checkout.couponOptional")}</label>
                    <div style={{ display: "flex", gap: "var(--cx-space-2)" }}>
                      <input id="coupon" className="cx-input" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                      <Button variant="secondary" onClick={() => void applyCoupon()}>{t("checkout.apply")}</Button>
                    </div>
                  </div>
                  <Button variant="primary" size="lg" loading={busy} onClick={() => void placeOrder()}>{t("checkout.placeAndPay")}</Button>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="summary-card">
            <h2 style={{ marginBlockStart: 0 }}>{t("cart.summary")}</h2>
            {cart.lines.map((l) => (
              <div className="value-row" key={l.slug}>
                <span>{l.name} × {toFaDigits(l.qty, locale)}</span>
                <span className="cx-num">{l.line_toman == null ? "—" : money(l.line_toman)}</span>
              </div>
            ))}
            <div className="value-row"><span>{t("cart.subtotal")}</span><span className="cx-num">{money(cart.subtotal_toman)}</span></div>
            {discount ? <div className="value-row"><span>{t("checkout.discount")}</span><span className="cx-num">− {money(discount)}</span></div> : null}
            <div className="value-row"><span>{t("order.shipping")}</span><span className="cx-num">{money(shippingCost)}</span></div>
            <div className="value-row value-row--total"><span>{t("order.payable")}</span><span className="cx-num">{money(cart.subtotal_toman - discount + shippingCost)}</span></div>
          </aside>
        </div>
      )}
    </>
  );
}
