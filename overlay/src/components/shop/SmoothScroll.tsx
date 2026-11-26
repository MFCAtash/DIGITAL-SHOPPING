"use client";
import { useEffect } from "react";

/** true اگر چرخ موس باید به یک ناحیهٔ اسکرول‌پذیر داخلی (مودال، لیست، textarea، data-native-scroll) برسد. */
function inNativeScroller(start: EventTarget | null): boolean {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.documentElement && el !== document.body) {
    if (el.hasAttribute("data-native-scroll")) return true;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * اسکرول نرم با درون‌یابی (lerp) + نوار پیشرفت طلایی.
 * خاموش در: لمسی، reduced-motion، افقی، zoom (Ctrl)، ناحیه‌های اسکرول داخلی، و وقتی اسکرول صفحه قفل است (مودال).
 * اسکرول‌هایی که از جای دیگر می‌آیند (کیبورد، کشیدن نوار، لینک #، تغییر مسیر) تشخیص داده می‌شوند و انیمیشن را قطع می‌کنند.
 */
export function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
    const bar = () => {
      const m = maxScroll();
      root.style.setProperty("--sp", m > 0 ? String(Math.min(1, window.scrollY / m)) : "0");
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const smooth = !reduce && fine;

    let target = window.scrollY, cur = target, raf = 0;
    const tick = () => {
      cur += (target - cur) * 0.085;
      if (Math.abs(target - cur) < 0.4) { cur = target; raf = 0; } else raf = requestAnimationFrame(tick);
      window.scrollTo(0, cur);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(root).overflow === "hidden") return;
      if (inNativeScroller(e.target)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      target = Math.max(0, Math.min(maxScroll(), target + e.deltaY * unit));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      bar();
      // اسکرولِ بیرونی (نه از tick ما): هدف را با موقعیت واقعی هم‌گام کن و انیمیشن را قطع کن
      if (smooth && Math.abs(window.scrollY - cur) > 2) {
        cancelAnimationFrame(raf); raf = 0;
        target = cur = window.scrollY;
      }
    };
    const onResize = () => { bar(); target = Math.min(target, maxScroll()); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (smooth) window.addEventListener("wheel", onWheel, { passive: false });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(bar) : null;
    ro?.observe(root);
    bar();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      ro?.disconnect();
      cancelAnimationFrame(raf);
      root.style.removeProperty("--sp");
    };
  }, []);
  return <div className="scroll-progress" aria-hidden="true" />;
}
