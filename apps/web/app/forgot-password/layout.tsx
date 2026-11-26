import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/locale";
import { routeMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata(await getLocale(), "/forgot-password", "meta.forgot", "meta.forgotDesc");
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
