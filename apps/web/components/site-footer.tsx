"use client";

import Link from "next/link";
import { NexusLogo } from "./nexus-logo";
import { useT } from "./locale-provider";

export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="site-footer">
      <div className="web-container">
        <div className="site-footer__grid">
          <section>
            <h2>{t("footer.shop")}</h2>
            <ul>
              <li><Link href="/products">{t("footer.allProducts")}</Link></li>
              <li><Link href="/products?sort=newest">{t("footer.newest")}</Link></li>
              <li><Link href="/compare">{t("footer.compareProducts")}</Link></li>
            </ul>
          </section>
          <section>
            <h2>{t("footer.buy")}</h2>
            <ul>
              <li><Link href="/cart">{t("footer.cart")}</Link></li>
              <li><Link href="/account/orders">{t("footer.track")}</Link></li>
              <li><Link href="/account/addresses">{t("footer.addresses")}</Link></li>
            </ul>
          </section>
          <section>
            <h2>{t("footer.trust")}</h2>
            <ul>
              <li>{t("footer.guarantee")}</li>
              <li>{t("footer.return7")}</li>
              <li>{t("footer.secure")}</li>
            </ul>
          </section>
          <section>
            <h2>{t("footer.about")}</h2>
            <ul>
              <li>{t("footer.freshPrices")}</li>
              <li>{t("footer.exactSpecs")}</li>
              <li>{t("footer.privacy")}</li>
            </ul>
          </section>
        </div>
        <div className="site-footer__brand">
          <NexusLogo size={40} />
          <span>Digital Shopping</span>
        </div>
        <p style={{ fontSize: "var(--cx-text-xs)", color: "var(--cx-muted)" }}>
          © Digital Shopping — {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
