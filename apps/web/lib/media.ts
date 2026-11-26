/** آدرس تصویر کالا. بکاند فقط نام فایل را میدهد؛ مسیر توسط Caddy/Next proxy میشود. */
const MEDIA = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "/media/products/";

export function imageUrl(file: string | null | undefined): string | undefined {
  if (!file) return undefined;
  if (/^https?:\/\//i.test(file)) return file;
  return `${MEDIA.replace(/\/$/, "")}/${file.replace(/^\/+/, "")}`;
}
