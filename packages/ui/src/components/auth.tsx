"use client";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "../lib/cx";
import { toFaDigits } from "../lib/format";
import { applyBackspace, applyInput, emptyOtp, otpComplete, otpString, OTP_LENGTH, sanitizeOtp } from "../lib/otp";
import { Icon } from "../icons/Icon";

export interface OtpInputProps {
  length?: number;
  /** وقتی همهٔ خانه‌ها پر شد (کد ۶ رقمی لاتین) */
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * ورود کد یک‌بارمصرف: خانه‌های جدا با چینش ثابت چپ‌به‌راست (ارقام همیشه LTR)، autofill پیامک با
 * autocomplete="one-time-code"، چسباندن کل کد، Backspace هوشمند و فلش‌ها.
 */
export function OtpInput({ length = OTP_LENGTH, onComplete, error, disabled, label = "کد تأیید", className }: OtpInputProps) {
  const id = useId();
  const [value, setValue] = useState<string[]>(() => emptyOtp(length));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const focusAt = useRef<number | null>(null);

  useEffect(() => {
    if (focusAt.current !== null) {
      refs.current[focusAt.current]?.focus();
      focusAt.current = null;
    }
  }, [value]);

  const commit = (next: string[], focus: number) => {
    focusAt.current = focus;
    setValue(next);
    if (otpComplete(next)) onComplete(otpString(next));
  };

  return (
    <div role="group" aria-labelledby={`${id}-l`} aria-describedby={error ? `${id}-e` : undefined} className={cx("cx-otp", className)}>
      <p id={`${id}-l`} className="cx-field__label">{label}</p>
      <div className="cx-otp__cells" dir="ltr">
        {value.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="cx-input cx-otp__cell cx-num"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`رقم ${toFaDigits(i + 1)} از ${toFaDigits(length)}`}
            aria-invalid={!!error || undefined}
            disabled={disabled}
            value={c ? toFaDigits(c) : ""}
            onChange={(e) => {
              const r = applyInput(value, i, e.target.value);
              commit(r.value, r.focus);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                e.preventDefault();
                const r = applyBackspace(value, i);
                commit(r.value, r.focus);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                refs.current[Math.max(0, i - 1)]?.focus();
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                refs.current[Math.min(length - 1, i + 1)]?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const r = applyInput(value, i, e.clipboardData.getData("text"));
              commit(r.value, r.focus);
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
        ))}
      </div>
      <p id={`${id}-e`} className="cx-field__error" aria-live="polite">
        {error ? (
          <>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}

/**
 * WebOTP: روی مرورگرهای پشتیبان، کد پیامک (با قالب «@دامنه #کد») خودکار خوانده می‌شود.
 * در صورت نبود پشتیبانی بی‌صدا هیچ‌کاری نمی‌کند (autocomplete="one-time-code" همچنان کار می‌کند).
 */
export function useWebOtp(onCode: (code: string) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    const creds = navigator.credentials as unknown as { get: (o: unknown) => Promise<{ code?: string } | null> };
    creds
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((r) => {
        const code = sanitizeOtp(r?.code ?? "");
        if (code) onCode(code);
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
