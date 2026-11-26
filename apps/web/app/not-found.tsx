import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return routeMetadata(await getLocale(), "/404", "meta.notFound", "common.notFoundDesc");
}

export default async function NotFound() {
  const locale = await getLocale();
  const tr = (key: string) => t(key, locale);
  return (
    <div className="panel" style={{ textAlign: "center", marginBlockStart: "var(--cx-space-8)" }}>
      <h1>{tr("common.notFound")}</h1>
      <p>{tr("common.notFoundDesc")}</p>
      <Link href="/" className="cx-btn cx-btn--primary">{tr("common.backHome")}</Link>
    </div>
  );
}
