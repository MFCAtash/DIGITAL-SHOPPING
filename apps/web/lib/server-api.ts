import { cookies } from "next/headers";

const API = process.env.API_BASE_URL ?? "http://localhost:8000/api/v1";

/** درخواست سمت سرور با انتقال کوکیهای نشست/سبد. در صورت دردسترسنبودن بکاند، null برمیگرداند تا صفحه خراب نشود. */
export async function serverGet<T>(path: string, revalidate = 0): Promise<T | null> {
  try {
    const jar = await cookies();
    const r = await fetch(`${API}${path}`, {
      headers: jar.toString() ? { cookie: jar.toString() } : undefined,
      ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
