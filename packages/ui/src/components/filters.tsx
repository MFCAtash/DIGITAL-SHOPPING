"use client";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { toFaDigits, type FormatLocale } from "../lib/format";
import { Button } from "./button";
import { Checkbox, SelectField, type SelectOption } from "./form";
import { Sheet } from "./overlay";

export interface FilterOption {
  value: string;
  label: string;
  /** تعداد نتیجه (عدد خام؛ فارسی نمایش داده می‌شود) */
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: readonly FilterOption[];
}

export type FilterSelection = Record<string, readonly string[]>;

export interface FilterPanelProps {
  groups: readonly FilterGroup[];
  selected: FilterSelection;
  onChange: (next: FilterSelection) => void;
  onClear?: () => void;
  /** بخش‌های اضافه (مثلاً بازهٔ قیمت) */
  extra?: ReactNode;
  className?: string;
  /** برچسبهای قابلترجمه؛ پیشفرض فارسی برای سازگاری با مصرفکنندگان قدیمی */
  locale?: FormatLocale;
  title?: string;
  clearLabel?: string;
  closeLabel?: string;
  showPrefix?: string;
  showSuffix?: string;
}

export const activeFilterCount = (s: FilterSelection): number => Object.values(s).reduce((n, v) => n + v.length, 0);

/** فیلترها: هر گروه یک fieldset/legend؛ تعداد نتیجه کنار هر گزینه؛ «پاک‌کردن» با شمار فعال‌ها. */
export function FilterPanel({ groups, selected, onChange, onClear, extra, className, locale = "fa", title = "فیلترها", clearLabel = "پاک‌کردن همه", closeLabel = "بستن", showPrefix = "نمایش", showSuffix = "کالا" }: FilterPanelProps) {
  const active = activeFilterCount(selected);
  const toggle = (gid: string, value: string, on: boolean) => {
    const cur = selected[gid] ?? [];
    onChange({ ...selected, [gid]: on ? [...cur, value] : cur.filter((x) => x !== value) });
  };
  return (
    <div className={cx("cx-filters", className)}>
      <div className="cx-filters__head">
        <h2 className="cx-filters__title">{title}{active ? <span className="cx-filters__n"> ({toFaDigits(active, locale)})</span> : null}</h2>
        {onClear && active ? <Button variant="ghost" size="sm" onClick={onClear}>{clearLabel}</Button> : null}
      </div>
      {groups.map((g) => (
        <fieldset key={g.id} className="cx-fieldset cx-filters__group">
          <legend className="cx-field__label">{g.label}</legend>
          {g.options.map((o) => (
            <Checkbox key={o.value} label={o.label} count={o.count === undefined ? undefined : toFaDigits(o.count, locale)} checked={(selected[g.id] ?? []).includes(o.value)} onChange={(e) => toggle(g.id, o.value, e.target.checked)} />
          ))}
        </fieldset>
      ))}
      {extra}
    </div>
  );
}

export interface FilterSheetProps extends FilterPanelProps {
  open: boolean;
  onClose: () => void;
  resultCount: number;
}

/** نسخهٔ موبایل: فیلترها در Sheet با دکمهٔ ثابت «نمایش N کالا». */
export function FilterSheet({ open, onClose, resultCount, title = "فیلترها", closeLabel = "بستن", showPrefix = "نمایش", showSuffix = "کالا", locale = "fa", ...panel }: FilterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel={closeLabel} footer={<Button variant="primary" size="lg" fullWidth onClick={onClose}>{`${showPrefix} ${toFaDigits(resultCount, locale)} ${showSuffix}`}</Button>}>
      <FilterPanel {...panel} locale={locale} title={title} closeLabel={closeLabel} showPrefix={showPrefix} showSuffix={showSuffix} />
    </Sheet>
  );
}

export interface SortMenuProps {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  label?: string;
}

export function SortMenu({ value, options, onChange, label = "مرتب‌سازی" }: SortMenuProps) {
  return <SelectField label={label} options={options} value={value} onChange={(e) => onChange(e.target.value)} className="cx-sort" />;
}
