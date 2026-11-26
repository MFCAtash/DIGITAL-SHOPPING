"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@codex/ui";
import { imageUrl } from "@/lib/media";
import type { ImageDto } from "@/lib/types";
import { useT } from "./locale-provider";

const TAB_ID = "pdp-gallery-tab-";

/** گالری PDP با next/image: تصویر اصلی LCP، بندانگشتیها و جابجایی با صفحهکلید. */
export function Gallery({ images, name }: { images: ImageDto[]; name: string }) {
  const { t } = useT();
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const srcs = images.map((i) => imageUrl(i.file)).filter(Boolean) as string[];
  if (srcs.length === 0) {
    return <div className="pdp__stage" role="img" aria-label={`${t("gallery.noImagePrefix")}${name}${t("gallery.noImageSuffix")}`}>◆</div>;
  }
  const src = srcs[Math.min(active, srcs.length - 1)];
  const external = /^https?:\/\//i.test(src);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const rtl = document.documentElement.dir === "rtl";
    let next = active;
    if (e.key === "ArrowRight") next = rtl ? active - 1 : active + 1;
    else if (e.key === "ArrowLeft") next = rtl ? active + 1 : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = srcs.length - 1;
    else return;
    e.preventDefault();
    const normalized = (next + srcs.length) % srcs.length;
    setActive(normalized);
    tabs.current[normalized]?.focus();
  }

  return (
    <div className="pdp__gallery">
      <div className="pdp__thumbs" role="tablist" aria-label={t("gallery.images")} onKeyDown={onKeyDown}>
        {srcs.map((s, i) => (
          <button
            key={s}
            ref={(node) => { tabs.current[i] = node; }}
            id={`${TAB_ID}${i}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls="pdp-gallery-panel"
            tabIndex={i === active ? 0 : -1}
            aria-label={`${t("gallery.showImage")}${i + 1}`}
            onClick={() => setActive(i)}
            style={{ border: i === active ? "2px solid var(--cx-text)" : "1px solid var(--cx-line)", padding: 0, background: "none", inlineSize: "4rem", blockSize: "4rem" }}
          >
            <Image src={s} alt="" width={64} height={64} sizes="64px" unoptimized={/^https?:\/\//i.test(s)} className="cx-image-contain" />
          </button>
        ))}
      </div>
      <div className="pdp__stage" id="pdp-gallery-panel" role="tabpanel" aria-labelledby={`${TAB_ID}${Math.min(active, srcs.length - 1)}`} tabIndex={0}>
        <Image
          src={src}
          alt={name}
          width={800}
          height={1000}
          sizes="(max-width: 900px) 100vw, 50vw"
          priority
          unoptimized={external}
          className="cx-image-contain"
        />
        <span className="pdp__stage-count" aria-hidden="true"><Icon name="info" size={14} /> {active + 1}/{srcs.length}</span>
      </div>
    </div>
  );
}
