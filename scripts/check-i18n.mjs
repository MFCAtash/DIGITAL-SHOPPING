#!/usr/bin/env node
/**
 * Regression guard for the English locale.
 *
 * Opens every public route with cx_locale=en in a real browser and fails if any
 * Persian character is visible after hydration. Browser checks are used instead
 * of raw HTML because client components render a server-side fallback before the
 * locale context is hydrated.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 node scripts/check-i18n.mjs
 *   E2E_CHANNEL=chrome BASE_URL=http://127.0.0.1:3000 node scripts/check-i18n.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const localPackage = path.join(process.cwd(), "apps/web/package.json");
const requireFrom = fs.existsSync(localPackage) ? localPackage : path.join(process.cwd(), "package.json");
const { chromium } = createRequire(requireFrom)("playwright");

const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const channel = process.env.E2E_CHANNEL || undefined;
const routes = [
  "/",
  "/products",
  "/products/grand-theft-auto-vi",
  "/cart",
  "/checkout",
  "/account",
  "/account/orders",
  "/account/addresses",
  "/account/wishlist",
  "/account/notifications",
  "/compare",
  "/design",
  "/forgot-password",
  "/password-reset",
];

const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addCookies([{ name: "cx_locale", value: "en", url: base }]);
const page = await context.newPage();
const persian = /[\u0600-\u06FF]/;
let failed = false;

for (const route of routes) {
  try {
    const response = await page.goto(base + route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(250);
    const text = await page.evaluate(() => document.body.innerText);
    const found = text.match(persian);
    if (!response || !response.ok()) {
      console.error(`FAIL ${route} — HTTP ${response ? response.status() : "no response"}`);
      failed = true;
    } else if (found) {
      const at = text.indexOf(found[0]);
      console.error(`FAIL ${route} — ${found[0]} near: ${text.slice(Math.max(0, at - 70), at + 70).replace(/\s+/g, " ")}`);
      failed = true;
    } else {
      console.log(`ok   ${route}`);
    }
  } catch (error) {
    console.error(`FAIL ${route} — ${error.message}`);
    failed = true;
  }
}

await browser.close();
if (failed) {
  console.error("\nEnglish locale regression detected.");
  process.exit(1);
}
console.log(`\nAll ${routes.length} routes are free of visible Persian text in en mode.`);
