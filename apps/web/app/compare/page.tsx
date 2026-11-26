import type { Metadata } from "next";
import { CompareView } from "@/components/compare-view";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/compare", "meta.compare", "meta.compareDesc");
}

export default async function ComparePage() {
  const locale = await getLocale();
  return (
    <>
      <h1 className="section__title" style={{ marginBlockStart: "var(--cx-space-4)" }}>{t("footer.compareProducts", locale)}</h1>
      <CompareView />
    </>
  );
}
