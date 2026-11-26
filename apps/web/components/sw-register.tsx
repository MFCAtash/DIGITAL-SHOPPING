"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // service worker نمیتواند مستقیماً رویداد DOM بسازد؛ پیام آن را به رویداد مورد انتظار pwa-tools تبدیل میکنیم.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "codex:sw-update") window.dispatchEvent(new Event("codex:sw-update"));
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return null;
}
