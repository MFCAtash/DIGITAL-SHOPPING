import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "@/lib/media";
import { ThemeToggle } from "./theme-toggle";
import type { ProductDto } from "@/lib/types";

interface Props {
  products: ProductDto[];
  viewLabel: string;
}

/** کاور ترکیبی ۸ محصولی: چیدمان صورت فلکی + پرتوهای منشور، با هالهٔ آبی اقیانوسی و صورتی کهکشانی. */
export function HomeCover({ products, viewLabel }: Props) {
  if (products.length === 0) return null;
  return (
    <div className="home-cover home-cover--hybrid">
      <div className="home-cover__glow" aria-hidden="true" />
      <div className="home-cover__rays" aria-hidden="true" />
      <div className="home-cover__grid" aria-hidden="true" />
      <div className="home-cover__top">
        <span>Digital Shopping · Galaxy Collection</span>
        <ThemeToggle />
      </div>
      <div className="home-cover__stage">
        {products.map((p, i) => {
          const src = imageUrl(p.images[0]?.file);
          return (
            <Link key={p.slug} href={`/products/${p.slug}`} className="cover-card" aria-label={p.name}>
              <span className="cover-card__label">{String(i + 1).padStart(2, "0")} · {p.brand}</span>
              {src ? <Image src={src} alt="" width={420} height={520} sizes="(max-width: 760px) 45vw, 16vw" priority={i < 4} className="cover-card__img" /> : null}
              <span className="cover-card__name"><bdi>{p.name}</bdi></span>
            </Link>
          );
        })}
      </div>
      <span className="home-cover__badge">{viewLabel}</span>
    </div>
  );
}
