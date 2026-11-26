import http from "k6/http";
import { check, sleep } from "k6";

/** بار معمولی: فقط خواندنی و بدون راز. K6_CHECKOUT=1 مسیر خرید sandbox را هم اجرا میکند. */
export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.02"],
    checks: ["rate>0.95"],
  },
};

const BASE = __ENV.API_BASE_URL || "http://localhost:8000/api/v1";
const CHECKOUT = __ENV.K6_CHECKOUT === "1";
// نشست sandbox یکبار با ورود OTP در محیط آزمایشی بهدست میآید (راز واقعی نیست)؛
// ops/k6/README.md نحوهٔ تهیهٔ آن را توضیح میدهد.
const SESSION = __ENV.K6_SESSION_COOKIE || "";
const CSRF = __ENV.K6_CSRF_TOKEN || "";

function headers(csrf = "") {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  if (SESSION) h.Cookie = `sessionid=${SESSION}${CSRF ? `; csrftoken=${CSRF}` : ""}`;
  if (csrf) h["X-CSRFToken"] = csrf;
  return h;
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function checkout() {
  const csrfRes = http.get(`${BASE}/auth/csrf`, { headers: headers(CSRF) });
  const csrf = csrfRes.status === 200 ? csrfRes.json("csrf_token") : CSRF;
  const h = headers(csrf);

  const list = http.get(`${BASE}/catalog/products?limit=1`, { headers: h });
  if (list.status !== 200 || !list.json("items")?.length) return;
  const slug = list.json("items")[0].slug;

  const added = http.put(`${BASE}/cart/items/${encodeURIComponent(slug)}`, JSON.stringify({ qty: 1 }), { headers: h });
  check(added, { "cart add 200": (r) => r.status === 200 });

  const address = http.post(
    `${BASE}/addresses`,
    JSON.stringify({
      receiver_name: "بار تست",
      receiver_phone: "09123456789",
      province: "تهران",
      city: "تهران",
      postal_code: "1234567890",
      street: "خیابان تست",
      plate: "1",
      unit: "1",
      is_default: true,
    }),
    { headers: h },
  );
  check(address, { "address 200/201": (r) => r.status === 200 || r.status === 201 });
  const addressId = address.json("id");
  if (!addressId) return;

  const order = http.post(
    `${BASE}/orders`,
    JSON.stringify({ address_id: addressId, shipping_code: "post" }),
    { headers: { ...h, "Idempotency-Key": uuid() } },
  );
  check(order, { "order 200/201": (r) => r.status === 200 || r.status === 201 });
  const number = order.json("number");
  if (!number) return;

  // درگاه fake: سناریوی success نیازمند هیچ کلید خارجیای نیست؛ callback را خود k6 دنبال میکند.
  const pay = http.post(`${BASE}/orders/${number}/pay`, JSON.stringify({ scenario: "success" }), { headers: h });
  check(pay, { "pay 200": (r) => r.status === 200 });
  const redirect = pay.json("redirect_url");
  if (redirect) {
    const callback = http.get(redirect, { headers: h });
    check(callback, { "sandbox callback 200": (r) => r.status === 200 });
  }
  http.get(`${BASE}/orders/${number}`, { headers: h });
}

export default function () {
  const list = http.get(`${BASE}/catalog/products?limit=24`);
  check(list, { "catalog 200": (r) => r.status === 200 });

  const cats = http.get(`${BASE}/catalog/categories`);
  check(cats, { "categories 200": (r) => r.status === 200 });

  const health = http.get(`${BASE}/health`);
  check(health, { "health 200": (r) => r.status === 200 });

  if (CHECKOUT) {
    if (!SESSION) throw new Error("K6_CHECKOUT=1 needs K6_SESSION_COOKIE (sandbox session, see ops/k6/README.md)");
    checkout();
  }
  sleep(1);
}
