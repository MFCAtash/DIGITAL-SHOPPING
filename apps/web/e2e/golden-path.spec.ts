import { expect, test } from "@playwright/test";

/** مسیر طلایی خرید با API شبیهسازی شده: مستقل از بکاند و قابل اجرا در CI. */
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

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    let body: unknown = {};
    if (p.includes("/catalog/categories")) body = [{ slug: "phones", name: "گوشی" }];
    else if (p.includes("/catalog/products/") && !p.includes("/variants") && !p.includes("/reviews")) body = product;
    else if (p.includes("/variants")) body = { items: [] };
    else if (p.includes("/reviews")) body = { items: [], average: 0 };
    else if (p.includes("/catalog/products")) body = { count: 1, items: [product] };
    else if (p.endsWith("/cart") || p.includes("/cart/items")) body = { lines: [], count: 0, subtotal_toman: 0, notices: [] };
    else if (p.includes("/auth/me")) body = null;
    else if (p.includes("/auth/csrf")) body = { csrf_token: "test-token" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
});

test("خانه و فهرست کالا بارگذاری میشوند", async ({ page }) => {
  await page.goto("/");
  // عنوان اصلی بهصورت مخفی (cx-sr-only) در DOM قرار دارد و توسط صفحهخوان خوانده میشود.
  await expect(page.locator("h1").first()).toContainText("تکنولوژی اصیل");
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "همهٔ کالاها" })).toBeVisible();
});

test("صفحهٔ محصول و دکمهٔ افزودن به سبد موجودند", async ({ page }) => {
  await page.goto("/products/sample-phone");
  await expect(page.getByRole("heading", { name: "گوشی نمونه" })).toBeVisible();
  await expect(page.getByRole("button", { name: /افزودن.*سبد/ }).first()).toBeVisible();
});

test("سبد خالی پیام مناسب نشان میدهد", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText("سبد خرید خالی است")).toBeVisible();
});

test("رابط انگلیسی بدون متن فارسی نمایش داده میشود", async ({ page }) => {
  const base = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? "3000"}`;
  await page.context().addCookies([{ name: "cx_locale", value: "en", url: base }]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1").first()).toContainText("Genuine Tech");
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Shopping cart" })).toBeVisible();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});
