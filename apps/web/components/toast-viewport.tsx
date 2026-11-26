"use client";

import { useEffect } from "react";

export interface ToastItem {
  id: number;
  message: string;
  tone: "info" | "success" | "warning" | "danger";
  /** unusually rich toast shown after adding an item to the cart */
  kind?: "cart";
  title?: string;
  subtitle?: string;
  meta?: string;
  image?: string | null;
  href?: string;
  actionLabel?: string;
}

let seq = 0;

export function pushToast(list: ToastItem[], message: string, tone: ToastItem["tone"]): ToastItem[] {
  seq += 1;
  return [...list.slice(-3), { id: seq, message, tone }];
}

interface CartToastInput {
  name: string;
  brand?: string;
  qty: number;
  price?: string | null;
  image?: string | null;
  count: number;
  en: boolean;
}

export function pushCartToast(list: ToastItem[], input: CartToastInput): ToastItem[] {
  seq += 1;
  const { name, brand, qty, price, image, count, en } = input;
  return [
    ...list.slice(-3),
    {
      id: seq,
      tone: "success",
      kind: "cart",
      message: en ? `${name} — added to cart` : `${name} — به سبد اضافه شد`,
      title: name,
      subtitle: en
        ? `${brand ? brand + " · " : ""}${qty} ${qty === 1 ? "item" : "items"} · ${count} in cart`
        : `${brand ? brand + " · " : ""}${qty} عدد · ${count} کالا در سبد`,
      meta: price ?? undefined,
      image,
      href: "/cart",
      actionLabel: en ? "View cart" : "مشاهدهٔ سبد",
    },
  ];
}

export function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timers = toasts
      .filter((t) => t.kind === "cart")
      .map((t) => window.setTimeout(() => onDismiss(t.id), 6500));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, onDismiss]);

  return (
    <div className="cx-toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) =>
        t.kind === "cart" ? (
          <div key={t.id} className="cx-toast cx-toast--cart" role="status">
            <span className="cx-toast-cart__glow" aria-hidden="true" />
            <span className="cx-toast-cart__check" aria-hidden="true">✓</span>
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="cx-toast-cart__img" src={t.image} alt="" width={54} height={54} />
            ) : null}
            <span className="cx-toast-cart__body">
              <strong className="cx-toast-cart__title">{t.title}</strong>
              <span className="cx-toast-cart__sub">{t.subtitle}</span>
              {t.meta ? <span className="cx-toast-cart__meta">{t.meta}</span> : null}
            </span>
            <a className="cx-toast-cart__action" href={t.href ?? "/cart"}>{t.actionLabel}</a>
            <button type="button" className="cx-toast-cart__close" onClick={() => onDismiss(t.id)} aria-label="بستن پیام">×</button>
          </div>
        ) : (
          <div key={t.id} className={`cx-toast cx-toast--${t.tone}`} role={t.tone === "danger" ? "alert" : "status"}>
            <span className="cx-toast__msg">{t.message}</span>
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="بستن پیام">×</button>
          </div>
        ),
      )}
    </div>
  );
}
