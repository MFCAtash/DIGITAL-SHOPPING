import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Breadcrumb, PriceHistoryChart, PriceTag, SpecTable, Tabs, toFaDigits, type PricePoint } from "@codex/ui";
import { Gallery } from "@/components/gallery";
import { BuyBox } from "@/components/buy-box";
import { StickyBuy } from "@/components/sticky-buy";
import { WishlistButton } from "@/components/wishlist-button";
import { ReviewForm } from "@/components/review-form";
import { ProductTile } from "@/components/product-tile";
import { serverGet } from "@/lib/server-api";
import { imageUrl } from "@/lib/media";
import { getLocale } from "@/lib/locale";
import { t, type Locale } from "@/lib/i18n";
import { seoBase, siteUrl } from "@/lib/seo";
import type { ProductDto, ReviewListDto, VariantDto } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

function specLabel(key: string, locale: Locale): string {
  const k = `spec.${key}`;
  return t(k, locale) === k ? key : t(k, locale);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await serverGet<ProductDto>(`/catalog/products/${encodeURIComponent(slug)}`);
  if (!p) return { ...seoBase(locale), title: t("meta.productMissing", locale) };
  const img = p.images[0] ? imageUrl(p.images[0].file) : undefined;
  const url = `${siteUrl()}/products/${encodeURIComponent(slug)}`;
  return {
    ...seoBase(locale),
    title: p.name,
    description: p.description?.slice(0, 155) || `${t("meta.specPricePrefix", locale)}${p.name}`,
    alternates: { canonical: url, languages: { "fa-IR": url, "en-US": url, "x-default": url } },
    openGraph: { locale: locale === "fa" ? "fa_IR" : "en_US", title: p.name, description: p.description?.slice(0, 155), images: img ? [img] : [] },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  const enc = encodeURIComponent(slug);
  const [product, variantData, reviewData, historyData, relatedData] = await Promise.all([
    serverGet<ProductDto>(`/catalog/products/${enc}?lang=${locale}`),
    serverGet<{ items: VariantDto[] }>(`/catalog/products/${enc}/variants`, 60),
    serverGet<ReviewListDto>(`/catalog/products/${enc}/reviews`, 60),
    serverGet<{ items: PricePoint[] }>(`/catalog/products/${enc}/price-history`, 60),
    serverGet<{ items: ProductDto[] }>(`/catalog/products/${enc}/related?limit=4`, 60),
  ]);
  if (!product) notFound();

  const withVariants: ProductDto = { ...product, variants: variantData?.items ?? [] };
  const reviews = reviewData?.items ?? [];
  const oldToman = product.discount_percent > 0 && product.price_toman != null
    ? Math.round(product.price_toman / (1 - product.discount_percent / 100))
    : null;
  const related = relatedData?.items ?? [];

  // دادههای ساختارمدهشده برای موتورهای جستجو (فقط مقادیر سرور، بدون متن کاربر خام در تگها).
  const finalToman = Number(product.price_toman ?? 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((i) => imageUrl(i.file)).filter(Boolean),
    sku: product.slug,
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      // قیمت صفر یعنی «نامشخص»؛ نباید بهعنوان پیشنهاد رایگان در نتایج جستجو ظاهر شود.
      ...(Number.isFinite(finalToman) && finalToman > 0 ? { price: String(finalToman) } : {}),
      availability: product.purchasable && finalToman > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(reviewData?.total ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: reviewData.average, reviewCount: reviewData.total, bestRating: 5 },
    } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumb
        label={tr("common.breadcrumb")}
        items={[
          { label: tr("common.home"), href: "/" },
          { label: tr("nav.products"), href: "/products" },
          { label: product.brand, href: `/products?brands=${encodeURIComponent(product.brand)}` },
          { label: product.name },
        ]}
      />

      <section className="section pdp">
        <Gallery images={product.images} name={product.name} />
        <div className="pdp__info">
          <header className="pdp__head">
            <div>
              <p className="pdp__brand">{product.brand}</p>
              <h1 className="pdp__title">{product.name}</h1>
            </div>
            <WishlistButton slug={product.slug} />
          </header>

          <section className="pdp__price-panel" aria-label={tr("pdp.priceLabel")}>
            <span className="pdp__price-label">{tr("pdp.priceLabel")}</span>
            {product.discount_percent > 0 ? <Badge tone="signal">BLACK FRIDAY · {toFaDigits(product.discount_percent, locale)}{tr("common.percent")} {tr("home.navDeals")}</Badge> : null}
            <PriceTag finalToman={product.price_toman} oldToman={oldToman} finalUsdCents={product.final_usd_cents}
              discountPercent={product.discount_percent} size="lg" locale={locale} />
          </section>

          <p className="pdp__desc">{product.description}</p>

          {Object.keys(product.specs ?? {}).length ? (
            <section className="pdp__highlights" aria-label={tr("pdp.highlights")}>
              <h2>{tr("pdp.highlights")}</h2>
              <div className="pdp__spec-chips">
                {Object.entries(product.specs ?? {}).slice(0, 6).map(([k, v]) => (
                  <span key={k} className="pdp__spec-chip"><small>{specLabel(k, locale)}</small><b><bdi>{v}</bdi></b></span>
                ))}
              </div>
            </section>
          ) : null}

          <BuyBox product={withVariants} />

          <ul className="pdp__guarantees">
            <li>{tr("pdp.guarantee")}</li><li>{tr("pdp.return7")}</li><li>{tr("pdp.fastShip")}</li>
          </ul>
        </div>
      </section>

      <section className="section pdp__tabs" aria-label={tr("pdp.moreInfo")}>
        <Tabs
          label={tr("pdp.productInfo")}
          items={[
            {
              value: "specs",
              label: tr("pdp.specs"),
              content: (
                <div className="pdp__panel">
                  <SpecTable caption={tr("pdp.specs")} groups={[{
                    title: tr("pdp.generalSpecs"),
                    rows: Object.entries(product.specs ?? {}).map(([key, value]) => ({ label: specLabel(key, locale), value })),
                  }]} />
                </div>
              ),
            },
            {
              value: "history",
              label: tr("pdp.history"),
              content: historyData?.items.length ? (
                <div className="pdp__panel"><PriceHistoryChart data={historyData.items} width={640} height={160} locale={locale} /></div>
              ) : <p className="pdp__panel">{tr("pdp.noHistoryItem")}</p>,
            },
            {
              value: "reviews",
              label: `${tr("pdp.reviews")} (${reviewData?.total ?? 0})`,
              content: (
                <div className="pdp__panel">
                  <div className="section__head">
                    <span className="cx-num">{reviewData?.average ? reviewData.average.toFixed(1) : "—"} / 5</span>
                    {reviewData?.total ? <Badge tone="positive">{toFaDigits(reviewData.total, locale)} {tr("pdp.approvedReviews")}</Badge> : null}
                  </div>
                  {reviewData?.total ? (
                    <ul className="rating-dist" aria-label={tr("pdp.ratingDistribution")}>
                      {[5, 4, 3, 2, 1].map((n) => {
                        const count = reviewData.distribution?.[String(n)] ?? 0;
                        const pct = Math.round((count / reviewData.total) * 100);
                        return <li key={n}><span className="cx-num">{n}★</span><meter value={pct} min={0} max={100} /><span className="cx-num">{toFaDigits(count, locale)}</span></li>;
                      })}
                    </ul>
                  ) : null}
                  {reviews.length ? (
                    <ul className="line-list">
                      {reviews.map((r) => (
                        <li key={r.id} className="panel" style={{ margin: 0 }}>
                          <strong className="cx-num">{r.rating}/5</strong> — {r.title || tr("pdp.reviewFallback")}
                          {r.verified ? <Badge tone="positive">{tr("pdp.verified")}</Badge> : null}
                          <p style={{ marginBlockEnd: 0 }}>{r.body}</p>
                          <small>{r.author || tr("pdp.buyer")}</small>
                        </li>
                      ))}
                    </ul>
                  ) : <p style={{ color: "var(--cx-muted)" }}>{tr("pdp.noVerifiedReviews")}</p>}
                  <div style={{ marginBlockStart: "var(--cx-space-5)", maxInlineSize: 560 }}>
                    <h3 style={{ fontSize: "var(--cx-text-md)" }}>{tr("pdp.reviewForm")}</h3>
                    <ReviewForm slug={product.slug} />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </section>

      {related.length ? (
        <section className="section pdp__related" aria-labelledby="related">
          <div className="section__head">
            <h2 id="related" className="section__title">{tr("pdp.related")}</h2>
            <Link href={`/products?categories=${encodeURIComponent(product.category)}`} className="section__link">{tr("pdp.allCategory")}</Link>
          </div>
          <div className="product-grid">{related.map((p) => <ProductTile key={p.slug} product={p} />)}</div>
        </section>
      ) : null}

      <StickyBuy slug={product.slug} priceToman={product.price_toman} />
    </>
  );
}
