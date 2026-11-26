import assert from "node:assert/strict";
import { test } from "node:test";
import { formatClock, formatJalali, formatNumber, formatToman, formatUsdCents, toEnDigits, toFaDigits } from "../src/lib/format";

test("ارقام فارسی و برگشت", () => {
  assert.equal(toFaDigits("0123456789"), "۰۱۲۳۴۵۶۷۸۹");
  assert.equal(toFaDigits(1405), "۱۴۰۵");
  assert.equal(toEnDigits("۰۹۱۲٣٤٥"), "0912345");
  assert.equal(toEnDigits("abc ۱۲"), "abc 12");
});

test("تومان با جداکنندهٔ هزارگان", () => {
  assert.equal(formatToman(12_500_000), "۱۲٬۵۰۰٬۰۰۰ تومان");
  assert.equal(formatToman(999), "۹۹۹ تومان");
  assert.equal(formatToman(1000), "۱٬۰۰۰ تومان");
  assert.equal(formatToman(0), "۰ تومان");
  assert.equal(formatToman(12_500_000, { unit: false }), "۱۲٬۵۰۰٬۰۰۰");
  assert.equal(formatToman(null), "—");
  assert.equal(formatToman(Number.NaN), "—");
  assert.equal(formatNumber(-1234567), "-۱٬۲۳۴٬۵۶۷");
});

test("دلار هم‌منطق با overlay/usd.ts", () => {
  assert.equal(formatUsdCents(129_900), "$1,299");
  assert.equal(formatUsdCents(23_950), "$239.50");
  assert.equal(formatUsdCents(5), "$0.05");
  assert.equal(formatUsdCents(null), "—");
});

test("تایمر", () => {
  assert.equal(formatClock(899), "۱۴:۵۹");
  assert.equal(formatClock(0), "۰۰:۰۰");
  assert.equal(formatClock(-5), "۰۰:۰۰");
  assert.equal(formatClock(3600), "۶۰:۰۰");
});

test("تاریخ شمسی", () => {
  // ۲۰۲۶-۱۱-۱۵ = ۲۴ آبان ۱۴۰۵
  assert.equal(formatJalali("2026-11-15T09:00:00Z"), "۱۴۰۵/۸/۲۴");
  assert.match(formatJalali("2026-11-15T09:00:00Z", "long"), /آبان/);
});
