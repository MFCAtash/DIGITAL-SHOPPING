import type { Metadata } from "next";
import { t, type Locale } from "./i18n";

/** آدرس عمومی سایت؛ در production نباید به localhost پیشفرض شود. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  const host = process.env.NEXT_PUBLIC_SITE_HOST ?? process.env.VERCEL_URL ?? process.env.HOSTNAME;
  return host ? `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "https://digital-shopping.example";
}

export function seoBase(locale: Locale): Pick<Metadata, "metadataBase" | "openGraph"> {
  return {
    metadataBase: new URL(siteUrl()),
    openGraph: { locale: locale === "fa" ? "fa_IR" : "en_US" },
  };
}

/** متادیتای محلیشده همراه با canonical و hreflang برای همان مسیر. */
export function routeMetadata(
  locale: Locale,
  path: string,
  titleKey: string,
  descriptionKey: string,
): Metadata {
  const base = siteUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return {
    ...seoBase(locale),
    title: t(titleKey, locale),
    description: t(descriptionKey, locale),
    alternates: {
      canonical: url,
      languages: {
        "fa-IR": url,
        "en-US": url,
        "x-default": url,
      },
    },
  };
}
