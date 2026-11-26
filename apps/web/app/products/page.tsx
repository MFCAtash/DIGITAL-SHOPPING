import type { Metadata } from "next";
import { CatalogBrowser, type CatalogQuery } from "@/components/catalog-browser";
import { serverGet } from "@/lib/server-api";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";
import type { CategoryDto, FacetsDto, ProductListDto } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/products", "plp.title", "meta.productsDesc");
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : v);
const num = (v: string | string[] | undefined, d?: number) => {
  const s = one(v);
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n : d;
};
const bool = (v: string | string[] | undefined) => one(v) === "true" ? true : undefined;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const locale = await getLocale();
  const query: CatalogQuery = {
    q: one(sp.q),
    category: one(sp.category),
    brand: one(sp.brand),
    brands: list(sp.brands),
    categories: list(sp.categories),
    ram_gte: num(sp.ram_gte),
    storage_gte: num(sp.storage_gte),
    spec: list(sp.spec),
    min_usd: num(sp.min_usd),
    max_usd: num(sp.max_usd),
    in_stock: bool(sp.in_stock),
    on_sale: bool(sp.on_sale),
    sort: one(sp.sort) ?? "newest",
    limit: num(sp.limit, 24) ?? 24,
    offset: num(sp.offset, 0) ?? 0,
  };

  const p = new URLSearchParams();
  (Object.entries(query) as [string, string | number | boolean | undefined][]).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  p.set("lang", locale);
  const [data, categories, facets] = await Promise.all([
    serverGet<ProductListDto>(`/catalog/products?${p}`),
    serverGet<CategoryDto[]>(`/catalog/categories?lang=${locale}`, 300),
    serverGet<FacetsDto>(`/catalog/facets?${p}`),
  ]);

  return (
    <CatalogBrowser
      products={data?.items ?? []}
      count={data?.count ?? 0}
      query={query}
      categories={categories ?? []}
      brands={(facets?.brands ?? []).map((b) => b.value)}
      facets={facets ?? null}
    />
  );
}
