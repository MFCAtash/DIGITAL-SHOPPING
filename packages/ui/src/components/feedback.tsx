"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "../icons/Icon";

/* ---------- Badge ---------- */

export type BadgeTone = "neutral" | "signal" | "positive" | "warning" | "danger";

export function Badge({ tone = "neutral", icon, children, className }: { tone?: BadgeTone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cx("cx-badge", `cx-badge--${tone}`, className)}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

/* ---------- Alert (درون‌صفحه) ---------- */

export function Alert({ tone = "info", title, children }: { tone?: "info" | "warning" | "danger" | "success"; title?: string; children?: ReactNode }) {
  const icon: IconName = tone === "success" ? "check" : tone === "info" ? "info" : "alert";
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("cx-alert", `cx-alert--${tone}`)}>
      <Icon name={icon} size={20} />
      <div>
        {title ? <p className="cx-alert__title">{title}</p> : null}
        {children ? <div className="cx-alert__body">{children}</div> : null}
      </div>
    </div>
  );
}

/* ---------- Skeleton: هم‌شکل با چیدمان واقعی تا پرش (CLS) نداشته باشیم ---------- */

export function Skeleton({ className, style }: { className?: string; style?: Record<string, string | number> }) {
  return <span aria-hidden="true" className={cx("cx-skel", className)} style={style} />;
}

/** اسکلت دقیقاً هم‌شکل ProductCard (حالت grid) */
export function ProductCardSkeleton() {
  return (
    <div className="cx-card cx-card--grid" aria-hidden="true">
      <Skeleton className="cx-skel--media" />
      <div className="cx-card__body">
        <Skeleton className="cx-skel--line cx-skel--short" />
        <Skeleton className="cx-skel--line" />
        <Skeleton className="cx-skel--line cx-skel--price" />
      </div>
    </div>
  );
}

/** تگ نامرئی برای اعلام «در حال بارگذاری» به صفحه‌خوان */
export function LoadingAnnouncer({ label = "در حال بارگذاری" }: { label?: string }) {
  return <span role="status" className="cx-sr-only">{label}</span>;
}

/* ---------- EmptyState / ErrorState: تصویرسازی خطی از «جعبه»، نه تصویر کلیشه‌ای ---------- */

function BoxIllustration() {
  return (
    <svg viewBox="0 0 120 96" width="120" height="96" fill="none" stroke="var(--cx-line-strong)" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 34 60 14l48 20v40L60 94 12 74z" />
      <path d="M12 34l48 20 48-20M60 54v40" />
      <path d="M36 24l48 20" strokeDasharray="3 4" />
    </svg>
  );
}

export interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div className={cx("cx-state", className)}>
      <BoxIllustration />
      <h2 className="cx-state__title">{title}</h2>
      {description ? <p className="cx-state__desc">{description}</p> : null}
      {action ? <div className="cx-state__action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "مشکلی پیش آمد", description = "لطفاً دوباره تلاش کنید. اگر ادامه داشت، با پشتیبانی تماس بگیرید.", action, className }: Partial<StateProps>) {
  return (
    <div role="alert" className={cx("cx-state", "cx-state--error", className)}>
      <Icon name="alert" size={40} />
      <h2 className="cx-state__title">{title}</h2>
      <p className="cx-state__desc">{description}</p>
      {action ? <div className="cx-state__action">{action}</div> : null}
    </div>
  );
}

/* ---------- OfflineBanner ---------- */

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function OfflineBanner({ message = "اتصال اینترنت قطع است. سبد و پرداخت تا وصل‌شدن دوباره در دسترس نیستند." }: { message?: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="cx-offline">
      <Icon name="alert" size={18} />
      <span>{message}</span>
    </div>
  );
}
