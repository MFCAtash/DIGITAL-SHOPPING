"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { remainingSeconds, shouldAnnounce, urgency } from "../lib/countdown";
import { formatClock, formatToman, toFaDigits } from "../lib/format";
import { timelineSteps, type OrderStatus } from "../lib/order-timeline";
import { clampQty, parseQty } from "../lib/qty";
import { Icon } from "../icons/Icon";
import { ButtonLink, IconButton } from "./button";
import { Sheet } from "./overlay";
import { EmptyState } from "./feedback";

/* ---------- QuantityStepper ---------- */

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** نام کالا برای برچسب‌ها */
  itemName: string;
  disabled?: boolean;
  className?: string;
}

/** تعداد: − / عدد / +. در حدّ min و max دکمهٔ مربوط غیرفعال؛ ورودی دستی هم به همان حد گیر می‌کند. */
export function QuantityStepper({ value, onChange, min = 1, max = 99, itemName, disabled, className }: QuantityStepperProps) {
  const v = clampQty(value, min, max);
  return (
    <div role="group" aria-label={`تعداد ${itemName}`} className={cx("cx-qty", className)}>
      <IconButton icon="minus" size="sm" variant="secondary" label={`کم‌کردن تعداد ${itemName}`} disabled={disabled || v <= min} onClick={() => onChange(clampQty(v - 1, min, max))} />
      <input
        className="cx-qty__input cx-num"
        inputMode="numeric"
        aria-label={`تعداد ${itemName}`}
        disabled={disabled}
        value={toFaDigits(v)}
        onChange={(e) => onChange(parseQty(e.target.value, min, max))}
      />
      <IconButton icon="plus" size="sm" variant="secondary" label={`افزودن تعداد ${itemName}`} disabled={disabled || v >= max} onClick={() => onChange(clampQty(v + 1, min, max))} />
    </div>
  );
}

/* ---------- Countdown (رزرو موجودی) ---------- */

export interface CountdownProps {
  /** زمان انقضای سفارش (ISO یا ms) از سرور */
  expiresAt: string | number | Date;
  onExpire?: () => void;
  label?: string;
  className?: string;
}

/** تایمر بصری هر ثانیه؛ برای صفحه‌خوان فقط هر دقیقه و در آستانه‌ها اعلام می‌شود (نه هر ثانیه). */
export function Countdown({ expiresAt, onExpire, label = "زمان باقی‌ماندهٔ رزرو", className }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null); // SSR: بدون زمان تا هیدراسیون ناسازگار نشود
  const announced = useRef("");
  const expired = useRef(false);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now === null ? null : remainingSeconds(expiresAt, now);
  useEffect(() => {
    if (left === 0 && !expired.current) {
      expired.current = true;
      onExpire?.();
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  if (left === null) return <span className={cx("cx-countdown", className)}><Icon name="clock" size={16} /> {label}</span>;
  const u = urgency(left);
  const spoken = shouldAnnounce(left) ? (left <= 0 ? "رزرو منقضی شد" : `${label}: ${formatClock(left)}`) : announced.current;
  announced.current = spoken;
  return (
    <p className={cx("cx-countdown", `cx-countdown--${u}`, className)}>
      <Icon name="clock" size={16} />
      <span>{label}</span>
      <time className="cx-num" aria-hidden="true">{formatClock(left)}</time>
      <span role="status" className="cx-sr-only">{spoken}</span>
    </p>
  );
}

/* ---------- OrderTimeline ---------- */

export function OrderTimeline({ status, className }: { status: OrderStatus; className?: string }) {
  const steps = timelineSteps(status);
  return (
    <ol className={cx("cx-timeline", className)} aria-label="مراحل سفارش">
      {steps.map((s) => (
        <li key={s.status} className={cx("cx-timeline__step", `cx-timeline__step--${s.state}`, s.tone !== "normal" && `cx-timeline__step--${s.tone}`)} aria-current={s.state === "current" ? "step" : undefined}>
          <span className="cx-timeline__dot" aria-hidden="true">{s.state === "done" ? <Icon name="check" size={12} strokeWidth={2.6} /> : null}</span>
          <span className="cx-timeline__label">
            {s.label}
            {s.state === "done" ? <span className="cx-sr-only"> (انجام شد)</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- MiniCart ---------- */

export interface CartLine {
  id: string;
  name: string;
  href: string;
  imageSrc?: string;
  unitToman: number;
  qty: number;
  maxQty?: number;
  /** هشدار تغییر قیمت یا موجودی نسبت به آخرین مشاهده */
  warning?: string;
}

export interface MiniCartProps {
  open: boolean;
  onClose: () => void;
  lines: readonly CartLine[];
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  checkoutHref: string;
  footerNote?: ReactNode;
}

export function MiniCart({ open, onClose, lines, onQtyChange, onRemove, checkoutHref, footerNote }: MiniCartProps) {
  const total = lines.reduce((s, l) => s + l.unitToman * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={count ? `سبد خرید (${toFaDigits(count)} کالا)` : "سبد خرید"}
      footer={
        lines.length ? (
          <div className="cx-minicart__foot">
            <p className="cx-minicart__total"><span>جمع کالاها</span><strong className="cx-num">{formatToman(total)}</strong></p>
            {footerNote ? <p className="cx-minicart__note">{footerNote}</p> : null}
            <ButtonLink href={checkoutHref} variant="primary" size="lg" fullWidth>ادامه و ثبت سفارش</ButtonLink>
          </div>
        ) : null
      }
    >
      {lines.length === 0 ? (
        <EmptyState title="سبد خرید خالی است" description="کالایی که می‌پسندید را به سبد اضافه کنید." action={<ButtonLink href="/" variant="secondary">دیدن کالاها</ButtonLink>} />
      ) : (
        <ul className="cx-minicart__list">
          {lines.map((l) => (
            <li key={l.id} className="cx-minicart__line">
              {l.imageSrc ? <img src={l.imageSrc} alt="" width={64} height={80} loading="lazy" /> : null}
              <div className="cx-minicart__info">
                <a href={l.href}><bdi>{l.name}</bdi></a>
                <p className="cx-num">{formatToman(l.unitToman)}</p>
                {l.warning ? <p className="cx-minicart__warn"><Icon name="alert" size={14} /> {l.warning}</p> : null}
                <div className="cx-minicart__row">
                  <QuantityStepper value={l.qty} max={l.maxQty ?? 99} itemName={l.name} onChange={(q) => onQtyChange(l.id, q)} />
                  <IconButton icon="trash" size="sm" label={`حذف ${l.name} از سبد`} onClick={() => onRemove(l.id)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
