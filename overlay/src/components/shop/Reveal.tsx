"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * ظاهرشدن نرم هنگام اسکرول. delay برحسب میلی‌ثانیه برای ورود پله‌ای.
 * محتوا به‌صورت پیش‌فرض (SSR، بدون JS، مرورگر بدون IntersectionObserver، reduced-motion) کاملاً دیده می‌شود؛
 * فقط آیتم‌های زیر صفحه پس از بارگذاری پنهان و هنگام نزدیک‌شدن نمایان می‌شوند (LCP و CLS آسیب نمی‌بینند).
 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; // همین الان در دید یا بالاتر است
    el.classList.add("reveal--pending");
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => { io.disconnect(); el.classList.remove("reveal--pending", "in"); };
  }, []);
  return <div ref={ref} className="reveal" style={{ ["--d" as string]: `${delay}ms` }}>{children}</div>;
}
