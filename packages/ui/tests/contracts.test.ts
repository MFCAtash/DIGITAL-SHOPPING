/** تست متقابل با بک‌اند: همان بردارهای contracts/*.json که backend/tests/pure/test_contracts.py اجرا می‌کند. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PROVINCES } from "../src/data/provinces";
import { parsePhone, validateAddress, type AddressInput } from "../src/lib/address";

const load = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../../contracts/${name}`, import.meta.url), "utf8")) as T;

test("استان‌ها دقیقاً همان قرارداد مشترک‌اند", () => {
  assert.deepEqual([...PROVINCES], load<string[]>("provinces.json"));
});

test("نرمال‌سازی شماره همان نتیجهٔ بک‌اند را می‌دهد", () => {
  for (const c of load<{ input: string; expected: string | null }[]>("phone-cases.json")) assert.equal(parsePhone(c.input), c.expected, JSON.stringify(c.input));
});

test("اعتبارسنجی نشانی همان فیلدهای نامعتبر بک‌اند را برمی‌گرداند", () => {
  for (const c of load<{ name: string; input: AddressInput; errors: string[] }[]>("address-cases.json")) assert.deepEqual(Object.keys(validateAddress(c.input)).sort(), c.errors, c.name);
});
