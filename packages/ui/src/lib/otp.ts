import { toEnDigits } from "./format";

export const OTP_LENGTH = 6;

/** فقط ارقام (فارسی/عربی هم پذیرفته)؛ به طول مجاز بریده می‌شود. */
export function sanitizeOtp(raw: string, length = OTP_LENGTH): string {
  return toEnDigits(raw).replace(/\D/g, "").slice(0, length);
}

export interface OtpEdit {
  value: string[];
  /** خانه‌ای که باید فوکوس بگیرد */
  focus: number;
}

export function emptyOtp(length = OTP_LENGTH): string[] {
  return Array.from({ length }, () => "");
}

/** تایپ تک‌رقم، چسباندن چندرقمی، یا autofill پیامک از خانهٔ index. */
export function applyInput(value: readonly string[], index: number, raw: string): OtpEdit {
  const digits = sanitizeOtp(raw, value.length - index);
  const next = [...value];
  if (digits === "") {
    next[index] = "";
    return { value: next, focus: index };
  }
  for (let i = 0; i < digits.length; i++) next[index + i] = digits[i]!;
  return { value: next, focus: Math.min(index + digits.length, value.length - 1) };
}

export function applyBackspace(value: readonly string[], index: number): OtpEdit {
  const next = [...value];
  if (next[index]) {
    next[index] = "";
    return { value: next, focus: index };
  }
  const prev = Math.max(0, index - 1);
  next[prev] = "";
  return { value: next, focus: prev };
}

export const otpComplete = (value: readonly string[]): boolean => value.every((c) => c.length === 1);
export const otpString = (value: readonly string[]): string => value.join("");
