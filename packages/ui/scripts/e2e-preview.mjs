// تست رفتاری در مرورگر واقعی روی preview/design-system.html (کامپوننت‌های واقعی هیدراته‌شده).
// اجرا: npm run preview && npm run e2e   (نیازمند playwright و chromium)
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL_ = pathToFileURL(join(pkg, "preview/design-system.html")).href;

let passed = 0;
const failures = [];
async function t(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`✗ ${name}\n   ${String(e.message).split("\n")[0]}`);
  }
}
const eq = (a, b, m = "") => { if (a !== b) throw new Error(`${m} انتظار «${b}»، دریافت «${a}»`); };
const ok = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(URL_);
await page.waitForSelector("#pdp");

await t("هیدراسیون بدون خطای کنسول", async () => { await page.waitForTimeout(300); eq(errors.length, 0, errors.join(" | ")); });

await t("Tabs: در RTL فلش چپ = تب بعدی، فلش راست = قبلی، Home/End", async () => {
  const tabs = page.getByRole("tab");
  await tabs.nth(0).focus();
  await page.keyboard.press("ArrowLeft");
  eq(await tabs.nth(1).getAttribute("aria-selected"), "true", "پس از ArrowLeft");
  eq(await tabs.nth(1).evaluate((el) => document.activeElement === el), true, "فوکوس");
  await page.keyboard.press("ArrowRight");
  eq(await tabs.nth(0).getAttribute("aria-selected"), "true", "پس از ArrowRight");
  await page.keyboard.press("End");
  eq(await tabs.nth(2).getAttribute("aria-selected"), "true", "End");
  await page.keyboard.press("Home");
  eq(await tabs.nth(0).getAttribute("aria-selected"), "true", "Home");
  eq(await tabs.nth(1).getAttribute("tabindex"), "-1", "roving tabindex");
});

await t("Tabs → تاریخچهٔ قیمت: نمودار با نام و جدول جایگزین", async () => {
  await page.getByRole("tab", { name: "تاریخچهٔ قیمت" }).click();
  const svg = page.getByRole("img", { name: /تاریخچهٔ قیمت: کمترین/ });
  ok(await svg.isVisible(), "نمودار دیده نشد");
  await page.getByText("جدول مقادیر").click();
  eq(await page.locator(".cx-chart__data tbody tr").count(), 4);
});

await t("Accordion: تک‌بازشو و aria-expanded", async () => {
  await page.getByRole("tab", { name: "پرسش‌ها" }).click();
  const [a, b] = [page.getByRole("button", { name: "گارانتی چند ماهه است؟" }), page.getByRole("button", { name: "امکان تعویض هست؟" })];
  eq(await a.getAttribute("aria-expanded"), "true");
  await b.click();
  eq(await b.getAttribute("aria-expanded"), "true");
  eq(await a.getAttribute("aria-expanded"), "false", "حالت single باید اولی را ببندد");
  await page.getByRole("tab", { name: "مشخصات فنی" }).click();
});

await t("Combobox استان: فیلتر فارسی، ↓ و Enter", async () => {
  const input = page.getByRole("combobox", { name: "استان" }).first();
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await input.fill("فا");
  const opts = page.getByRole("option");
  ok((await opts.filter({ hasText: "فارس" }).count()) >= 1, "گزینهٔ فارس نیامد");
  eq(await input.getAttribute("aria-expanded"), "true");
  await page.keyboard.press("ArrowDown");
  const active = await input.getAttribute("aria-activedescendant");
  ok(!!active, "activedescendant تنظیم نشد");
  await page.keyboard.press("Enter");
  eq(await input.inputValue(), "فارس");
  eq(await input.getAttribute("aria-expanded"), "false");
});

await t("Combobox: Escape می‌بندد و ی/ک عربی نرمال می‌شود", async () => {
  const input = page.getByRole("combobox", { name: "استان" }).first();
  await input.fill("");
  await input.fill("اصفهان".replace("ا", "ا")); // پایه
  await page.keyboard.press("Escape");
  eq(await input.getAttribute("aria-expanded"), "false");
  await input.fill("خراسان رضوي"); // «ي» عربی
  ok((await page.getByRole("option").filter({ hasText: "خراسان رضوی" }).count()) >= 1, "نرمال‌سازی ی عربی کار نکرد");
});

await t("SearchBox: پیشنهاد و Enter", async () => {
  const input = page.getByRole("combobox", { name: "جست‌وجو در فروشگاه" });
  await input.click();
  await input.fill("Samsung");
  ok((await page.locator("[role=search] [role=option]").count()) >= 1, "پیشنهادی نیامد");
  await page.keyboard.press("Escape");
});

await t("Gallery: بعدی/قبلی و شمارنده فارسی", async () => {
  const count = page.locator(".cx-gallery__count");
  eq((await count.textContent()).trim(), "۱ از ۴");
  await page.getByRole("button", { name: "تصویر بعدی" }).click();
  eq((await count.textContent()).trim(), "۲ از ۴");
  await page.getByRole("button", { name: "تصویر قبلی" }).click();
  await page.getByRole("button", { name: "تصویر قبلی" }).click(); // حلقه
  eq((await count.textContent()).trim(), "۴ از ۴");
  eq(await page.locator(".cx-gallery__thumb[aria-current=true]").count(), 1);
});

await t("Gallery: دکمهٔ «بعدی» در RTL سمت چپ و «قبلی» سمت راست است", async () => {
  const next = await page.getByRole("button", { name: "تصویر بعدی" }).boundingBox();
  const prev = await page.getByRole("button", { name: "تصویر قبلی" }).boundingBox();
  // طبق رابطهٔ نمایش: next در inline-end (RTL ⇒ چپ)
  ok(next.x < prev.x, `next.x=${next.x} باید کوچک‌تر از prev.x=${prev.x} باشد`);
});

await t("زوم گالری: Modal بومی باز می‌شود و Esc می‌بندد", async () => {
  await page.getByRole("button", { name: "بزرگ‌نمایی" }).click();
  ok(await page.locator("dialog[open]").count() === 1, "دیالوگ باز نشد");
  await page.keyboard.press("Escape");
  eq(await page.locator("dialog[open]").count(), 0);
});

await t("Modal: فوکوس داخل دیالوگ، Esc، بازگشت فوکوس به دکمه", async () => {
  const trigger = page.getByRole("button", { name: "باز کردن پنجرهٔ گفتگو" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const dlg = page.getByRole("dialog", { name: "حذف از سبد" });
  ok(await dlg.isVisible(), "دیالوگ دیده نشد");
  ok(await dlg.evaluate((d) => d.contains(document.activeElement)), "فوکوس داخل دیالوگ نیست");
  ok(await page.evaluate(() => document.documentElement.style.overflow === "hidden"), "اسکرول قفل نشد");
  await page.keyboard.press("Escape");
  // بسته شدن dialog و بازگشت فوکوس میتواند یک فریم طول بکشد؛ قبل از assert صبر میکنیم.
  await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0, null, { timeout: 3000 }).catch(() => undefined);
  await page.waitForFunction(() => document.documentElement.style.overflow !== "hidden", null, { timeout: 3000 }).catch(() => undefined);
  eq(await page.locator("dialog[open]").count(), 0);
  ok(await trigger.evaluate((el) => document.activeElement === el), "فوکوس به دکمه برنگشت");
  ok(await page.evaluate(() => document.documentElement.style.overflow !== "hidden"), "قفل اسکرول آزاد نشد");
});

await t("MiniCart: تعداد، سقف، حذف، جمع", async () => {
  await page.getByRole("button", { name: "سبد خرید", exact: true }).click();
  const dlg = page.getByRole("dialog");
  ok(await dlg.isVisible());
  const plus = dlg.getByRole("button", { name: /^افزودن تعداد/ }).first();
  const input = dlg.getByRole("textbox").first();
  const before = await input.inputValue();
  await plus.click();
  ok((await input.inputValue()) !== before, "تعداد زیاد نشد");
  await dlg.getByRole("button", { name: /^حذف .* از سبد$/ }).first().click();
  eq(await dlg.locator(".cx-minicart__line").count(), 1);
  await dlg.getByRole("button", { name: /^حذف .* از سبد$/ }).first().click();
  ok(await dlg.getByText("سبد خرید خالی است").isVisible(), "حالت خالی نیامد");
  await page.keyboard.press("Escape");
});

await t("OTP: تایپ تک‌رقم با رفتن به خانهٔ بعد، Backspace، autofill کل کد", async () => {
  const cells = page.getByLabel(/^رقم \d+ از ۶$|^رقم [۰-۹]+ از ۶$/);
  await cells.nth(0).scrollIntoViewIfNeeded();
  await cells.nth(0).click();
  await page.keyboard.type("12");
  eq(await cells.nth(0).inputValue(), "۱");
  eq(await cells.nth(1).inputValue(), "۲");
  ok(await cells.nth(2).evaluate((el) => document.activeElement === el), "فوکوس به خانهٔ سوم نرفت");
  await page.keyboard.press("Backspace");
  eq(await cells.nth(1).inputValue(), "", "Backspace باید خانهٔ قبلی را پاک کند");
  await cells.nth(0).click();
  await page.keyboard.insertText("۹۸۷۶۵۴"); // شبیه autofill پیامک با ارقام فارسی
  const got = await page.getByTestId("otp-out").textContent();
  ok(got.includes("987654"), `کد کامل ثبت نشد: ${got}`);
  eq(await cells.nth(5).inputValue(), "۴");
});

await t("OTP: autocomplete فقط روی خانهٔ اول و چینش LTR", async () => {
  const cells = page.locator(".cx-otp__cell");
  eq(await cells.first().getAttribute("autocomplete"), "one-time-code");
  eq(await cells.nth(1).getAttribute("autocomplete"), "off");
  eq(await page.locator(".cx-otp__cells").getAttribute("dir"), "ltr");
  const x0 = (await cells.nth(0).boundingBox()).x, x5 = (await cells.nth(5).boundingBox()).x;
  ok(x0 < x5, "خانهٔ اول باید چپ‌ترین باشد");
});

await t("Switch و تم تاریک: متغیرها عوض می‌شوند", async () => {
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await bg();
  const sw = page.getByRole("switch", { name: "تاریک" });
  await sw.click();
  eq(await sw.getAttribute("aria-checked"), "true");
  eq(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  ok((await bg()) !== light, "پس‌زمینه عوض نشد");
  eq(await bg(), "rgb(11, 16, 32)", "باید پسزمینهٔ تاریک #0B1020 مطابق توکن فعلی باشد");
  await sw.click();
  eq(await bg(), light);
});

await t("Pagination: کلیک صفحه و aria-current", async () => {
  const nav = page.getByRole("navigation", { name: "صفحه‌بندی" });
  await nav.scrollIntoViewIfNeeded();
  await nav.getByRole("button", { name: "صفحهٔ ۴" }).click();
  eq(await nav.locator("[aria-current=page]").textContent(), "۴");
  await nav.getByRole("button", { name: "صفحهٔ بعد" }).click();
  eq(await nav.locator("[aria-current=page]").textContent(), "۵");
});

await t("جدول مقایسه: «فقط تفاوت‌ها» سطرها را کم می‌کند", async () => {
  const region = page.getByRole("region", { name: "مقایسهٔ مشخصات کالاها" });
  await region.scrollIntoViewIfNeeded();
  const rows = () => region.locator("tbody tr").count();
  const all = await rows();
  await page.getByLabel("فقط تفاوت‌ها").check();
  ok((await rows()) <= all, "سطرها کم نشد");
  ok((await region.locator("tr[data-differs]").count()) === (await rows()) || (await region.getByText("همهٔ مشخصات یکسان است.").count()) === 1, "فقط سطرهای متفاوت باید بمانند");
});

await t("AddressForm: ثبت خالی ⇒ خطا با آیکون و فوکوس روی اولین فیلد نامعتبر", async () => {
  await page.getByRole("button", { name: "ذخیرهٔ نشانی" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "ذخیرهٔ نشانی" }).click();
  const name = page.getByLabel(/^نام و نام خانوادگی گیرنده/);
  ok(await name.evaluate((el) => document.activeElement === el), "فوکوس به نام گیرنده نرفت");
  eq(await name.getAttribute("aria-invalid"), "true");
  ok(await page.getByText("شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.").isVisible());
  ok(await page.getByText("کد پستی باید ۱۰ رقم باشد.").isVisible());
  // اصلاح با تایپ، خطا همان لحظه برطرف می‌شود
  await name.fill("علی رضایی");
  eq(await name.getAttribute("aria-invalid"), null);
});

await t("AddressForm: کد پستی با ارقام فارسی نرمال و ۵-۵ نمایش داده می‌شود", async () => {
  const postal = page.getByLabel(/^کد پستی/);
  await postal.fill("۱۲۳۴۵۶۷۸۹۰");
  eq(await postal.inputValue(), "12345-67890");
});

await t("Toast: خطا role=alert و خودکار بسته نمی‌شود", async () => {
  await page.getByRole("button", { name: "اعلان خطا" }).click();
  const toast = page.getByRole("alert").filter({ hasText: "پرداخت ناموفق بود" });
  ok(await toast.isVisible());
  await page.waitForTimeout(1500);
  ok(await toast.isVisible(), "اعلان خطا نباید خودکار بسته شود");
  await toast.getByRole("button", { name: "بستن اعلان" }).click();
  eq(await toast.count(), 0);
});

await t("آیکون‌دکمه‌ها همه نام دسترس‌پذیر دارند و تصاویر alt دارند", async () => {
  const bad = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !(b.getAttribute("aria-label") || b.textContent.trim())).length);
  eq(bad, 0, "دکمهٔ بی‌نام");
  const noAlt = await page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length);
  eq(noAlt, 0, "تصویر بدون alt");
});

await t("کارت کالا: کل کارت با کیبورد قابل‌دسترس و حلقهٔ فوکوس دیده می‌شود", async () => {
  const link = page.locator(".cx-card__link").first();
  await link.scrollIntoViewIfNeeded();
  await page.keyboard.press("Shift"); // تعامل کیبوردی تا :focus-visible فعال شود
  await link.focus();
  const outline = await page.locator(".cx-card").first().evaluate((el) => getComputedStyle(el).outlineStyle);
  eq(outline, "solid", "حلقهٔ فوکوس کارت");
});

await t("هیچ ویژگی ممنوع طراحی در استایل‌های نهایی نیست (گرادیان/سایه/blur)", async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const s = getComputedStyle(el);
      if (/gradient/.test(s.backgroundImage) || s.boxShadow !== "none" || s.backdropFilter !== "none" || /blur/.test(s.filter)) out.push(el.className || el.tagName);
      if (out.length > 5) break;
    }
    return out;
  });
  eq(bad.length, 0, `عناصر متخلف: ${bad.join(", ")}`);
});

// ---- موبایل
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", hasTouch: true, isMobile: true });
const mp = await m.newPage();
await mp.goto(URL_);
await mp.waitForSelector("#pdp");

await t("موبایل ۳۹۰px: اسکرول افقی صفحه وجود ندارد", async () => {
  const w = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(w[0] <= w[1], `scrollWidth=${w[0]} > innerWidth=${w[1]}`);
});

await t("موبایل: دکمهٔ فیلتر ← Sheet از پایین با دکمهٔ «نمایش N کالا»", async () => {
  await mp.getByRole("button", { name: "فیلترها" }).first().click();
  const dlg = mp.getByRole("dialog", { name: "فیلترها" });
  ok(await dlg.isVisible());
  const box = await dlg.boundingBox();
  ok(box.y + box.height >= 843, "Sheet باید به پایین صفحه بچسبد");
  ok(await dlg.getByRole("button", { name: /^نمایش .* کالا$/ }).isVisible());
  await mp.keyboard.press("Escape");
});

await t("موبایل: اهداف لمسی دکمه‌ها ≥ ۴۴px", async () => {
  const small = await mp.evaluate(() => [...document.querySelectorAll(".cx-btn:not(.cx-btn--sm)")].filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 43.5 || b.getBoundingClientRect().width < 43.5)).map((b) => b.textContent.trim() || b.getAttribute("aria-label")));
  eq(small.length, 0, `اهداف کوچک: ${small.join("، ")}`);
});

await browser.close();
console.log(`\n${passed} قبول، ${failures.length} رد`);
if (failures.length) { console.log(failures.map((f) => ` - ${f}`).join("\n")); process.exit(1); }
