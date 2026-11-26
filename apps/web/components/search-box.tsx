"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { formatToman } from "@codex/ui";
import { suggest } from "@/lib/api";
import type { SuggestDto } from "@/lib/types";
import { useT } from "./locale-provider";

const OPTION_ID = "search-suggestion-";

/** جستجو با پیشنهادهای زنده از /catalog/suggest (کش ۶۰ ثانیهای سرور). */
export function SearchBox() {
  const router = useRouter();
  const { t, locale } = useT();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SuggestDto["items"]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setItems([]);
      setActive(-1);
      return;
    }
    timer.current = setTimeout(() => {
      void suggest(q.trim())
        .then((r) => { setItems(r.items); setOpen(true); setActive(-1); })
        .catch(() => setItems([]));
    }, 180);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (term) {
      setOpen(false);
      router.push(`/products?q=${encodeURIComponent(term)}`);
    }
  }

  function goTo(index: number) {
    const item = items[index];
    if (!item) return;
    setOpen(false);
    router.push(`/products/${encodeURIComponent(item.slug)}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((prev) => (prev + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      goTo(active);
    }
  }

  const expanded = open && items.length > 0;

  return (
    <form onSubmit={submit} role="search" aria-label={t("nav.searchProducts")} className="cx-search-form">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (items.length > 0) setOpen(true); }}
        onBlur={() => { setActive(-1); setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKeyDown}
        placeholder={t("search.placeholder")}
        aria-label={t("search.term")}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls="search-suggestions"
        aria-activedescendant={active >= 0 ? `${OPTION_ID}${active}` : undefined}
        className="cx-input"
        autoComplete="off"
      />
      <button type="submit" className="cx-btn cx-btn--secondary cx-btn--sm">{t("search.button")}</button>
      {expanded ? (
        <ul id="search-suggestions" className="cx-search-suggest" role="listbox" aria-label={t("search.suggestions")}>
          {items.map((it, i) => (
            <li key={it.slug} id={`${OPTION_ID}${i}`} role="option" aria-selected={i === active} className={i === active ? "is-active" : undefined}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goTo(i)}
              >
                <bdi>{it.name}</bdi>
                <span>{it.price_toman ? formatToman(it.price_toman, {}, locale) : t("cart.unknownPrice")}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
