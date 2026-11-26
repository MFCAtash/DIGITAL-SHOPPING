"use client";
import { useRef, useState } from "react";
import { cx } from "../lib/cx";
import { toFaDigits } from "../lib/format";
import { swipeToStep } from "../lib/swipe";
import { IconButton } from "./button";
import { Modal } from "./overlay";
import { dirOf } from "./dir";

export interface GalleryImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** نسخهٔ بزرگ برای زوم */
  fullSrc?: string;
}

export interface GalleryProps {
  images: readonly GalleryImage[];
  /** عنوان کالا برای برچسب‌ها */
  productName: string;
  zoomable?: boolean;
  className?: string;
}

/**
 * گالری: تصویر اصلی با دکمه‌های قبلی/بعدی (جهت‌دار در RTL)، کشیدن انگشت، تصاویر بندانگشتی و زوم در Modal.
 * بدون JS اولین تصویر نمایش داده می‌شود.
 */
export function Gallery({ images, productName, zoomable = true, className }: GalleryProps) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const n = images.length;
  const cur = images[i];
  if (!cur) return null;
  const go = (d: 1 | -1) => setI((x) => (x + d + n) % n);

  return (
    <div className={cx("cx-gallery", className)} role="group" aria-roledescription="گالری تصاویر" aria-label={`تصاویر ${productName}`}>
      <div
        className="cx-gallery__stage"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s || n < 2) return;
          const step = swipeToStep(e.clientX - s.x, e.clientY - s.y, dirOf(e.currentTarget));
          if (step) go(step);
        }}
      >
        <img src={cur.src} alt={cur.alt} width={cur.width} height={cur.height} className="cx-gallery__img" />
        {n > 1 ? (
          <>
            <IconButton icon="chevron-end" mirror label="تصویر بعدی" variant="secondary" className="cx-gallery__nav cx-gallery__nav--next" onClick={() => go(1)} />
            <IconButton icon="chevron-start" mirror label="تصویر قبلی" variant="secondary" className="cx-gallery__nav cx-gallery__nav--prev" onClick={() => go(-1)} />
          </>
        ) : null}
        {zoomable ? <IconButton icon="zoom" label="بزرگ‌نمایی" variant="secondary" className="cx-gallery__zoom" onClick={() => setZoom(true)} /> : null}
        <p className="cx-gallery__count cx-num" aria-live="polite">{toFaDigits(i + 1)} از {toFaDigits(n)}</p>
      </div>
      {n > 1 ? (
        <ul className="cx-gallery__thumbs">
          {images.map((img, idx) => (
            <li key={img.src}>
              <button type="button" aria-label={`نمایش تصویر ${toFaDigits(idx + 1)} از ${toFaDigits(n)}`} aria-current={idx === i ? "true" : undefined} className="cx-gallery__thumb" onClick={() => setI(idx)}>
                <img src={img.src} alt="" width={64} height={64} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {zoomable ? (
        <Modal open={zoom} onClose={() => setZoom(false)} title={productName} className="cx-modal--zoom">
          <img src={cur.fullSrc ?? cur.src} alt={cur.alt} className="cx-gallery__full" />
        </Modal>
      ) : null}
    </div>
  );
}
