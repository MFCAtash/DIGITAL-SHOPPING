"use client";
import { useRef, useState } from "react";
import { PROVINCES } from "../data/provinces";
import { cx } from "../lib/cx";
import { formatPostalCode, normalizePhone, normalizePostalCode, validateAddress, type AddressErrors, type AddressField, type AddressInput } from "../lib/address";
import type { Option } from "../lib/text";
import { Button } from "./button";
import { Combobox } from "./combobox";
import { TextField } from "./form";

export interface AddressFormProps {
  initial?: Partial<AddressInput>;
  /** فهرست شهرهای استان انتخاب‌شده (اختیاری؛ در نبود آن متن آزاد پذیرفته می‌شود) */
  citiesFor?: (province: string) => readonly string[];
  onSubmit: (address: AddressInput) => void;
  submitLabel?: string;
  loading?: boolean;
  className?: string;
}

const EMPTY: AddressInput = { receiverName: "", receiverPhone: "", province: "", city: "", postalCode: "", street: "", plate: "", unit: "" };
const ORDER: AddressField[] = ["receiverName", "receiverPhone", "province", "city", "postalCode", "street"];
const PROVINCE_OPTIONS: Option[] = PROVINCES.map((p) => ({ value: p, label: p }));

/**
 * فرم نشانی: استان از فهرست، شهر (فهرست یا متن آزاد)، کد پستی ۱۰ رقمی با نمایش ۵-۵، موبایل 09…
 * اعتبارسنجی هنگام ثبت؛ پس از آن بلافاصله با هر تغییر اصلاح می‌شود. اولین فیلد نامعتبر فوکوس می‌گیرد.
 */
export function AddressForm({ initial, citiesFor, onSubmit, submitLabel = "ذخیرهٔ نشانی", loading, className }: AddressFormProps) {
  const [v, setV] = useState<AddressInput>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<AddressErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const set = <K extends AddressField>(k: K, val: string) => {
    const next = { ...v, [k]: val };
    setV(next);
    if (submitted) setErrors(validateAddress(next));
  };

  const cityOptions: Option[] = (citiesFor?.(v.province) ?? []).map((c) => ({ value: c, label: c }));

  return (
    <form
      ref={form}
      noValidate
      className={cx("cx-form", className)}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        const errs = validateAddress(v);
        setErrors(errs);
        const first = ORDER.find((k) => errs[k]);
        if (first) {
          form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
          return;
        }
        onSubmit({ ...v, receiverPhone: normalizePhone(v.receiverPhone), postalCode: normalizePostalCode(v.postalCode) });
      }}
    >
      <TextField label="نام و نام خانوادگی گیرنده" name="receiverName" autoComplete="name" required value={v.receiverName} error={errors.receiverName} onChange={(e) => set("receiverName", e.target.value)} />
      <TextField label="شمارهٔ موبایل گیرنده" name="receiverPhone" autoComplete="tel" inputMode="tel" contentDir="ltr" required placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={v.receiverPhone} error={errors.receiverPhone} onChange={(e) => set("receiverPhone", e.target.value)} />
      <div className="cx-form__row">
        <Combobox label="استان" name="province" required options={PROVINCE_OPTIONS} value={v.province} error={errors.province} onValueChange={(val) => setV((s) => ({ ...s, province: val, city: val === s.province ? s.city : "" }))} />
        <Combobox label="شهر" name="city" required allowCustom options={cityOptions} value={v.city} error={errors.city} emptyText="شهر را بنویسید" onValueChange={(val) => set("city", val)} />
      </div>
      <TextField label="کد پستی" name="postalCode" autoComplete="postal-code" inputMode="numeric" contentDir="ltr" required hint="۱۰ رقم، بدون فاصله" value={formatPostalCode(v.postalCode)} error={errors.postalCode} onChange={(e) => set("postalCode", normalizePostalCode(e.target.value))} />
      <TextField label="نشانی کامل" name="street" autoComplete="street-address" required value={v.street} error={errors.street} onChange={(e) => set("street", e.target.value)} />
      <div className="cx-form__row">
        <TextField label="پلاک" name="plate" inputMode="numeric" value={v.plate ?? ""} onChange={(e) => set("plate", e.target.value)} />
        <TextField label="واحد" name="unit" inputMode="numeric" value={v.unit ?? ""} onChange={(e) => set("unit", e.target.value)} />
      </div>
      <Button type="submit" variant="primary" size="lg" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
