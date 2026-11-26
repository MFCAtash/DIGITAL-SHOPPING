import Link from "next/link";

/** برچسب طلایی نام فروشگاه. */
export function BrandMark({ href = "/" }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="Codex Shopping">Codex Shopping</Link>;
}
