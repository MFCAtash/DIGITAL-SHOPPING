import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { themeInitScript } from "@digital-shopping/ui";
import "./globals.css";
import { StoreProvider } from "@/components/providers";
import { englishText, t as translate } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-provider";
import { GlobalTranslator } from "@/components/global-translator";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SwRegister } from "@/components/sw-register";
import { CosmicBackdrop } from "@/components/cosmic-backdrop";
import { PwaTools } from "@/components/pwa-tools";
import { getLocale } from "@/lib/locale";
import { localeDir } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import type { CategoryDto } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: "Digital Shopping | Genuine Tech, Transparent Prices",
      template: "%s | Digital Shopping",
    },
    description: translate("meta.siteDescription", locale),
    manifest: "/manifest.webmanifest",
    applicationName: "Digital Shopping",
    icons: { icon: "/icon.svg" },
    openGraph: {
      type: "website",
      locale: locale === "fa" ? "fa_IR" : "en_US",
      siteName: "Digital Shopping",
      images: [{ url: "/og-cover.png", width: 1200, height: 630, alt: "Digital Shopping — GitHub cover" }],
    },
    alternates: {
      canonical: "/",
      languages: { "fa-IR": "/", "en-US": "/", "x-default": "/" },
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0716",
  colorScheme: "light dark",
};

const API = process.env.API_BASE_URL ?? "http://localhost:8000/api/v1";

/** خواندن امن دستهها: اگر بکاند در هنگام ساخت در دسترس نبود، هدر بدون ناوبری دسته خراب نمیشود. */
async function loadCategories(lang: string): Promise<CategoryDto[]> {
  try {
    const jar = await cookies();
    const cookie = jar.toString();
    const r = await fetch(`${API}/catalog/categories?lang=${lang}`, {
      headers: cookie ? { cookie } : undefined,
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    return (await r.json()) as CategoryDto[];
  } catch {
    return [];
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const rawCategories = await loadCategories(locale);
  // برخی سرویسها نام دستهها را تنها به فارسی میفرستند؛ در حالت en ترجمهٔ سرور انجام میشود.
  const categories = locale === "en"
    ? rawCategories.map((c) => ({ ...c, name: englishText(c.name) }))
    : rawCategories;
  return (
    <html lang={locale} dir={localeDir(locale)} data-theme="nebula" data-cosmic="true" suppressHydrationWarning>
      <head>
        {/* تم پیش از اولین رنگآمیزی اعمال میشود تا پرش رنگی رخ ندهد. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* فونتهای self-hosted: preload تنها برای فونتهای حیاتی LCP. */}
        <link rel="preload" href="/fonts/vazirmatn-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <CosmicBackdrop />
        <a href="#main" className="skip-link">{translate("common.skip", locale)}</a>
        <LocaleProvider initialLocale={locale}>
        <GlobalTranslator>
        <StoreProvider>
          <SwRegister />
          <PwaTools />
          <div className="web-shell">
            <SiteHeader categories={categories} locale={locale} />
            <main id="main" className="web-main web-container">
              {children}
            </main>
            <SiteFooter />
          </div>
        </StoreProvider>
        </GlobalTranslator>
        </LocaleProvider>
      </body>
    </html>
  );
}
