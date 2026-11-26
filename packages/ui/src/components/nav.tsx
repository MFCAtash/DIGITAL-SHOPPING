import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { toFaDigits, type FormatLocale } from "../lib/format";
import { pageRange } from "../lib/pagination";
import { Icon } from "../icons/Icon";

/* ---------- Breadcrumb ---------- */

export interface Crumb {
  label: string;
  href?: string;
}

/** مسیر صفحه؛ آخرین مورد aria-current="page". جداکننده با CSS (در RTL خودکار درست است). */
export function Breadcrumb({ items, label = "مسیر صفحه", className }: { items: readonly Crumb[]; label?: string; className?: string }) {
  return (
    <nav aria-label={label} className={cx("cx-crumb", className)}>
      <ol className="cx-crumb__list">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${c.label}`} className="cx-crumb__item">
              {last || !c.href ? <span aria-current={last ? "page" : undefined}>{c.label}</span> : <a href={c.href}>{c.label}</a>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------- Pagination ---------- */

export interface PaginationProps {
  current: number;
  total: number;
  /** با href صفحه‌ها پیوند واقعی می‌شوند (سئو و باز کردن در تب جدید) */
  hrefFor?: (page: number) => string;
  onChange?: (page: number) => void;
  label?: string;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
  locale?: FormatLocale;
}

export function Pagination({ current, total, hrefFor, onChange, label = "صفحه‌بندی", prevLabel = "صفحهٔ قبل", nextLabel = "صفحهٔ بعد", className, locale = "fa" }: PaginationProps) {
  if (total <= 1) return null;
  const item = (page: number, content: ReactNode, opts: { current?: boolean; disabled?: boolean; aria: string }) => {
    const cls = cx("cx-page", opts.current && "cx-page--current");
    if (opts.disabled) return <span className={cx(cls, "cx-page--disabled")} aria-disabled="true" aria-label={opts.aria}>{content}</span>;
    if (hrefFor) return <a href={hrefFor(page)} className={cls} aria-label={opts.aria} aria-current={opts.current ? "page" : undefined}>{content}</a>;
    return <button type="button" className={cls} aria-label={opts.aria} aria-current={opts.current ? "page" : undefined} onClick={() => onChange?.(page)}>{content}</button>;
  };
  return (
    <nav aria-label={label} className={cx("cx-pager", className)}>
      <ul className="cx-pager__list">
        <li>{item(current - 1, <Icon name="chevron-start" mirror />, { disabled: current <= 1, aria: prevLabel })}</li>
        {pageRange(current, total).map((p, i) =>
          p === "gap" ? (
            <li key={`g${i}`} aria-hidden="true" className="cx-pager__gap">…</li>
          ) : (
            <li key={p}>{item(p, toFaDigits(p, locale), { current: p === current, aria: `${locale === "en" ? "Page " : "صفحهٔ "}${toFaDigits(p, locale)}` })}</li>
          ),
        )}
        <li>{item(current + 1, <Icon name="chevron-end" mirror />, { disabled: current >= total, aria: nextLabel })}</li>
      </ul>
    </nav>
  );
}

/* ---------- Stepper (مراحل checkout) ---------- */

export interface StepperProps {
  steps: readonly string[];
  /** شاخص مرحلهٔ جاری (از صفر) */
  current: number;
  label?: string;
  className?: string;
  locale?: FormatLocale;
}

export function Stepper({ steps, current, label = "مراحل خرید", className, locale = "fa" }: StepperProps) {
  return (
    <nav aria-label={label} className={cx("cx-stepper", className)}>
      <ol className="cx-stepper__list">
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          return (
            <li key={s} className={cx("cx-step", `cx-step--${state}`)} aria-current={state === "current" ? "step" : undefined}>
              <span className="cx-step__dot" aria-hidden="true">{state === "done" ? <Icon name="check" size={14} strokeWidth={2.4} /> : toFaDigits(i + 1, locale)}</span>
              <span className="cx-step__label">
                {s}
                {state === "done" ? <span className="cx-sr-only"> ({locale === "en" ? "done" : "انجام شد"})</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
