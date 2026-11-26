import type { MetadataRoute } from "next";
import { serverGet } from "@/lib/server-api";
import { siteUrl } from "@/lib/seo";
import type { ProductListDto } from "@/lib/types";

const BASE = siteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await serverGet<ProductListDto>("/catalog/products?limit=100", 3600);
  const products = (data?.items ?? []).map((p) => ({
    url: `${BASE}/products/${encodeURIComponent(p.slug)}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));
  // صفحات کممحتوا (/compare، /design) نباید در نقشهٔ سایت باشند تا کیفیت ایندکس حفظ شود.
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...products,
  ];
}
