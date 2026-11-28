/**
 * کلاینت تایپشدهی API. تمام درخواستها به همان origin (/api) میروند تا کوکیهای نشست و سبد
 * توسط مرورگر بهطور خودکار ارسال شوند. توکن CSRF از /auth/csrf خوانده میشود (کوکیاش HttpOnly است).
 */
import { ApiError, type ApiErrorShape, type AddressDto, type AddressInput, type CartDto, type CategoryDto, type CouponDto, type FacetsDto, type NotificationDto, type OrderDto, type OrderListDto, type PricePointDto, type ProductDto, type ProductListDto, type ReturnDto, type ReviewDto, type ReviewListDto, type ShippingQuote, type SuggestDto, type UserDto } from "./types";

const BASE = "/api";

/** پیامهای فارسی بکاند که در رابط انگلیسی باید معادل انگلیسی داشته باشند. */
const EN_ERROR_MESSAGES: Record<string, string> = {
  "ابتدا وارد شوید.": "Please sign in first.",
  "دسترسی مجاز نیست.": "You do not have permission to do this.",
  "کالا پیدا نشد.": "Product not found.",
  "سفارش پیدا نشد.": "Order not found.",
  "دریافت توکن امنیتی ممکن نشد.": "Could not obtain a security token.",
};

function apiError(status: number, body: Record<string, unknown>): ApiError {
  const shape = body as Partial<ApiErrorShape>;
  if (typeof document === "undefined" || document.documentElement.lang !== "en") return new ApiError(status, shape);
  const message = shape.message;
  if (typeof message === "string" && EN_ERROR_MESSAGES[message]) {
    return new ApiError(status, { ...shape, message: EN_ERROR_MESSAGES[message] });
  }
  return new ApiError(status, shape);
}

function parseBody(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { code: "invalid_response", message: "پاسخ نامعتبر از سرور" };
  }
}

let csrfToken: string | null = null;

export async function ensureCsrf(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  const r = await fetch(`${BASE}/auth/csrf`, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new ApiError(r.status, { code: "csrf_unavailable", message: "دریافت توکن امنیتی ممکن نشد." });
  const data = (await r.json()) as { csrf_token: string };
  csrfToken = data.csrf_token;
  return csrfToken;
}

interface RequestOptions extends RequestInit {
  /** مهمان بودن را برخلاف تشخیص پیشفرض مشخص میکند */
  anonymous?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
    headers.set("X-CSRFToken", await ensureCsrf());
  }

  let r = await fetch(`${BASE}${path}`, { ...options, method, headers, credentials: "include", cache: "no-store" });
  let text = r.status === 204 ? "" : await r.text();
  let body = parseBody(text);

  // توکن CSRF ممکن است در اثر چرخش کوکی/نشست قدیمی شود؛ یکبار توکن تازه میگیریم و دوباره تلاش میکنیم.
  if (r.status === 403 && (body as { code?: string }).code === "csrf_failed" && method !== "GET" && method !== "HEAD") {
    headers.set("X-CSRFToken", await ensureCsrf(true));
    r = await fetch(`${BASE}${path}`, { ...options, method, headers, credentials: "include", cache: "no-store" });
    text = r.status === 204 ? "" : await r.text();
    body = parseBody(text);
  }

  if (!r.ok) throw apiError(r.status, body);
  return body as T;
}

/* ---------- کاتالوگ ---------- */
export interface ProductQuery {
  q?: string;
  category?: string;
  brand?: string;
  /** چندانتخابی: brands=apple,samsung */
  brands?: string;
  categories?: string;
  ram_gte?: number;
  storage_gte?: number;
  /** فیلتر مشخصات عمومی: ram:gte:8,storage:gte:256 */
  spec?: string;
  min_usd?: number;
  max_usd?: number;
  in_stock?: boolean;
  on_sale?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "rating" | "discount" | "popular";
  limit?: number;
  offset?: number;
  lang?: string;
}

export function products(query: ProductQuery = {}): Promise<ProductListDto> {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return request<ProductListDto>(`/catalog/products${s ? `?${s}` : ""}`);
}

export function product(slug: string, lang = "fa"): Promise<ProductDto> {
  return request<ProductDto>(`/catalog/products/${encodeURIComponent(slug)}?lang=${lang}`);
}

export function categories(lang = "fa"): Promise<CategoryDto[]> {
  return request<CategoryDto[]>(`/catalog/categories?lang=${lang}`);
}

export function facets(query: ProductQuery = {}): Promise<FacetsDto> {
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return request<FacetsDto>(`/catalog/facets${s ? `?${s}` : ""}`);
}

export function suggest(q: string, limit = 8): Promise<SuggestDto> {
  return request<SuggestDto>(`/catalog/suggest?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export function related(slug: string, lang = "fa", limit = 4): Promise<{ items: ProductDto[] }> {
  const p = new URLSearchParams({ lang, limit: String(limit) });
  return request<{ items: ProductDto[] }>(`/catalog/products/${encodeURIComponent(slug)}/related?${p}`);
}

export function reviews(slug: string, limit = 10, offset = 0, sort = "newest"): Promise<ReviewListDto> {
  return request<ReviewListDto>(`/catalog/products/${encodeURIComponent(slug)}/reviews?limit=${limit}&offset=${offset}&sort=${sort}`);
}

export function priceHistory(slug: string): Promise<{ items: PricePointDto[] }> {
  return request<{ items: PricePointDto[] }>(`/catalog/products/${encodeURIComponent(slug)}/price-history`);
}

export function addReview(slug: string, body: { rating: number; title?: string; body: string }): Promise<ReviewDto> {
  return request<ReviewDto>(`/catalog/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", body: JSON.stringify(body) });
}

/* ---------- سبد ---------- */
export const cart = {
  get: () => request<CartDto>("/cart"),
  set: (slug: string, qty: number) => request<CartDto>(`/cart/items/${encodeURIComponent(slug)}`, { method: "PUT", body: JSON.stringify({ qty }) }),
  remove: (slug: string) => request<CartDto>(`/cart/items/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  clear: () => request<CartDto>("/cart", { method: "DELETE" }),
  merge: () => request<CartDto>("/cart/merge", { method: "POST" }),
  ack: () => request<CartDto>("/cart/ack", { method: "POST" }),
};

/* ---------- احراز هویت و نشانی ---------- */
export const auth = {
  me: () => request<UserDto>("/auth/me"),
  requestOtp: (phone: string) => request<{ ok: boolean; expires_in: number; resend_in: number }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, code: string) => request<{ user: UserDto; csrf_token: string }>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code }) }).then((d) => {
    csrfToken = d.csrf_token;
    return d;
  }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  updateProfile: (name: string) => request<UserDto>("/auth/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  passwordSet: (newPassword: string) => request<{ ok: boolean }>("/auth/password/set", { method: "POST", body: JSON.stringify({ new_password: newPassword }) }),
  passwordChange: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/auth/password/change", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
  passwordResetRequest: (phone: string) => request<{ ok: boolean }>("/auth/password/reset/request", { method: "POST", body: JSON.stringify({ phone }) }),
  passwordResetConfirm: (uid: string, token: string, newPassword: string) =>
    request<{ ok: boolean }>("/auth/password/reset/confirm", { method: "POST", body: JSON.stringify({ uid, token, new_password: newPassword }) }),
};

export const addresses = {
  list: () => request<AddressDto[]>("/addresses"),
  create: (body: AddressInput) => request<AddressDto>("/addresses", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: AddressInput) => request<AddressDto>(`/addresses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: number) => request<{ ok: boolean }>(`/addresses/${id}`, { method: "DELETE" }),
  setDefault: (id: number) => request<AddressDto>(`/addresses/${id}/default`, { method: "POST" }),
};

/* ---------- سفارش و ارسال و پرداخت ---------- */
export const orders = {
  create: (body: { address_id?: number | null; address?: AddressInput | null; shipping_code: string; coupon_code?: string }) =>
    request<OrderDto>("/orders", { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": crypto.randomUUID() } }),
  list: (cursor?: string | null) => request<OrderListDto>(`/orders${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  get: (number: string) => request<OrderDto>(`/orders/${encodeURIComponent(number)}`),
  cancel: (number: string) => request<OrderDto>(`/orders/${encodeURIComponent(number)}/cancel`, { method: "POST" }),
  pay: (number: string, scenario?: string) => request<{ redirect_url: string }>(`/orders/${encodeURIComponent(number)}/pay`, { method: "POST", body: JSON.stringify({ scenario }) }),
};

export const returnsApi = {
  list: () => request<{ items: ReturnDto[] }>("/orders/returns"),
  create: (number: string, itemId: number, reason: string) =>
    request<ReturnDto>(`/orders/${encodeURIComponent(number)}/returns`, { method: "POST", body: JSON.stringify({ item_id: itemId, reason }) }),
};

export const notifications = {
  list: (limit = 50) => request<{ items: NotificationDto[]; unread_count: number }>(`/notifications?limit=${limit}`),
  read: (id: number) => request<NotificationDto>(`/notifications/${id}/read`, { method: "POST" }),
  readAll: () => request<{ updated: number }>("/notifications/read-all", { method: "POST" }),
};

export function shippingMethods(province: string, subtotalToman: number): Promise<ShippingQuote[]> {
  const p = new URLSearchParams({ province, subtotal_toman: String(subtotalToman) });
  return request<ShippingQuote[]>(`/shipping/methods?${p}`);
}

/* ---------- فاز ۶–۱۲: واریانت، نظر، علاقهمندی، کوپن ---------- */
export const engagement = {
  variants: (slug: string, lang = "fa") => request<{ items: ProductDto["variants"] }>(`/catalog/products/${encodeURIComponent(slug)}/variants?lang=${lang}`),
  reviews: (slug: string) => request<{ items: NonNullable<ProductDto["reviews"]>; average: number }>(`/catalog/products/${encodeURIComponent(slug)}/reviews`),
  addReview: (slug: string, body: { rating: number; title?: string; body: string }) =>
    request<{ ok: boolean }>(`/catalog/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", body: JSON.stringify(body) }),
  wishlist: (lang = "fa") => request<{ items: ProductDto[] }>(`/catalog/wishlist?lang=${lang}`),
  wish: (slug: string) => request<{ wished: boolean }>(`/catalog/wishlist/${encodeURIComponent(slug)}`, { method: "POST" }),
  unwish: (slug: string) => request<{ wished: boolean }>(`/catalog/wishlist/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  coupon: (code: string, subtotalToman: number) =>
    request<{ code: string; discount_toman: number }>(`/pricing/coupons/validate?code=${encodeURIComponent(code)}&subtotal_toman=${subtotalToman}`),
};
