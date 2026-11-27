"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@digital-shopping/ui";
import { useT } from "./locale-provider";
import type { CategoryDto } from "@/lib/types";

const QUICK = [
  { href: "/products", key: "footer.allProducts", icon: "search" as const },
  { href: "/products?sort=discount", key: "home.navDeals", icon: "info" as const },
  { href: "/compare", key: "nav.compare", icon: "compare" as const },
];

/** منوی کشویی دستهبندیها: دسترسپذیر (Escape/خارج از منو)، RTL و بدون وابستگی به کتابخانهٔ خارجی. */
export function CategoryMenu({ categories }: { categories: CategoryDto[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="mega-menu" ref={root}>
      <button
        type="button"
        className="mega-menu__trigger"
        aria-expanded={open}
        aria-controls="catalog-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="menu" size={16} aria-hidden="true" />
        {t("nav.categories")}
        <Icon name="chevron-down" size={14} aria-hidden="true" mirror />
      </button>

      {open ? (
        <div className="mega-menu__panel" id="catalog-menu" role="region" aria-label={t("nav.categoriesMenu")}>
          <div className="mega-menu__head">
            <strong>{t("nav.categoriesPanel")}</strong>
            <button type="button" className="cx-btn cx-btn--ghost cx-btn--sm" onClick={() => setOpen(false)} aria-label={t("nav.closeMenu")}>
              <Icon name="close" size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="mega-menu__body">
            <div>
              <div className="mega-menu__grid">
                {categories.map((c) => (
                  <Link key={c.slug} href={`/products?category=${encodeURIComponent(c.slug)}`} className="mega-menu__item" onClick={() => setOpen(false)}>
                    <Icon name="chevron-end" size={14} aria-hidden="true" mirror />
                    <bdi>{c.name}</bdi>
                  </Link>
                ))}
                {categories.length === 0 ? <span className="mega-menu__empty">{t("plp.noCategories")}</span> : null}
              </div>
              <div className="mega-menu__quick">
                {QUICK.map((q) => (
                  <Link key={q.href} href={q.href} className="cx-btn cx-btn--secondary cx-btn--sm" onClick={() => setOpen(false)}>
                    <Icon name={q.icon} size={14} aria-hidden="true" />
                    {t(q.key)}
                  </Link>
                ))}
              </div>
            </div>
            <aside className="mega-menu__feature">
              <small>{t("home.coverView")}</small>
              <strong>{t("home.new")} &amp; {t("home.navDeals")}</strong>
              <p>{t("home.new.desc")}</p>
              <Link href="/products?sort=discount" onClick={() => setOpen(false)}>{t("home.navDeals")} ←</Link>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  );
}
