import { PROVINCES } from "../data/provinces";
import { toEnDigits } from "./format";

export interface AddressInput {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  postalCode: string;
  street: string;
  plate?: string;
  unit?: string;
}

export type AddressField = keyof AddressInput;
export type AddressErrors = Partial<Record<AddressField, string>>;

export const MOBILE_RE = /^09\d{9}$/;
export const POSTAL_RE = /^\d{10}$/;

/** هم‌قاعدهٔ backend/apps/core/persian.py: normalize_phone (تست متقابل روی contracts/phone-cases.json). */
export function normalizePhone(raw: string): string {
  let s = toEnDigits(raw).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (s.startsWith("98") && s.length === 12) s = "0" + s.slice(2);
  else if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return s;
}

/** شمارهٔ موبایل نرمال‌شده 09XXXXXXXXX یا null (معادل ValueError در بک‌اند). */
export function parsePhone(raw: string): string | null {
  const s = normalizePhone(raw);
  return MOBILE_RE.test(s) ? s : null;
}
export const normalizePostalCode = (raw: string): string => toEnDigits(raw).replace(/\D/g, "").slice(0, 10);

/** نمایش ۵-۵ برای خوانایی: 12345-67890 */
export function formatPostalCode(raw: string): string {
  const d = normalizePostalCode(raw);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** اعتبارسنجی فرم آدرس؛ پیام‌ها فارسی و قابل نمایش مستقیم. همان قواعد بک‌اند (کد پستی ۱۰ رقمی، موبایل 09…). */
export function validateAddress(input: AddressInput): AddressErrors {
  const e: AddressErrors = {};
  if (input.receiverName.trim().length < 3) e.receiverName = "نام و نام خانوادگی گیرنده را کامل بنویسید.";
  if (!MOBILE_RE.test(normalizePhone(input.receiverPhone))) e.receiverPhone = "شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.";
  if (!(PROVINCES as readonly string[]).includes(input.province)) e.province = "استان را از فهرست انتخاب کنید.";
  if (input.city.trim().length < 2) e.city = "شهر را بنویسید یا انتخاب کنید.";
  if (!POSTAL_RE.test(normalizePostalCode(input.postalCode))) e.postalCode = "کد پستی باید ۱۰ رقم باشد.";
  if (input.street.trim().length < 5) e.street = "نشانی را دقیق‌تر بنویسید (خیابان، کوچه).";
  return e;
}
