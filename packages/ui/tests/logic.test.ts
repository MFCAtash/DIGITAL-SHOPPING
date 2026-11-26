import assert from "node:assert/strict";
import { test } from "node:test";
import { AddressInput, formatPostalCode, normalizePhone, normalizePostalCode, validateAddress } from "../src/lib/address";
import { buildStepChart } from "../src/lib/chart";
import { diffRows, onlyDifferences } from "../src/lib/compare";
import { remainingSeconds, shouldAnnounce, urgency } from "../src/lib/countdown";
import { moveActive, nextIndex } from "../src/lib/keys";
import { timelineSteps } from "../src/lib/order-timeline";
import { applyBackspace, applyInput, emptyOtp, otpComplete, otpString, sanitizeOtp } from "../src/lib/otp";
import { pageRange } from "../src/lib/pagination";
import { isStale, priceState } from "../src/lib/price-state";
import { clampQty, parseQty } from "../src/lib/qty";
import { stockLevel } from "../src/lib/stock";
import { swipeToStep } from "../src/lib/swipe";
import { MAX_TOASTS, toastReducer, type ToastItem } from "../src/lib/toast";
import { PROVINCES } from "../src/data/provinces";

test("ناوبری کیبورد: در RTL فلش چپ = بعدی", () => {
  assert.equal(nextIndex({ key: "ArrowLeft", index: 0, count: 3, dir: "rtl" }), 1);
  assert.equal(nextIndex({ key: "ArrowRight", index: 0, count: 3, dir: "rtl" }), 2); // حلقه به آخر
  assert.equal(nextIndex({ key: "ArrowRight", index: 0, count: 3, dir: "ltr" }), 1);
  assert.equal(nextIndex({ key: "ArrowLeft", index: 0, count: 3, dir: "ltr", loop: false }), 0);
  assert.equal(nextIndex({ key: "Home", index: 2, count: 3 }), 0);
  assert.equal(nextIndex({ key: "End", index: 0, count: 3 }), 2);
  assert.equal(nextIndex({ key: "a", index: 0, count: 3 }), null);
  assert.equal(nextIndex({ key: "ArrowDown", index: 0, count: 3, orientation: "vertical" }), 1);
  assert.equal(nextIndex({ key: "ArrowLeft", index: 0, count: 0 }), null);
});

test("حرکت گزینهٔ فعال combobox", () => {
  assert.equal(moveActive(-1, 1, 3), 0);
  assert.equal(moveActive(-1, -1, 3), 2);
  assert.equal(moveActive(2, 1, 3), 0);
  assert.equal(moveActive(0, -1, 3), 2);
  assert.equal(moveActive(2, 1, 3, false), 2);
  assert.equal(moveActive(0, 1, 0), -1);
});

test("OTP: تایپ، چسباندن، autofill، backspace", () => {
  assert.equal(sanitizeOtp("۱۲ ۳-۴۵۶۷۸"), "123456");
  let v = emptyOtp();
  let e = applyInput(v, 0, "1");
  assert.deepEqual([e.value[0], e.focus], ["1", 1]);
  e = applyInput(emptyOtp(), 0, "۱۲۳۴۵۶"); // autofill پیامک
  assert.equal(otpString(e.value), "123456");
  assert.equal(e.focus, 5);
  assert.ok(otpComplete(e.value));
  e = applyInput(emptyOtp(), 3, "98765"); // چسباندن از وسط: فقط تا انتها
  assert.equal(otpString(e.value), "987");
  e = applyInput(["1", "2", "", "", "", ""], 1, "x"); // ورودی نامعتبر خانه را پاک می‌کند
  assert.deepEqual(e.value.slice(0, 2), ["1", ""]);
  v = ["1", "2", "3", "", "", ""];
  e = applyBackspace(v, 2);
  assert.deepEqual([e.value[2], e.focus], ["", 2]); // خانهٔ پر: همان را پاک کن
  e = applyBackspace(e.value, 2);
  assert.deepEqual([e.value[1], e.focus], ["", 1]); // خانهٔ خالی: قبلی را پاک و برو عقب
  e = applyBackspace(emptyOtp(), 0);
  assert.equal(e.focus, 0);
});

test("تعداد", () => {
  assert.equal(clampQty(0), 1);
  assert.equal(clampQty(9, 1, 3), 3);
  assert.equal(clampQty(2.9), 2);
  assert.equal(clampQty(Number.NaN), 1);
  assert.equal(parseQty("۳"), 3);
  assert.equal(parseQty("abc"), 1);
  assert.equal(parseQty("۹۹", 1, 5), 5);
});

test("صفحه‌بندی", () => {
  assert.deepEqual(pageRange(1, 1), [1]);
  assert.deepEqual(pageRange(1, 5), [1, 2, "gap", 5]);
  assert.deepEqual(pageRange(1, 4), [1, 2, 3, 4]); // فاصلهٔ یک‌صفحه‌ای با خود صفحه پر می‌شود
  assert.deepEqual(pageRange(2, 2), [1, 2]);
  assert.deepEqual(pageRange(1, 10), [1, 2, "gap", 10]);
  assert.deepEqual(pageRange(5, 10), [1, "gap", 4, 5, 6, "gap", 10]);
  assert.deepEqual(pageRange(10, 10), [1, "gap", 9, 10]);
  assert.deepEqual(pageRange(3, 10), [1, 2, 3, 4, "gap", 10]);
  assert.deepEqual(pageRange(99, 4), [1, 2, 3, 4]);
  assert.deepEqual(pageRange(1, 0), []);
});

test("مقایسه: تفاوت‌ها", () => {
  const rows = diffRows([
    { key: "ram", label: "رم", values: [8, 12, 8] },
    { key: "os", label: "سیستم‌عامل", values: ["Android", "android", " ANDROID "] },
    { key: "nfc", label: "NFC", values: [true, null, true] },
  ]);
  assert.deepEqual(rows.map((r) => r.differs), [true, false, true]);
  assert.deepEqual(onlyDifferences(rows).map((r) => r.key), ["ram", "nfc"]);
});

test("حالت قیمت", () => {
  const today = new Date("2026-11-15T10:00:00Z");
  assert.equal(priceState({ priceCents: null, finalCents: null }, today).kind, "contact");
  const exact = priceState({ priceCents: 10000, finalCents: 9000, discountPercent: 10, checkedOn: "2026-11-15" }, today);
  assert.deepEqual([exact.kind, exact.hasDiscount, exact.stale], ["exact", true, false]);
  assert.equal(priceState({ priceCents: 10000, finalCents: 10000, note: "approx", checkedOn: "2026-11-15" }, today).indicative, true);
  assert.equal(priceState({ priceCents: 10000, finalCents: 10000, note: "from" }, today).kind, "from");
  assert.equal(priceState({ priceCents: 10000, finalCents: 10000, discountPercent: 0 }, today).hasDiscount, false);
  // مرز دقیق ۷ روز (هم‌منطق با بک‌اند)
  assert.equal(isStale("2026-11-08", today, 7), false);
  assert.equal(isStale("2026-11-07", today, 7), true);
  assert.equal(isStale("2026-10-11", today, 7), true);
  assert.equal(isStale(null, today), true);
  assert.equal(isStale("garbage", today), true);
});

test("موجودی", () => {
  assert.equal(stockLevel(10, true), "in");
  assert.equal(stockLevel(3, true), "low");
  assert.equal(stockLevel(1, true), "low");
  assert.equal(stockLevel(0, true), "out");
  assert.equal(stockLevel(50, false), "unavailable");
});

test("شمارندهٔ رزرو", () => {
  const now = Date.parse("2026-11-15T10:00:00Z");
  assert.equal(remainingSeconds("2026-11-15T10:15:00Z", now), 900);
  assert.equal(remainingSeconds("2026-11-15T09:00:00Z", now), 0);
  assert.equal(remainingSeconds("not a date", now), 0);
  assert.equal(urgency(500), "normal");
  assert.equal(urgency(120), "warn");
  assert.equal(urgency(0), "expired");
  assert.deepEqual([900, 899, 60, 30, 10, 0].map(shouldAnnounce), [true, false, true, true, true, true]);
});

test("خط زمان سفارش", () => {
  const states = (s: Parameters<typeof timelineSteps>[0]) => timelineSteps(s).map((x) => x.state);
  assert.deepEqual(states("pending"), ["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(states("shipped"), ["done", "done", "done", "current", "upcoming"]);
  assert.deepEqual(states("delivered"), ["done", "done", "done", "done", "current"]);
  const nr = timelineSteps("needs_review");
  assert.deepEqual([nr.length, nr[1]!.tone], [2, "warning"]);
  assert.equal(timelineSteps("cancelled")[1]!.tone, "danger");
  assert.equal(timelineSteps("refunded")[1]!.status, "refunded");
});

test("نمودار پلکانی", () => {
  assert.equal(buildStepChart([], 100, 50).d, "");
  const one = buildStepChart([{ label: "a", t: 1, v: 5 }], 100, 50);
  assert.equal(one.points.length, 1);
  assert.equal(one.points[0]!.x, 50);
  const g = buildStepChart(
    [
      { label: "b", t: 200, v: 90 },
      { label: "a", t: 0, v: 100 },
      { label: "c", t: 100, v: 100 },
    ],
    208,
    108,
    4,
  );
  assert.deepEqual(g.points.map((p) => p.label), ["a", "c", "b"]); // مرتب‌سازی بر پایهٔ زمان
  assert.equal(g.min, 90);
  assert.equal(g.max, 100);
  assert.match(g.d, /^M4 4 H104 V4 H204 V104 H204$/);
  for (const p of g.points) assert.ok(p.x >= 4 && p.x <= 204 && p.y >= 4 && p.y <= 104);
});

test("کشیدن انگشت در RTL و LTR", () => {
  assert.equal(swipeToStep(80, 5, "rtl"), 1);
  assert.equal(swipeToStep(-80, 5, "rtl"), -1);
  assert.equal(swipeToStep(-80, 5, "ltr"), 1);
  assert.equal(swipeToStep(10, 0), null); // کوتاه
  assert.equal(swipeToStep(60, 60), null); // بیشتر عمودی
});

test("toast reducer", () => {
  const mk = (id: number): ToastItem => ({ id, message: "m", tone: "info", duration: 5000 });
  let s: ToastItem[] = [];
  for (const id of [1, 2, 3, 4]) s = toastReducer(s, { type: "add", toast: mk(id) });
  assert.equal(s.length, MAX_TOASTS);
  assert.deepEqual(s.map((t) => t.id), [2, 3, 4]); // قدیمی‌ترین حذف می‌شود
  s = toastReducer(s, { type: "dismiss", id: 3 });
  assert.deepEqual(s.map((t) => t.id), [2, 4]);
  assert.deepEqual(toastReducer(s, { type: "clear" }), []);
});

const ok: AddressInput = {
  receiverName: "علی رضایی",
  receiverPhone: "۰۹۱۲۳۴۵۶۷۸۹",
  province: "تهران",
  city: "تهران",
  postalCode: "۱۲۳۴۵۶۷۸۹۰",
  street: "خیابان ولیعصر، کوچهٔ دوم",
};

test("اعتبارسنجی آدرس", () => {
  assert.deepEqual(validateAddress(ok), {});
  assert.equal(PROVINCES.length, 31);
  assert.deepEqual(Object.keys(validateAddress({ ...ok, receiverName: "ع", receiverPhone: "123", province: "x", city: "", postalCode: "12", street: "ab" })).sort(), [
    "city", "postalCode", "province", "receiverName", "receiverPhone", "street",
  ]);
  assert.equal(validateAddress({ ...ok, receiverPhone: "+98 912 345 6789" }).receiverPhone, undefined); // +98 → 0
  assert.equal(normalizePhone("0098 912-345-6789"), "09123456789");
  assert.equal(normalizePostalCode("۱۲۳۴۵-۶۷۸۹۰۱۲"), "1234567890");
  assert.equal(formatPostalCode("1234567890"), "12345-67890");
  assert.equal(formatPostalCode("123"), "123");
});
