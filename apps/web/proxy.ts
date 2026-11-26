import { NextResponse, type NextRequest } from "next/server";
import { EXPERIMENTS, bucket } from "./lib/ab-core";

/**
 * تخصیص پایدار A/B (Next Proxy): شناسهٔ تصادفی یکبار در کوکی ذخیره میشود و واریانت بعداً
 * در سرور (`experimentVariant`) و کلاینت یکسان محاسبه میشود. کوکی HttpOnly و SameSite=Lax است.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  for (const key of Object.values(EXPERIMENTS)) {
    const name = `cx_ab_${key}`;
    if (!request.cookies.has(name)) {
      const id = crypto.randomUUID();
      response.cookies.set(name, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      request.cookies.set(name, id);
    }
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|fonts|media).*)"] };

/** واریانت لحظهای (برای لاگ/متریک در middleware) — محاسبهٔ خالص و بدون I/O. */
export function variantOf(request: NextRequest, key: string) {
  return bucket(key, request.cookies.get(`cx_ab_${key}`)?.value ?? "anonymous");
}
