"""تست متقابل با فرانت: هر دو طرف باید روی contracts/*.json نتیجهٔ یکسان بدهند.
فرانت: packages/ui/tests/contracts.test.ts (استان‌ها، شماره، نشانی). بردار پول فعلاً فقط اینجاست (packages/money ساخته نشده)."""
import json
import unittest
from pathlib import Path

from apps.accounts.address_rules import validate_address
from apps.accounts.provinces import PROVINCES
from apps.core.persian import normalize_phone
from apps.pricing.money import final_usd_cents, to_toman

C = Path(__file__).resolve().parents[3] / "contracts"
load = lambda n: json.loads((C / n).read_text(encoding="utf-8"))  # noqa: E731


class ContractTests(unittest.TestCase):
    def test_provinces_match_contract(self):
        self.assertEqual(list(PROVINCES), load("provinces.json"))
        self.assertEqual(len(PROVINCES), 31)

    def test_phone_cases(self):
        for c in load("phone-cases.json"):
            with self.subTest(input=c["input"]):
                if c["expected"] is None:
                    with self.assertRaises(ValueError):
                        normalize_phone(c["input"])
                else:
                    self.assertEqual(normalize_phone(c["input"]), c["expected"])

    def test_address_cases(self):
        for c in load("address-cases.json"):
            with self.subTest(case=c["name"]):
                self.assertEqual(sorted(validate_address(c["input"])), c["errors"])

    def test_money_cases(self):
        m = load("money-cases.json")
        for c in m["final"]:
            with self.subTest(final=c):
                self.assertEqual(final_usd_cents(c["price"], c["discount"]), c["expected"])
        for c in m["toman"]:
            with self.subTest(toman=c):
                self.assertEqual(to_toman(c["cents"], c["rate"], c["round_to"]), c["expected"])


if __name__ == "__main__":
    unittest.main()
