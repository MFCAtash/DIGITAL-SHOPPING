// سرور API شبیهسازی شده برای E2E: مستقل از بکاند و تعیینپذیر.
import { createServer } from "node:http";

const product = {
  slug: "sample-phone",
  brand: "Sample",
  category: "phones",
  name: "گوشی نمونه",
  description: "محصول تستی برای مسیر خرید",
  specs: { ram: "8 GB", storage: "256 GB" },
  price_usd_cents: 30000,
  final_usd_cents: 30000,
  discount_percent: 0,
  price_toman: 300_000_000,
  price_note: "",
  price_checked_on: null,
  purchasable: true,
  in_stock: true,
  images: [],
};

const routes = {
  "/api/v1/health": { database: "up" },
  "/api/v1/catalog/categories": [{ slug: "phones", name: "گوشی" }],
  "/api/v1/catalog/products": { count: 1, items: [product] },
  "/api/v1/catalog/products/sample-phone": product,
  "/api/v1/catalog/products/sample-phone/variants": { items: [] },
  "/api/v1/catalog/products/sample-phone/reviews": { items: [], average: 0 },
  "/api/v1/catalog/products/sample-phone/price-history": { items: [] },
  "/api/v1/cart": { lines: [], count: 0, subtotal_toman: 0, notices: [] },
  "/api/v1/auth/csrf": { csrf_token: "test-token" },
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (url.pathname === "/api/v1/auth/me") {
    res.statusCode = 401;
    res.end(JSON.stringify({ code: "unauthorized", message: "ورود لازم است" }));
    return;
  }
  const body = routes[url.pathname];
  if (body === undefined) {
    res.statusCode = 404;
    res.end(JSON.stringify({ code: "not_found", message: "not found" }));
    return;
  }
  res.end(JSON.stringify(body));
}).listen(4000, "127.0.0.1", () => console.log("mock api on 4000"));
