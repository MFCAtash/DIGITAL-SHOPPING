"use client";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { nextIndex } from "../lib/keys";
import { Icon } from "../icons/Icon";
import { dirOf } from "./dir";

/* ---------- Tabs ---------- */

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

export interface TabsProps {
  items: readonly TabItem[];
  label: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** تب‌ها (الگوی APG): roving tabindex، فعال‌سازی با فوکوس، فلش‌ها در RTL برعکس. */
export function Tabs({ items, label, defaultValue, value, onValueChange, className }: TabsProps) {
  const base = useId();
  const [inner, setInner] = useState(defaultValue ?? items[0]?.value ?? "");
  const current = value ?? inner;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const idx = Math.max(0, items.findIndex((i) => i.value === current));
  const select = (v: string) => {
    setInner(v);
    onValueChange?.(v);
  };

  return (
    <div className={cx("cx-tabs", className)}>
      <div role="tablist" aria-label={label} className="cx-tabs__list">
        {items.map((it, i) => (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-t-${it.value}`}
            aria-selected={i === idx}
            aria-controls={`${base}-p-${it.value}`}
            tabIndex={i === idx ? 0 : -1}
            className="cx-tabs__tab"
            onClick={() => select(it.value)}
            onKeyDown={(e) => {
              const n = nextIndex({ key: e.key, index: i, count: items.length, dir: dirOf(e.currentTarget) });
              if (n === null) return;
              e.preventDefault();
              refs.current[n]?.focus();
              const target = items[n];
              if (target) select(target.value);
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
      {items.map((it, i) => (
        <div key={it.value} role="tabpanel" id={`${base}-p-${it.value}`} aria-labelledby={`${base}-t-${it.value}`} hidden={i !== idx} tabIndex={0} className="cx-tabs__panel">
          {i === idx ? it.content : null}
        </div>
      ))}
    </div>
  );
}

/* ---------- Accordion ---------- */

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: readonly AccordionItem[];
  /** single: هم‌زمان یکی باز؛ multiple: چندتا */
  type?: "single" | "multiple";
  defaultOpen?: readonly string[];
  /** سطح عنوان‌ها (h2..h4) برای ساختار صفحه */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

export function Accordion({ items, type = "multiple", defaultOpen = [], headingLevel = 3, className }: AccordionProps) {
  const base = useId();
  const [open, setOpen] = useState<readonly string[]>(defaultOpen);
  const toggle = (v: string) =>
    setOpen((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : type === "single" ? [v] : [...cur, v]));
  const H = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div className={cx("cx-acc", className)}>
      {items.map((it) => {
        const isOpen = open.includes(it.value);
        return (
          <div key={it.value} className="cx-acc__item">
            <H className="cx-acc__head">
              <button type="button" id={`${base}-h-${it.value}`} aria-expanded={isOpen} aria-controls={`${base}-r-${it.value}`} className="cx-acc__trigger" onClick={() => toggle(it.value)}>
                <span>{it.title}</span>
                <Icon name="chevron-down" size={18} className="cx-acc__icon" />
              </button>
            </H>
            <div role="region" id={`${base}-r-${it.value}`} aria-labelledby={`${base}-h-${it.value}`} hidden={!isOpen} className="cx-acc__panel">
              {it.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
