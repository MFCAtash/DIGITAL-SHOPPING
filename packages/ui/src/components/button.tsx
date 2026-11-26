import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "../icons/Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const classes = (p: CommonProps & { loading?: boolean; className?: string }): string =>
  cx("cx-btn", `cx-btn--${p.variant ?? "secondary"}`, `cx-btn--${p.size ?? "md"}`, p.fullWidth && "cx-btn--block", p.loading && "cx-btn--loading", p.className);

export type ButtonProps = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { type?: "button" | "submit" | "reset"; loading?: boolean };

/** دکمه. «primary» فقط برای یک اقدام اصلی در هر صفحه (رنگ سیگنال). loading ⇒ غیرفعال + aria-busy. */
export function Button({ variant, size, iconStart, iconEnd, fullWidth, loading, className, children, type = "button", disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes({ variant, size, fullWidth, loading, className })}>
      {loading ? <span className="cx-spinner" aria-hidden="true" /> : iconStart}
      <span className="cx-btn__label">{children}</span>
      {iconEnd}
    </button>
  );
}

export type ButtonLinkProps = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function ButtonLink({ variant, size, iconStart, iconEnd, fullWidth, className, children, ...rest }: ButtonLinkProps) {
  return (
    <a {...rest} className={classes({ variant, size, fullWidth, className })}>
      {iconStart}
      <span className="cx-btn__label">{children}</span>
      {iconEnd}
    </a>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  /** اجباری: نام قابل‌خواندن برای صفحه‌خوان */
  label: string;
  icon: IconName;
  mirror?: boolean;
  variant?: Exclude<ButtonVariant, "primary">;
  size?: ButtonSize;
  type?: "button" | "submit" | "reset";
  /** وضعیت فشرده (مثلاً علاقه‌مندی) */
  pressed?: boolean;
  badge?: number;
}

export function IconButton({ label, icon, mirror, variant = "ghost", size = "md", type = "button", pressed, badge, className, ...rest }: IconButtonProps) {
  return (
    <button {...rest} type={type} aria-label={label} aria-pressed={pressed} className={cx("cx-btn", "cx-btn--icon", `cx-btn--${variant}`, `cx-btn--${size}`, className)}>
      <Icon name={icon} mirror={mirror} />
      {badge ? <span className="cx-btn__badge" aria-hidden="true">{badge}</span> : null}
    </button>
  );
}
