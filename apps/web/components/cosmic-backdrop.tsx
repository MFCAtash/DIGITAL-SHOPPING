"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** زمینهٔ کهکشانی پویا با GSAP + ScrollTrigger؛ تنها هنگام انتخاب تمهای کهکشانی فعال است. */
export function CosmicBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let ctx: gsap.Context | undefined;

    const sync = () => {
      ctx?.revert();
      const theme = document.documentElement.dataset.theme ?? "";
      const galaxy = ["nebula", "aurora", "solar", "ocean", "rose", "silver"].includes(theme);
      const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.current?.classList.toggle("is-active", galaxy);
      root.current?.classList.toggle("is-static", galaxy && reduced);
      if (!reduced && root.current) root.current.style.transition = "";
      if (!galaxy || !a.current || !b.current) return;
      if (reduced) {
        // بدون انیمیشن: فقط حالت ثابت پسزمینه نشان داده میشود (CSS fallback).
        if (root.current) root.current.style.transition = "none";
        gsap.set([a.current, b.current], { clearProps: "transform" });
        return;
      }
      ctx = gsap.context(() => {
        gsap.to(a.current, { x: 90, y: 60, scale: 1.15, duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(b.current, { x: -110, y: -50, scale: 1.22, duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut" });
        ScrollTrigger.create({
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: (self) => gsap.set([a.current, b.current], { yPercent: self.progress * 24 }),
        });
      }, root);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener?.("change", sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener?.("change", sync);
      ctx?.revert();
    };
  }, []);

  return (
    <div className="cosmic-backdrop" ref={root} aria-hidden="true">
      <span className="cosmic-orb cosmic-orb--a" ref={a} />
      <span className="cosmic-orb cosmic-orb--b" ref={b} />
      <span className="cosmic-stars" />
    </div>
  );
}
