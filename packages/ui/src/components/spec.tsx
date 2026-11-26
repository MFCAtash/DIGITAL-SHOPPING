"use client";
import { useId, useMemo, useState } from "react";
import { cx } from "../lib/cx";
import { diffRows, onlyDifferences, type CellValue, type CompareRow } from "../lib/compare";
import { toFaDigits } from "../lib/format";
import { Checkbox } from "./form";
import { IconButton } from "./button";

const show = (v: CellValue): string => (v === true ? "دارد" : v === false ? "ندارد" : v === null || v === undefined || v === "" ? "—" : typeof v === "number" ? toFaDigits(v) : v);

/* ---------- SpecTable: برگهٔ مشخصات (گروه‌بندی‌شده) ---------- */

export interface SpecGroup {
  title: string;
  rows: readonly { label: string; value: CellValue }[];
}

export function SpecTable({ groups, caption = "مشخصات فنی", className }: { groups: readonly SpecGroup[]; caption?: string; className?: string }) {
  return (
    <table className={cx("cx-spec", className)}>
      <caption className="cx-sr-only">{caption}</caption>
      {groups.map((g) => (
        <tbody key={g.title}>
          <tr>
            <th colSpan={2} scope="colgroup" className="cx-spec__group">{g.title}</th>
          </tr>
          {g.rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="cx-spec__label">{r.label}</th>
              <td className="cx-spec__value"><bdi>{show(r.value)}</bdi></td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/* ---------- CompareTable ---------- */

export interface CompareProduct {
  id: string;
  name: string;
  href?: string;
  imageSrc?: string;
}

export interface CompareTableProps {
  products: readonly CompareProduct[];
  rows: readonly CompareRow[];
  onRemove?: (id: string) => void;
  className?: string;
}

/**
 * مقایسه: ستون اول چسبان (در RTL سمت راست)، دکمهٔ «فقط تفاوت‌ها»، و علامت‌گذاری سطرهای متفاوت
 * با نشان و متن (نه فقط رنگ). ناحیهٔ اسکرول با کیبورد قابل‌فوکوس است.
 */
export function CompareTable({ products, rows, onRemove, className }: CompareTableProps) {
  const [only, setOnly] = useState(false);
  const id = useId();
  const all = useMemo(() => diffRows(rows), [rows]);
  const visible = only ? onlyDifferences(all) : all;
  return (
    <div className={cx("cx-compare", className)}>
      <Checkbox label="فقط تفاوت‌ها" checked={only} onChange={(e) => setOnly(e.target.checked)} />
      <div role="region" aria-labelledby={`${id}-cap`} tabIndex={0} className="cx-compare__scroll">
        <table className="cx-compare__table">
          <caption id={`${id}-cap`} className="cx-sr-only">مقایسهٔ مشخصات کالاها</caption>
          <thead>
            <tr>
              <td className="cx-compare__corner" />
              {products.map((p) => (
                <th key={p.id} scope="col" className="cx-compare__product">
                  {p.imageSrc ? <img src={p.imageSrc} alt="" width={96} height={120} loading="lazy" /> : null}
                  {p.href ? <a href={p.href}><bdi>{p.name}</bdi></a> : <bdi>{p.name}</bdi>}
                  {onRemove ? <IconButton icon="close" size="sm" label={`حذف ${p.name} از مقایسه`} onClick={() => onRemove(p.id)} /> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.key} data-differs={r.differs || undefined}>
                <th scope="row" className="cx-compare__label">
                  {r.differs ? <span className="cx-compare__mark" aria-hidden="true" /> : null}
                  {r.label}
                  {r.differs ? <span className="cx-sr-only"> (متفاوت)</span> : null}
                </th>
                {r.values.map((v, i) => (
                  <td key={products[i]?.id ?? i} className="cx-compare__cell"><bdi>{show(v)}</bdi></td>
                ))}
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={products.length + 1} className="cx-compare__none">همهٔ مشخصات یکسان است.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
