"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Sheet } from "@codex/ui";
import { toFaDigits } from "@codex/ui";
import { NexusLogo } from "./nexus-logo";
import { SearchBox } from "./search-box";
import { CategoryMenu } from "./category-menu";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitch } from "./locale-switch";
import { useStore } from "./providers";
import { t, type Locale } from "@/lib/i18n";
import type { CategoryDto } from "@/lib/types";

interface Props {
  categories: CategoryDto[];
  locale: Locale;
}

/** هدر چسبنده: ناوبری دسکتاپ + کشوی موبایل + جستجو + تم + زبان + شمارش سبد. */
export function SiteHeader({ categories, locale }: Props) {
  const pathname = usePathname();
  const { cart } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setNavOpen(false), [pathname]);

  const links = [
    { href: "/", key: "nav.home" },
    { href: "/products", key: "nav.products" },
    { href: "/compare", key: "nav.compare" },
    { href: "/account", key: "nav.account" },
  ];
  const cartText = `${t("nav.cart", locale)} (${toFaDigits(cart.count, locale)})`;

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="web-container site-header__bar">
        <button type="button" className="cx-btn cx-btn--ghost cx-btn--sm site-header__menu" onClick={() => setNavOpen(true)} aria-label={t("nav.menu", locale)}>
          <Icon name="menu" size={20} aria-hidden="true" />
        </button>
        <Link href="/" className="site-header__brand">
          <NexusLogo className="site-header__logo3d" size={38} />
          <span className="site-header__wordmark">Digital<span>Shopping</span></span>
        </Link>
        <div className="site-header__nav">
          <SearchBox />
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
              {t(l.key, locale)}
            </Link>
          ))}
          <Link href="/cart" className="site-header__cart">
            {cartText}
          </Link>
          <LocaleSwitch locale={locale} />
        </div>
      </div>
      <div className="web-container category-nav-wrap">
        <CategoryMenu categories={categories} />
        <ThemeToggle />
        <span className="category-nav__hint">{t("nav.categories", locale)} · {t("home.navDesign", locale)}</span>
      </div>

      <Sheet open={navOpen} onClose={() => setNavOpen(false)} title={t("nav.navigation", locale)} closeLabel={t("common.close", locale)}>
        <nav className="mobile-nav" aria-label={t("nav.mainNavigation", locale)}>
          <div className="mobile-nav__search" style={{ marginBlockEnd: "var(--cx-space-4)" }}><SearchBox /></div>
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={pathname === l.href ? "page" : undefined}>{t(l.key, locale)}</Link>
              </li>
            ))}
            <li><Link href="/cart">{cartText}</Link></li>
          </ul>
          <h2 className="mobile-nav__title">{t("nav.categories", locale)}</h2>
          <ul className="mobile-nav__cats">
            {categories.map((c) => (
              <li key={c.slug}><Link href={`/products?category=${encodeURIComponent(c.slug)}`}>{c.name}</Link></li>
            ))}
            {categories.length === 0 ? <li>{t("plp.noCategories", locale)}</li> : null}
          </ul>
          <div className="mobile-nav__tools">
            <ThemeToggle />
            <LocaleSwitch locale={locale} />
          </div>
        </nav>
      </Sheet>
    </header>
  );
}
