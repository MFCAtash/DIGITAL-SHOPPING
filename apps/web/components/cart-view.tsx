"use client";

import Link from "next/link";
import { Button, EmptyState, QuantityStepper, formatToman, toFaDigits } from "@digital-shopping/ui";
import { useStore } from "./providers";
import { imageUrl } from "@/lib/media";
import { ProductImage } from "./product-image";
import { useT } from "./locale-provider";

const specLabel = (key: string, t: (key: string) => string): string => {
  const k = `spec.${key}`;
  return t(k) === k ? key : t(k);
};

/** پیام هشدار بکاند بر اساس code به زبان رابط ترجمه میشود. */
function warningText(w: { code: string; message: string }, locale: string, t: (key: string) => string): string {
  if (locale === "fa") return w.message;
  if (w.code === "price_changed") return t("cart.priceChanged");
  if (w.code === "out_of_stock") return t("cart.outOfStock");
  if (w.code === "stock_low") {
    const match = w.message.match(/[0-9۰-۹٬,]+/);
    return t("cart.stockLow").replace("{n}", match ? match[0].replace(/[٬,]/g, "") : "");
  }
  return w.message;
}

/** سبد با نمایش شفاف: برند، مشخصات، قیمت قبل/بعد تخفیف، جمع خط و تعداد. */
export function CartView() {
  const { cart, setQty, removeLine, ready } = useStore();
  const { t, locale } = useT();

  if (!ready) return <p>{t("cart.loading")}</p>;
  if (!cart.lines.length) {
    return (
      <EmptyState
        title={t("cart.empty")}
        description={t("cart.emptyDesc")}
        action={<Link href="/products" className="cx-btn cx-btn--primary">{t("hero.cta")}</Link>}
      />
    );
  }

  return (
    <div className="cart-layout">
      <section>
        <h2 className="section__title" style={{ fontSize: "var(--cx-text-xl)" }}>
          {t("cart.items")} ({toFaDigits(cart.count, locale)})
        </h2>
        <ul className="line-list">
          {cart.lines.map((l) => {
            const specs = Object.entries(l.specs ?? {}).slice(0, 4);
            return (
              <li key={l.slug} className="cart-line">
                <Link href={`/products/${l.slug}`} className="cart-line__media" aria-label={l.name}>
                  {l.image ? <ProductImage src={imageUrl(l.image) ?? ""} width={104} height={104} sizes="104px" /> : <span className="cart-line__placeholder">◆</span>}
                </Link>

                <div className="cart-line__info">
                  <span className="cart-line__brand">{l.brand}</span>
                  <Link href={`/products/${l.slug}`} className="cart-line__name"><bdi>{l.name}</bdi></Link>
                  {specs.length ? (
                    <div className="cart-line__specs">
                      {specs.map(([k, v]) => <span key={k}>{specLabel(k, t)}: <bdi>{v}</bdi></span>)}
                    </div>
                  ) : null}
                  {l.warnings.map((w) => <p key={w.code} className="notice">{warningText(w, locale, t)}</p>)}
                  <div className="cart-line__mobile-qty">
                    <QuantityStepper value={l.qty} max={l.max_qty} itemName={l.name} onChange={(q) => void setQty(l.slug, q)} />
                  </div>
                </div>

                <div className="cart-line__pricing">
                  {l.discount_percent > 0 ? <span className="cart-line__deal">{t("cart.blackFriday")} · {toFaDigits(l.discount_percent, locale)}{t("common.percent")}</span> : null}
                  {l.old_toman && l.old_toman > (l.unit_toman ?? 0) ? <s className="cart-line__old cx-num">{formatToman(l.old_toman, {}, locale)}</s> : null}
                  <strong className="cart-line__unit cx-num">{l.unit_toman == null ? t("cart.unknownPrice") : formatToman(l.unit_toman, {}, locale)}</strong>
                  <small>{t("cart.each")}</small>
                  <span className="cart-line__total cx-num">{l.line_toman == null ? "—" : formatToman(l.line_toman, {}, locale)}</span>
                  <small>{t("cart.lineTotal")}</small>
                </div>

                <div className="cart-line__actions">
                  <div className="cart-line__desktop-qty">
                    <QuantityStepper value={l.qty} max={l.max_qty} itemName={l.name} onChange={(q) => void setQty(l.slug, q)} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void removeLine(l.slug)} aria-label={`${t("cart.remove")} ${l.name}`}>
                    {t("cart.remove")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="summary-card">
        <h2 style={{ marginBlockStart: 0 }}>{t("cart.summary")}</h2>
        <div className="value-row"><span>{t("cart.qty")}</span><span className="cx-num">{toFaDigits(cart.count, locale)}</span></div>
        <div className="value-row value-row--total">
          <span>{t("cart.subtotal")}</span>
          <span className="cx-num">{formatToman(cart.subtotal_toman, {}, locale)}</span>
        </div>
        <p style={{ fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)" }}>{t("cart.shippingNote")}</p>
        <Link href="/checkout" className="cx-btn cx-btn--primary cx-btn--lg cx-btn--block" style={{ marginBlockStart: "var(--cx-space-3)" }}>
          {t("cart.continue")}
        </Link>
      </aside>
    </div>
  );
}
