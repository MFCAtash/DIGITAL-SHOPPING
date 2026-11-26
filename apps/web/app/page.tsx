import type { Metadata } from "next";
import Link from "next/link";
import { Accordion, Badge, Icon, PriceHistoryChart, toFaDigits } from "@codex/ui";
import { ProductTile } from "@/components/product-tile";
import { HomeCover } from "@/components/home-cover";
import { serverGet } from "@/lib/server-api";
import { experimentVariant, EXPERIMENTS } from "@/lib/experiments";
import { getLocale } from "@/lib/locale";
import { t, type Locale } from "@/lib/i18n";
import { seoBase, siteUrl } from "@/lib/seo";
import type { CategoryDto, PricePointDto, ProductListDto } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const url = siteUrl();
  return {
    ...seoBase(locale),
    alternates: { canonical: url, languages: { "fa-IR": url, "en-US": url, "x-default": url } },
  };
}

const TRUST = [
  { icon: "shield" as const, title: "trust.authenticity", text: "trust.authenticityD" },
  { icon: "truck" as const, title: "trust.shipping", text: "trust.shippingD" },
  { icon: "clock" as const, title: "trust.fresh", text: "trust.freshD" },
  { icon: "compare" as const, title: "trust.compare", text: "trust.compareD" },
];

function SectionHead({ eyebrow, title, desc, href, linkLabel, locale = "fa" }: { eyebrow: string; title: string; desc?: string; href?: string; linkLabel?: string; locale?: Locale }) {
  return (
    <div className="home-section__head">
      <div>
        <p className="home-section__eyebrow">{eyebrow}</p>
        <h2 className="home-section__title">{title}</h2>
        {desc ? <p className="home-section__desc">{desc}</p> : null}
      </div>
      {href ? <Link href={href} className="section__link">{linkLabel ?? t("home.all", locale)}</Link> : null}
    </div>
  );
}

function Grid({ items, empty }: { items: ProductListDto["items"]; empty: string }) {
  if (items.length === 0) return <p className="cx-state__description">{empty}</p>;
  return (
    <div className="product-grid">
      {items.map((p, i) => <ProductTile key={p.slug} product={p} priority={i < 4} />)}
    </div>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  const [newest, deals, popular, categories, all, heroVariant] = await Promise.all([
    serverGet<ProductListDto>(`/catalog/products?limit=8&sort=newest&lang=${locale}`, 60),
    serverGet<ProductListDto>(`/catalog/products?limit=4&sort=discount&on_sale=true&lang=${locale}`, 60),
    serverGet<ProductListDto>(`/catalog/products?limit=4&sort=popular&lang=${locale}`, 60),
    serverGet<CategoryDto[]>(`/catalog/categories?lang=${locale}`, 300),
    serverGet<ProductListDto>(`/catalog/products?limit=100&lang=${locale}`, 60),
    experimentVariant(EXPERIMENTS.hero),
  ]);
  const pool = all?.items ?? [];
  const wanted = [
    "apple-iphone-18-pro-max", "samsung-galaxy-s26-ultra", "asus-rog-strix-g16",
    "sony-playstation-5-pro", "xiaomi-18-pro-max", "lenovo-legion-7i",
    "apple-iphone-air", "xiaomi-poco-x8-pro",
  ];
  const picked = wanted.map((s) => pool.find((p) => p.slug.includes(s))).filter((p): p is (typeof pool)[number] => Boolean(p));
  const coverProducts = [...picked, ...pool.filter((p) => !picked.some((x) => x.slug === p.slug))].slice(0, 8);
  const fresh = newest?.items ?? [];
  const first = fresh[0];
  const history = first ? await serverGet<{ items: PricePointDto[] }>(`/catalog/products/${encodeURIComponent(first.slug)}/price-history`, 60) : null;

  return (
    <>
      <h1 className="cx-sr-only">{tr("hero.titleA")} — {tr("hero.titleB")}</h1>
      {/* ۱٫ کاور سهبعدی + مسیرهای ارتباطی (بدون متن بالای صفحه) */}
      <section className="hero hero--cover home-section--flush" aria-label="Featured collection">
        <HomeCover products={coverProducts} viewLabel={heroVariant === "A" ? tr("home.coverView") : tr("home.navProducts")} />
      </section>
      <nav className="cover-nav" aria-label={tr("nav.products")}>
        <Link href="/products">{tr("home.navProducts")}</Link>
        <Link href="/products?sort=discount">{tr("home.navDeals")}</Link>
        <Link href="/products?sort=newest">{tr("home.new")}</Link>
        <Link href="/compare">{tr("home.navCompare")}</Link>
        <Link href="/account">{tr("home.navAccount")}</Link>
        <Link href="/design">{tr("home.navDesign")}</Link>
      </nav>

      {/* ۲٫ نوار اعتماد */}
      <section className="home-section" aria-label={tr("home.benefits")}>
        <div className="home-grid">
          {TRUST.map((x) => (
            <div className="home-stat" key={x.title}>
              <Icon name={x.icon} size={22} aria-hidden="true" />
              <strong style={{ fontSize: "var(--cx-text-base)" }}>{tr(x.title)}</strong>
              <span>{tr(x.text)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ۳٫ دستهبندیها */}
      <section className="home-section" aria-labelledby="home-categories">
        <SectionHead eyebrow={tr("nav.categories")} title={tr("home.categories")} href="/products" linkLabel={tr("home.allCategories")} />
        <div id="home-categories" className="home-grid">
          {(categories ?? []).map((c) => (
            <Link key={c.slug} href={`/products?category=${encodeURIComponent(c.slug)}`} className="home-cat">
              <strong>{c.name}</strong>
              <span className="home-cat__count">{tr("hero.cta")} ←</span>
            </Link>
          ))}
          {(categories ?? []).length === 0 ? <p className="cx-state__description">{tr("plp.noCategories")}</p> : null}
        </div>
      </section>

      {/* ۴٫ تازهترینها */}
      <section className="home-section" aria-labelledby="new-arrivals">
        <SectionHead eyebrow={tr("sort.newest")} title={tr("home.new")} desc={tr("home.new.desc")} href="/products?sort=newest" linkLabel={tr("home.all")} />
        <div id="new-arrivals"><Grid empty={tr("plp.empty")} items={fresh} /></div>
      </section>

      {/* ۵٫ پیشنهادهای ویژه */}
      <section className="home-section" aria-labelledby="home-deals">
        <SectionHead eyebrow={tr("sort.discount")} title={tr("home.deals")} desc={tr("home.deals.desc")} href="/products?sort=discount" linkLabel={tr("home.all")} />
        <div id="home-deals"><Grid empty={tr("plp.empty")} items={deals?.items ?? []} /></div>
      </section>

      {/* ۶٫ پرفروشها */}
      <section className="home-section" aria-labelledby="home-popular">
        <SectionHead eyebrow={tr("sort.popular")} title={tr("home.popular")} href="/products?sort=popular" linkLabel={tr("home.all")} />
        <div id="home-popular"><Grid empty={tr("plp.empty")} items={popular?.items ?? []} /></div>
      </section>

      {/* ۷٫ محتوای تحریریه */}
      <section className="home-section" aria-labelledby="home-editorial">
        <SectionHead eyebrow={tr("home.editorial")} title={tr("home.editorialTitle")} />
        <div id="home-editorial" className="home-quote">
          <blockquote>«{tr("home.quote")}»</blockquote>
          <p><Link href="/design" className="section__link">{tr("home.designLink")}</Link></p>
        </div>
      </section>

      {/* ۸٫ سه گام خرید */}
      <section className="home-section" aria-labelledby="home-steps">
        <SectionHead eyebrow={tr("home.steps")} title={tr("home.stepsTitle")} />
        <div id="home-steps" className="home-steps">
          <div className="home-step"><h3>{tr("home.step1")}</h3><p>{tr("home.step1d")}</p></div>
          <div className="home-step"><h3>{tr("home.step2")}</h3><p>{tr("home.step2d")}</p></div>
          <div className="home-step"><h3>{tr("home.step3")}</h3><p>{tr("home.step3d")}</p></div>
        </div>
      </section>

      {/* ۹٫ اعداد */}
      <section className="home-section" aria-labelledby="home-stats">
        <SectionHead eyebrow={tr("home.stats")} title={tr("home.trustTitle")} />
        <div id="home-stats" className="home-stats">
          <div className="home-stat"><strong>{toFaDigits(4, locale)}</strong><span>{tr("home.stat1")}</span></div>
          <div className="home-stat"><strong>{toFaDigits(60, locale)}</strong><span>{tr("home.stat2")}</span></div>
          <div className="home-stat"><strong>{toFaDigits(7, locale)}</strong><span>{tr("home.stat3")}</span></div>
          <div className="home-stat"><strong>{toFaDigits(2, locale)}</strong><span>{tr("home.stat4")}</span></div>
        </div>
      </section>

      {/* ۱۰٫ شفافیت قیمت */}
      <section className="home-section" aria-labelledby="home-price">
        <SectionHead eyebrow={tr("home.price")} title={tr("home.priceTrack")} desc={first ? `${tr("home.price")}: ${first.name}` : ""} />
        <div id="home-price" className="cx-card" style={{ padding: "var(--cx-space-5)" }}>
          {history?.items?.length ? (
            <PriceHistoryChart data={history.items} title={`${tr("home.price")} — ${first?.name ?? ""}`} locale={locale} />
          ) : (
            <p className="cx-state__description">{tr("pdp.noHistory")}</p>
          )}
          <p style={{ color: "var(--cx-muted)" }}>{tr("home.priceNote")}</p>
        </div>
      </section>

      {/* ۱۱٫ نقل قول مشتری */}
      <section className="home-section" aria-labelledby="home-voice">
        <SectionHead eyebrow={tr("home.voice")} title={tr("home.voiceTitle")} />
        <div id="home-voice" className="home-quote">
          <blockquote>«{tr("home.voiceQuote")}»</blockquote>
          <Badge tone="positive">{tr("pdp.verified")}</Badge>
        </div>
      </section>

      {/* ۱۲٫ پرسشهای رایج + دعوت به خرید */}
      <section className="home-section" aria-labelledby="home-faq">
        <SectionHead eyebrow={tr("home.faq")} title={tr("home.faqTitle")} />
        <div id="home-faq" className="home-faq">
          <Accordion
            items={[
              { value: "a", title: tr("home.faq1q"), content: tr("home.faq1a") },
              { value: "b", title: tr("home.faq2q"), content: tr("home.faq2a") },
              { value: "c", title: tr("home.faq3q"), content: tr("home.faq3a") },
              { value: "d", title: tr("home.faq4q"), content: tr("home.faq4a") },
            ]}
          />
          <p style={{ marginBlockStart: "var(--cx-space-5)" }}>
            <Link href="/products" className="cx-btn cx-btn--primary cx-btn--lg">{tr("home.startCompare")}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
