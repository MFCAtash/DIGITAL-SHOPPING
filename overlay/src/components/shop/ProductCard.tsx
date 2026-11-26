import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "./PriceTag";

export type ProductCardProps = {
  slug: string; name: string; brand?: string | null; image?: string | null; alt?: string;
  priceCents: number | null; finalCents: number | null; discountPercent?: number;
  chips?: string[]; note?: "from" | "approx" | null; href?: string;
};

export function ProductCard(p: ProductCardProps) {
  return (
    <Link href={p.href ?? `/products/${encodeURIComponent(p.slug)}`} className="s-card">
      <div className="s-media">
        {p.image ? <Image src={p.image} alt={p.alt ?? p.name} fill sizes="(max-width:640px) 50vw, 25vw" style={{ objectFit: "contain", padding: "6%" }} /> : null}
      </div>
      {p.brand ? <span className="s-price__from">{p.brand}</span> : null}
      <h3 style={{ fontSize: ".95rem", fontWeight: 700, margin: 0, lineHeight: 1.5 }} dir="auto">{p.name}</h3>
      {p.chips?.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{p.chips.map((c) => <span key={c} className="s-chip">{c}</span>)}</div> : null}
      <PriceTag priceCents={p.priceCents} finalCents={p.finalCents} discountPercent={p.discountPercent} note={p.note} />
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="s-card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: "1/1" }} />
      <div className="skeleton" style={{ height: 14, width: "40%" }} />
      <div className="skeleton" style={{ height: 18, width: "85%" }} />
      <div className="skeleton" style={{ height: 26, width: "55%" }} />
    </div>
  );
}
