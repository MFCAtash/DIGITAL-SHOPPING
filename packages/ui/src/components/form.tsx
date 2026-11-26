"use client";
import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { Icon } from "../icons/Icon";

/* ---------- پیام راهنما و خطا: خطا همیشه آیکون + متن دارد (نه فقط رنگ) ---------- */

function Messages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint ? <p id={`${id}-hint`} className="cx-field__hint">{hint}</p> : null}
      <p id={`${id}-err`} className="cx-field__error" aria-live="polite">
        {error ? (
          <>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </>
        ) : null}
      </p>
    </>
  );
}

const describedBy = (id: string, hint?: string, error?: string): string | undefined => {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ");
  return ids || undefined;
};

/* ---------- Input ---------- */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** ورودی خام؛ حتماً aria-label یا برچسب بیرونی بدهید. برای فرم‌ها از TextField استفاده کنید. */
export function Input({ invalid, className, ...rest }: InputProps) {
  return <input {...rest} aria-invalid={invalid || undefined} className={cx("cx-input", className)} />;
}

export interface TextFieldProps extends Omit<InputProps, "id"> {
  label: string;
  hint?: string;
  error?: string;
  /** جهت محتوا؛ برای شماره، کد پستی و ایمیل «ltr» */
  contentDir?: "ltr" | "rtl";
  id?: string;
}

export function TextField({ label, hint, error, contentDir, required, id: idProp, className, ...rest }: TextFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={cx("cx-field", className)}>
      <label htmlFor={id} className="cx-field__label">
        {label}
        {required ? <span className="cx-field__req" aria-hidden="true"> *</span> : null}
      </label>
      <Input {...rest} id={id} required={required} dir={contentDir} invalid={!!error} aria-describedby={describedBy(id, hint, error)} />
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

export function TextAreaField({ label, hint, error, id: idProp, className, required, ...rest }: TextAreaFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={cx("cx-field", className)}>
      <label htmlFor={id} className="cx-field__label">
        {label}
        {required ? <span className="cx-field__req" aria-hidden="true"> *</span> : null}
      </label>
      <textarea {...rest} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} className="cx-input cx-input--area" />
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

/* ---------- Select (بومی: بهترین دسترس‌پذیری و کیبورد/موبایل) ---------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> {
  label: string;
  options: readonly SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  /** برچسب فقط برای صفحه‌خوان (مثلاً در نوار مرتب‌سازی) */
  hideLabel?: boolean;
  id?: string;
}

export function SelectField({ label, options, placeholder, hint, error, hideLabel, id: idProp, className, required, ...rest }: SelectFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={cx("cx-field", className)}>
      <label htmlFor={id} className={cx("cx-field__label", hideLabel && "cx-sr-only")}>
        {label}
        {required ? <span className="cx-field__req" aria-hidden="true"> *</span> : null}
      </label>
      <div className="cx-select">
        <select {...rest} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} className="cx-input cx-select__control">
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={18} className="cx-select__icon" />
      </div>
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

/* ---------- Checkbox / Radio ---------- */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label: ReactNode;
  /** عدد کنار برچسب، مثلاً تعداد نتیجه در فیلتر */
  count?: string;
}

export function Checkbox({ label, count, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx("cx-check", className)}>
      <input {...rest} type="checkbox" className="cx-check__input" />
      <span className="cx-check__box" aria-hidden="true">
        <Icon name="check" size={14} strokeWidth={2.4} />
      </span>
      <span className="cx-check__text">{label}</span>
      {count ? <span className="cx-check__count">{count}</span> : null}
    </label>
  );
}

export interface RadioGroupProps {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string; disabled?: boolean; hint?: string }[];
  error?: string;
  className?: string;
}

/** گروه رادیو با fieldset/legend؛ فلش‌ها و Tab را خود مرورگر درست مدیریت می‌کند. */
export function RadioGroup({ legend, name, value, onChange, options, error, className }: RadioGroupProps) {
  const id = useId();
  return (
    <fieldset className={cx("cx-fieldset", className)} aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="cx-field__label">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="cx-check cx-check--radio">
          <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled} onChange={() => onChange(o.value)} className="cx-check__input" />
          <span className="cx-check__box" aria-hidden="true" />
          <span className="cx-check__text">
            {o.label}
            {o.hint ? <small className="cx-check__hint">{o.hint}</small> : null}
          </span>
        </label>
      ))}
      <Messages id={id} error={error} />
    </fieldset>
  );
}

/* ---------- Switch ---------- */

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onCheckedChange(!checked)} className={cx("cx-switch", className)}>
      <span className="cx-switch__track" aria-hidden="true">
        <span className="cx-switch__thumb" />
      </span>
      <span className="cx-switch__label">{label}</span>
    </button>
  );
}
