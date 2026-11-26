"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Breadcrumb, Button, Checkbox, FilterPanel, FilterSheet, Pagination, SortMenu, formatToman, toFaDigits, type FilterSelection } from "@codex/ui";
import type { CategoryDto, FacetsDto, ProductDto } from "@/lib/types";
import { ProductTile } from "./product-tile";
import { ProductGridSkeleton } from "./skeletons";
import { useT } from "./locale-provider";

export interface CatalogQuery {
  q?: string;
  category?: string;
  brand?: string;
  brands?: string;
  categories?: string;
  ram_gte?: number;
  storage_gte?: number;
  spec?: string;
  min_usd?: number;
  max_usd?: number;
  in_stock?: boolean;
  on_sale?: boolean;
  sort?: string;
  limit: number;
  offset: number;
}

interface Props {
  products: ProductDto[];
  count: number;
  query: CatalogQuery;
  categories: CategoryDto[];
  brands: string[];
  facets: FacetsDto | null;
}

const SORT_KEYS = [
  { value: "newest", key: "sort.newest" },
  { value: "price_asc", key: "sort.priceAsc" },
  { value: "price_desc", key: "sort.priceDesc" },
  { value: "rating", key: "sort.rating" },
  { value: "discount", key: "sort.discount" },
  { value: "popular", key: "sort.popular" },
];

const split = (s?: string) => (s ? s.split(",").filter(Boolean) : []);

function initialSelection(q: CatalogQuery): FilterSelection {
  return {
    category: split(q.categories ?? (q.category ? q.category : undefined)),
    brand: split(q.brands ?? (q.brand ? q.brand : undefined)),
    ram: q.ram_gte ? [String(q.ram_gte)] : [],
    storage: q.storage_gte ? [String(q.storage_gte)] : [],
  };
}

/** PLP فاستدار: فیلترهای چندانتخابی، شمارش پایدار از /catalog/facets و ساخت URL قابل اشتراک. */
export function CatalogBrowser({ products, count, query, categories, brands, facets }: Props) {
  const router = useRouter();
  const { t, locale } = useT();
  const SORTS = SORT_KEYS.map((s) => ({ value: s.value, label: t(s.key) }));
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<FilterSelection>(() => initialSelection(query));

  useEffect(() => setSelected(initialSelection(query)), [query.brands, query.categories, query.brand, query.category, query.ram_gte, query.storage_gte]);

  const groups = useMemo(
    () => [
      {
        id: "category",
        label: t("plp.category"),
        options: (facets?.categories?.length ? facets.categories : categories.map((c) => ({ value: c.slug, label: c.name, count: 0 }))).map((c) => ({ value: c.value, label: c.label, count: c.count })),
      },
      {
        id: "brand",
        label: t("plp.brand"),
        options: (facets?.brands?.length ? facets.brands : brands.map((b) => ({ value: b, label: b, count: 0 }))).map((b) => ({ value: b.value, label: b.label, count: b.count })),
      },
      {
        id: "ram",
        label: t("plp.ram"),
        options: (facets?.ram?.length ? facets.ram : [4, 6, 8, 12, 16, 32].map((n) => ({ value: String(n), label: `${toFaDigits(n, locale)} ${t("plp.gig")}`, count: 0 }))).map((r) => ({ value: r.value, label: `${toFaDigits(Number(r.value), locale)} ${t("plp.gig")}`, count: r.count })),
      },
      {
        id: "storage",
        label: t("plp.storage"),
        options: (facets?.storage?.length ? facets.storage : [128, 256, 512, 1000].map((n) => ({ value: String(n), label: `${toFaDigits(n, locale)} ${t("plp.gig")}`, count: 0 }))).map((s) => ({ value: s.value, label: `${toFaDigits(Number(s.value), locale)} ${t("plp.gig")}`, count: s.count })),
      },
    ],
    [facets, categories, brands, t, locale],
  );

  function href(next: Partial<CatalogQuery>, sel: FilterSelection = selected): string {
    const v: CatalogQuery = { ...query, ...next, limit: next.limit ?? query.limit, offset: next.offset ?? 0 };
    const p = new URLSearchParams();
    if (v.q) p.set("q", v.q);
    if (sel.category?.length) p.set("categories", sel.category.join(","));
    if (sel.brand?.length) p.set("brands", sel.brand.join(","));
    if (sel.ram?.[0]) p.set("ram_gte", sel.ram[0]);
    if (sel.storage?.[0]) p.set("storage_gte", sel.storage[0]);
    if (v.spec) p.set("spec", v.spec);
    if (v.min_usd !== undefined) p.set("min_usd", String(v.min_usd));
    if (v.max_usd !== undefined) p.set("max_usd", String(v.max_usd));
    if (v.in_stock) p.set("in_stock", "true");
    if (v.on_sale) p.set("on_sale", "true");
    if (v.sort) p.set("sort", v.sort);
    if (v.limit !== 24) p.set("limit", String(v.limit));
    if (v.offset) p.set("offset", String(v.offset));
    return p.toString() ? `/products?${p}` : "/products";
  }

  function go(next: Partial<CatalogQuery>, sel: FilterSelection = selected) {
    startTransition(() => router.replace(href(next, sel), { scroll: false }));
  }

  function clear() {
    const cleared: FilterSelection = { category: [], brand: [], ram: [], storage: [] };
    setSelected(cleared);
    go({ q: undefined, min_usd: undefined, max_usd: undefined, in_stock: undefined, on_sale: undefined, spec: undefined, offset: 0 }, cleared);
  }

  const activeChips = [
    ...(query.q ? [{ key: "q", label: `${t("plp.searchChip")}${query.q}`, clear: () => go({ q: undefined }) }] : []),
    ...Object.entries(selected).flatMap(([gid, values]) =>
      values.map((val) => ({
        key: `${gid}-${val}`,
        label: groups.find((g) => g.id === gid)?.options.find((o) => o.value === val)?.label ?? val,
        clear: () => {
          const next = { ...selected, [gid]: (selected[gid] ?? []).filter((x) => x !== val) };
          setSelected(next);
          go({ offset: 0 }, next);
        },
      })),
    ),
    ...(query.min_usd !== undefined || query.max_usd !== undefined ? [{ key: "price", label: `${t("plp.priceChip")}${toFaDigits(query.min_usd ?? 0, locale)}–${query.max_usd === undefined ? "∞" : toFaDigits(query.max_usd, locale)} ${t("plp.usd")}`, clear: () => go({ min_usd: undefined, max_usd: undefined }) }] : []),
    ...(query.in_stock ? [{ key: "stock", label: t("plp.inStockChip"), clear: () => go({ in_stock: undefined }) }] : []),
    ...(query.on_sale ? [{ key: "sale", label: t("plp.onSaleChip"), clear: () => go({ on_sale: undefined }) }] : []),
  ];

  const crumbs = [
    { label: t("common.home"), href: "/" },
    { label: t("nav.products"), href: query.category || selected.category.length ? "/products" : undefined },
    ...(query.category ? [{ label: categories.find((c) => c.slug === query.category)?.name ?? query.category }] : []),
    ...(query.q ? [{ label: `${t("plp.searchFor")} «${query.q}»` }] : []),
  ];

  const totalPages = Math.max(1, Math.ceil(count / query.limit));
  const currentPage = Math.floor(query.offset / query.limit) + 1;

  const priceBuckets = facets?.price?.buckets ?? [];
  const panel = (
    <FilterPanel
      groups={groups}
      selected={selected}
      onChange={(next) => { setSelected(next); go({ offset: 0 }, next); }}
      onClear={clear}
      extra={
        <div className="facet-price" aria-label={t("plp.priceRange")}>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="filters__legend">{t("plp.priceRange")}</legend>
            {priceBuckets.map((b) => {
              const active = query.min_usd === b.min_usd && query.max_usd === b.max_usd;
              return (
                <button
                  key={`${b.min_usd}-${b.max_usd}`}
                  type="button"
                  className="facet-price__row"
                  data-active={active}
                  aria-pressed={active}
                  onClick={() => go({ min_usd: active ? undefined : (b.min_usd ?? undefined), max_usd: active ? undefined : (b.max_usd ?? undefined) })}
                  style={{ background: "none", border: 0, borderBlockEnd: "1px solid var(--cx-line)", cursor: "pointer", textAlign: "start", inlineSize: "100%" }}
                >
                  <span>{b.label} {t("plp.usd")}</span>
                  <span className="cx-num">{toFaDigits(b.count, locale)}</span>
                </button>
              );
            })}
          </fieldset>
          <div style={{ display: "grid", gap: "var(--cx-space-1)", marginBlockStart: "var(--cx-space-3)" }}>
            <Checkbox label={`${t("plp.inStock")} (${toFaDigits(facets?.in_stock ?? 0, locale)})`} checked={Boolean(query.in_stock)} onChange={(e) => go({ in_stock: e.target.checked || undefined })} />
            <Checkbox label={`${t("plp.onSale")} (${toFaDigits(facets?.on_sale ?? 0, locale)})`} checked={Boolean(query.on_sale)} onChange={(e) => go({ on_sale: e.target.checked || undefined })} />
          </div>
          {facets?.price?.toman_per_usd ? <p style={{ color: "var(--cx-muted)", fontSize: "var(--cx-text-xs)" }}>{t("plp.rate")}{formatToman(facets.price.toman_per_usd, {}, locale)} / {t("plp.usd")}</p> : null}
        </div>
      }
    />
  );

  return (
    <>
      <Breadcrumb items={crumbs} label={t("common.breadcrumb")} />
      <div className="section__head" style={{ marginBlockStart: "var(--cx-space-4)" }}>
        <h1 className="section__title">{query.q ? t("plp.search") : t("plp.title")}</h1>
        <SortMenu label={t("plp.sort")} value={query.sort ?? "newest"} options={SORTS} onChange={(sort) => go({ sort })} />
      </div>

      <div className="plp-toolbar">
        <span className="plp-toolbar__count">{toFaDigits(count, locale)} {t("plp.found")}</span>
        <div className="filter-mobile-bar"><Button variant="secondary" onClick={() => setSheetOpen(true)}>{t("plp.filters")}</Button></div>
      </div>

      {activeChips.length ? (
        <div className="chip-row">
          {activeChips.map((c) => <button key={c.key} type="button" className="chip chip--active" onClick={c.clear}>{c.label} ×</button>)}
        </div>
      ) : null}

      <div className="plp-layout">
        <aside className="plp-rail" aria-label={t("plp.filters")}>{panel}</aside>
        <div>
          {pending ? <ProductGridSkeleton count={6} /> : products.length ? (
            <div className="product-grid">{products.map((p, i) => <ProductTile key={p.slug} product={p} priority={i < 4} />)}</div>
          ) : (
            <div className="panel" style={{ textAlign: "center" }}>
              <h2>{t("plp.empty")}</h2>
              <p>{t("common.error")}</p>
              <Button variant="secondary" onClick={clear}>{t("plp.clear")}</Button>
            </div>
          )}
          <Pagination current={currentPage} total={totalPages} hrefFor={(page) => href({ offset: (page - 1) * query.limit })} locale={locale} />
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        resultCount={count}
        groups={groups}
        selected={selected}
        onChange={(next) => { setSelected(next); go({ offset: 0 }, next); }}
      />
    </>
  );
}
