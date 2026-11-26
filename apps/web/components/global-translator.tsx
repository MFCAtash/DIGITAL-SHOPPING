"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "./locale-provider";
import { englishText } from "@/lib/i18n";

// مقدارِ control شدهٔ input نباید دستکاری شود؛ فقط برچسبها و متن ترجمه میشوند.
const ATTRS = ["aria-label", "aria-description", "title", "placeholder", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
const CONTROLS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

interface Cached {
  source: string;
  translated: string;
}

/** ترجمهٔ نهایی رشتههای فارسی باقیمانده در DOM هنگام انتخاب انگلیسی (fa/en کامل). */
export function GlobalTranslator({ children }: { children: ReactNode }) {
  const { locale } = useT();
  const root = useRef<HTMLDivElement>(null);
  const texts = useRef(new WeakMap<Node, Cached>());
  const attrs = useRef(new WeakMap<Element, Map<string, Cached>>());

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const translate = (value: string, cache: Cached | undefined): { next: string; cache: Cached } => {
      // اگر ریاکت متن تازهای را جایگزین کرد، آن را مبنای ترجمهٔ بعدی قرار میدهیم.
      const source = !cache || value !== cache.translated ? value : cache.source;
      const next = locale === "en" ? englishText(source) : source;
      return { next, cache: { source, translated: next } };
    };

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (SKIP.has(element.tagName)) return;
        const isControl = CONTROLS.has(element.tagName);
        for (const attr of ATTRS) {
          const value = element.getAttribute(attr);
          if (!value) continue;
          let store = attrs.current.get(element);
          if (!store) {
            store = new Map();
            attrs.current.set(element, store);
          }
          const result = translate(value, store.get(attr));
          store.set(attr, result.cache);
          if (result.next !== value) element.setAttribute(attr, result.next);
        }
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const value = node.nodeValue ?? "";
        if (!value.trim()) return;
        const result = translate(value, texts.current.get(node));
        texts.current.set(node, result.cache);
        if (result.next !== value) node.nodeValue = result.next;
        return;
      }
      for (const child of Array.from(node.childNodes)) walk(child);
    };

    walk(el);
  }, [locale, children]);

  return <div ref={root} style={{ display: "contents" }}>{children}</div>;
}
