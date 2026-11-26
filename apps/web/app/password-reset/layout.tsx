import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/locale";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/password-reset", "meta.passwordReset", "meta.passwordResetDesc");
}

export default function PasswordResetLayout({ children }: { children: ReactNode }) {
  return children;
}
