"use client";
import { cloneElement, useEffect, useId, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { cx } from "../lib/cx";
import { IconButton } from "./button";

/* ---------- Modal / Sheet: روی <dialog> بومی (تله فوکوس، Esc، بازگردانی فوکوس را مرورگر انجام می‌دهد) ---------- */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** dialog: وسط صفحه؛ sheet: موبایل از پایین، دسکتاپ از لبهٔ انتهایی */
  variant?: "dialog" | "sheet";
  /** فوتر ثابت (مثلاً دکمهٔ «نمایش نتایج») */
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
}

export function Modal({ open, onClose, title, children, variant = "dialog", footer, closeLabel = "بستن", className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // قفل اسکرول پس‌زمینه تا زمانی که باز است
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx("cx-modal", `cx-modal--${variant}`, className)}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // کلیک روی پس‌زمینه
      }}
    >
      <div className="cx-modal__panel">
        <header className="cx-modal__head">
          <h2 id={titleId} className="cx-modal__title">{title}</h2>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </header>
        <div className="cx-modal__body">{children}</div>
        {footer ? <footer className="cx-modal__foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}

export type SheetProps = Omit<ModalProps, "variant">;
export const Sheet = (props: SheetProps) => <Modal {...props} variant="sheet" />;

/* ---------- Tooltip: متن کمکی کوتاه، با هاور و فوکوس، بسته‌شدن با Esc ---------- */

export interface TooltipProps {
  label: string;
  /** یک عنصر قابل‌فوکوس (دکمه/پیوند) */
  children: ReactElement;
}

export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="cx-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {/* cloneElement با ReactElement عمومی، prop دلخواه را قبول نمی‌کند؛
          انتقال به Element<PropsWithChildren<Record<string, unknown>>> progressed بدون تغییر خروجی. */}
      {cloneElement(children as ReactElement<Record<string, unknown>>, { "aria-describedby": id })}
      <span role="tooltip" id={id} hidden={!open} className="cx-tip__bubble">{label}</span>
    </span>
  );
}
