#!/usr/bin/env node
/**
 * Regenerate docs/screenshots/*.webp from a running storefront.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 E2E_CHANNEL=chrome node scripts/capture-screenshots.mjs
 *
 * Requires the backend (with seeded catalogue) and the web server to be up.
 * Playwright and sharp are resolved from apps/web and packages/ui respectively.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const webPackage = path.join(root, "apps/web/package.json");
const uiPackage = path.join(root, "packages/ui/package.json");
const { chromium } = createRequire(fs.existsSync(webPackage) ? webPackage : path.join(root, "package.json"))("playwright");
const sharp = createRequire(fs.existsSync(uiPackage) ? uiPackage : path.join(root, "package.json"))("sharp");

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(root, "docs/screenshots");
fs.mkdirSync(out, { recursive: true });
const channel = process.env.E2E_CHANNEL || undefined;

const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addCookies([{ name: "cx_locale", value: "fa", url: base }]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

async function shot(name, route, { theme, wait = 1400, action } = {}) {
  await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  if (action) await action(page);
  await page.waitForTimeout(wait);
  const png = await page.screenshot({ type: "png" });
  const file = path.join(out, name + ".webp");
  await sharp(png).webp({ quality: 82, effort: 5 }).toFile(file);
  console.log(name, fs.statSync(file).size);
}

await shot("01-home-fa-nebula", "/");
await shot("02-home-fa-light", "/", { theme: "paper" });
await shot("03-home-fa-dark", "/", { theme: "midnight" });

await page.evaluate(() => { document.cookie = "cx_locale=en; path=/; max-age=31536000"; });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
{
  const file = path.join(out, "04-home-en.webp");
  await sharp(await page.screenshot({ type: "png" })).webp({ quality: 82 }).toFile(file);
  console.log("04-home-en", fs.statSync(file).size);
}

await ctx.addCookies([{ name: "cx_locale", value: "fa", url: base }]);
await shot("05-catalog-fa", "/products");
await shot("06-product-gta-fa", "/products/grand-theft-auto-vi");
await shot("07-cart-fa", "/cart");
await shot("08-checkout-fa", "/checkout");
await shot("09-cart-toast-fa", "/products", {
  wait: 700,
  action: async (p) => {
    const btn = p.locator(".cx-card .cx-btn--primary").first();
    await btn.waitFor({ timeout: 10000 });
    await btn.click();
  },
});

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await mobile.addCookies([{ name: "cx_locale", value: "fa", url: base }]);
const mp = await mobile.newPage();
await mp.goto(base + "/", { waitUntil: "domcontentloaded" });
await mp.waitForTimeout(1600);
const mobileFile = path.join(out, "10-mobile-home-fa.webp");
await sharp(await mp.screenshot({ type: "png" })).webp({ quality: 82 }).toFile(mobileFile);
console.log("10-mobile-home-fa", fs.statSync(mobileFile).size);

await browser.close();
if (errors.length) console.error("Page errors:", errors.slice(0, 3));
console.log("Screenshots written to", out);
