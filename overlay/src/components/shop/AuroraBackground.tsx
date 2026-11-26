"use client";
import { useEffect, useRef } from "react";

/** شفق نرم + نور دنبال‌کنندهٔ موس + پارالکس (حداکثر ۱۲px). در موبایل و reduced-motion فقط شفق ایستا. */
export function AuroraBackground() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce || !fine) return;
    let raf = 0, x = 0, y = 0;
    const paint = () => {
      raf = 0;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      el.style.setProperty("--px", ((x / window.innerWidth) * 2 - 1).toFixed(3));
      el.style.setProperty("--py", ((y / window.innerHeight) * 2 - 1).toFixed(3));
    };
    const onMove = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(paint); };
    el.setAttribute("data-live", "");
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); el.removeAttribute("data-live"); };
  }, []);
  return (
    <div ref={ref} className="aurora" aria-hidden="true">
      <div className="aurora__far" />
      <div className="aurora__mid"><i className="aurora__blob b1" /><i className="aurora__blob b2" /><i className="aurora__blob b3" /><i className="aurora__blob b4" /></div>
      <div className="aurora__glow" />
      <div className="aurora__noise" />
    </div>
  );
}
