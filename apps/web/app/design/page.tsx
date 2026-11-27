import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Breadcrumb, Button, ButtonLink, Checkbox, EmptyState, Icon, IconButton, PriceTag, Skeleton, Stepper, TextField } from "@digital-shopping/ui";
import { BrandMark } from "@digital-shopping/ui";
import { DesignInteractive } from "@/components/design-interactive";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/design", "meta.design", "meta.designDesc");
}

const COLORS = ["bg", "surface", "sunken", "media", "text", "muted", "line", "line-strong", "signal", "signal-ink", "brand", "brand-ink", "positive", "warning", "danger", "gold", "focus"] as const;
const SIZES = ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;

/** صفحهٔ زندهٔ زبان طراحی: همان توکنها و کامپوننتهایی که فروشگاه استفاده میکند. */
export default async function DesignPage() {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  return (
    <>
      <Breadcrumb label={tr("common.breadcrumb")} items={[{ label: tr("common.home"), href: "/" }, { label: tr("design.breadcrumb") }]} />
      <header className="section__head" style={{ marginBlockStart: "var(--cx-space-4)" }}>
        <div>
          <p className="home-section__eyebrow">{tr("design.breadcrumb")}</p>
          <h1 className="section__title">Digital Shopping — Design Language</h1>
          <p className="home-section__desc">{tr("design.desc")}</p>
        </div>
        <Link href="/" className="section__link">{tr("design.back")}</Link>
      </header>

      <div className="design-grid">
        <section className="section" aria-labelledby="d-colors">
          <h2 id="d-colors" className="section__title">{tr("design.colors")}</h2>
          <div className="design-row">
            {COLORS.map((c) => (
              <div key={c} className="design-swatch" style={{ background: `var(--cx-${c})`, color: "var(--cx-text)" }} title={`--cx-${c}`}>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="d-type">
          <h2 id="d-type" className="section__title">{tr("design.typography")}</h2>
          <div className="design-type">
            {SIZES.map((s) => <p key={s} style={{ fontSize: `var(--cx-text-${s})`, lineHeight: `var(--cx-lh-${s})`, margin: 0 }}>{tr("design.typeSize")}{s} — {tr("design.typeExample")}</p>)}
          </div>
          <p style={{ color: "var(--cx-muted)" }}>{tr("design.fonts")}</p>
        </section>

        <section className="section" aria-labelledby="d-buttons">
          <h2 id="d-buttons" className="section__title">{tr("design.buttons")}</h2>
          <div className="design-row">
            <Button>{tr("design.primary")}</Button><Button variant="secondary">{tr("design.secondary")}</Button><Button variant="ghost">{tr("design.ghost")}</Button><Button variant="danger">{tr("design.danger")}</Button>
            <ButtonLink href="/products">{tr("design.buttonLink")}</ButtonLink>
            <IconButton label={t("nav.search", locale)} icon="search" />
            <Badge tone="positive">{tr("design.inStock")}</Badge><Badge tone="warning">{tr("design.approximate")}</Badge><Badge tone="danger">{tr("design.outOfStock")}</Badge>
          </div>
        </section>

        <section className="section" aria-labelledby="d-forms">
          <h2 id="d-forms" className="section__title">{tr("design.forms")}</h2>
          <div className="design-row">
            <TextField label={tr("design.name")} hint={tr("design.nameHint")} placeholder={tr("design.buyerName")} />
            <TextField label={t("checkout.coupon", locale)} error={tr("design.invalidCode")} defaultValue="BAD" />
            <Checkbox id="d-check" label={tr("design.inStockOnly")} defaultChecked />
            <DesignInteractive />
          </div>
        </section>

        <section className="section" aria-labelledby="d-feedback">
          <h2 id="d-feedback" className="section__title">{tr("design.feedback")}</h2>
          <div className="design-row">
            <Alert tone="info" title={tr("design.infoTitle")}>{tr("design.infoBody")}</Alert>
            <Alert tone="warning" title={tr("design.warningTitle")}>{tr("design.warningBody")}</Alert>
            <Skeleton style={{ inlineSize: "8rem", blockSize: "2rem" }} />
            <EmptyState title={tr("design.emptyTitle")} description={tr("design.emptyDesc")} />
            <PriceTag finalToman={12_500_000} oldToman={15_000_000} discountPercent={17} finalUsdCents={12500} locale={locale} />
          </div>
        </section>

        <section className="section" aria-labelledby="d-nav">
          <h2 id="d-nav" className="section__title">{tr("design.nav")}</h2>
          <div className="design-row">
            <Stepper steps={[t("nav.cart", locale), t("checkout.address", locale), t("checkout.payment", locale)]} current={1} locale={locale} label={t("ui.steps")} />
            <DesignInteractive />
            <Icon name="shield" size={20} aria-hidden="true" />
            <BrandMark size={28} />
          </div>
        </section>
      </div>
    </>
  );
}
