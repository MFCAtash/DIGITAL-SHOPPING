/* Service Worker ساده: کش استاتیک و استراتژی network-first برای صفحات.
   ثبت آن توسط اسکریپت ثبت سرویس ورکر در layout انجام میشود (فقط production). */
const CACHE = "digital-shopping-web-v3";
const CORE = ["/", "/products", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => {
        // pwa-tools منتظر رویداد digital-shopping:sw-update است؛ SW آن را به صورت پیام به صفحه میفرستد.
        for (const client of clients) client.postMessage({ type: "digital-shopping:sw-update" });
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.url.includes("/api/")) return; // دادهٔ زنده سبد/قیمت هرگز از کش سرو نشود

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? caches.match("/"))),
  );
});
