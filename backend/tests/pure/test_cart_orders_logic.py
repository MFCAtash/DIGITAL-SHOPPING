import unittest

from apps.cart.merge import line_warnings, max_qty, merge_lines
from apps.orders.cursor import decode_cursor, encode_cursor
from apps.orders.numbering import ALPHABET, is_valid_order_number, new_order_number
from apps.orders.shipping import ShippingRule, quote
from apps.pricing.totals import compute_totals


class MaxQtyTests(unittest.TestCase):
    def test_high_value_capped_at_two(self):
        self.assertEqual(max_qty(129_900_00), 2)
        self.assertEqual(max_qty(50_000), 2)       # دقیقاً ۵۰۰ دلار ⇒ گران‌قیمت
        self.assertEqual(max_qty(49_999), 10)
        self.assertEqual(max_qty(None), 10)
        self.assertEqual(max_qty(60_000, high_value_max=3), 3)


class MergeTests(unittest.TestCase):
    cap = staticmethod(lambda pid: 2 if pid == 1 else 10)

    def test_sums_and_caps(self):
        self.assertEqual(merge_lines({1: 1, 2: 4}, {1: 2, 2: 3, 3: 1}, self.cap), {1: 2, 2: 7, 3: 1})

    def test_inputs_not_mutated_and_empty_ok(self):
        a, b = {1: 1}, {1: 1}
        merge_lines(a, b, self.cap)
        self.assertEqual((a, b), ({1: 1}, {1: 1}))
        self.assertEqual(merge_lines({}, {}, self.cap), {})

    def test_non_positive_dropped(self):
        self.assertEqual(merge_lines({1: 0, 2: -3}, {3: 1}, self.cap), {3: 1})

    def test_cap_applies_to_user_cart_alone(self):
        self.assertEqual(merge_lines({1: 5}, {}, self.cap), {1: 2})


class WarningTests(unittest.TestCase):
    def w(self, **o):
        base = dict(seen_cents=100, current_cents=100, qty=1, stock=5, purchasable=True)
        return [x.code for x in line_warnings(**{**base, **o})]

    def test_clean(self):
        self.assertEqual(self.w(), [])

    def test_price_changed_both_directions(self):
        self.assertEqual(self.w(current_cents=120), ["price_changed"])
        self.assertEqual(self.w(current_cents=80), ["price_changed"])
        self.assertEqual(self.w(seen_cents=None, current_cents=80), [])

    def test_stock(self):
        self.assertEqual(self.w(qty=3, stock=2), ["stock_low"])
        self.assertEqual(self.w(stock=0), ["out_of_stock"])
        self.assertIn("۲", line_warnings(seen_cents=1, current_cents=1, qty=3, stock=2, purchasable=True)[0].message)

    def test_no_unavailable_message(self):
        # پیام «قابل خرید نیست» حذف شد؛ پرچم purchasable دیگر مانع سبد نمیشود.
        self.assertEqual(self.w(purchasable=False, seen_cents=999, current_cents=999), [])
        self.assertEqual(self.w(current_cents=None), [])


class NumberingTests(unittest.TestCase):
    def test_format_and_alphabet(self):
        n = new_order_number()
        self.assertTrue(is_valid_order_number(n), n)
        self.assertEqual(len(n), 11)
        self.assertFalse(set("IO01") & set(ALPHABET))
        self.assertEqual(new_order_number(randbelow=lambda k: 0), "CS-AAAAAAAA")

    def test_unique_enough(self):
        self.assertEqual(len({new_order_number() for _ in range(2000)}), 2000)

    def test_validation(self):
        for bad in ("", "CS-", "CS-AAAAAAA", "CS-AAAAAAAAA", "cs-AAAAAAAA", "CS-AAAAAAA0", "CS-AAAAAAAI", "1234567", "CS-AAAAAAA\n"):
            self.assertFalse(is_valid_order_number(bad), bad)


class CursorTests(unittest.TestCase):
    def test_roundtrip(self):
        c = encode_cursor("2026-11-17T10:00:00+00:00", 42)
        self.assertEqual(decode_cursor(c), ("2026-11-17T10:00:00+00:00", 42))
        self.assertNotIn("=", c)

    def test_garbage_rejected(self):
        import base64
        import json
        enc = lambda o: base64.urlsafe_b64encode(json.dumps(o).encode()).decode()  # noqa: E731
        for bad in ("", "!!!", "abc", enc("x"), enc([1, 2]), enc(["not-a-date", 1]), enc(["2026-11-17T10:00:00", -1]), enc(["2026-11-17T10:00:00", True]), enc(["2026-11-17T10:00:00", "5"])):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                decode_cursor(bad)


class TotalsTests(unittest.TestCase):
    def test_basic(self):
        t = compute_totals(1_000_000, 50_000, 10)
        self.assertEqual((t.subtotal, t.shipping, t.tax, t.total), (1_000_000, 50_000, 105_000, 1_155_000))

    def test_rounding_half_up(self):
        self.assertEqual(compute_totals(5, 0, 10).tax, 1)    # ۰٫۵ ⇒ ۱
        self.assertEqual(compute_totals(4, 0, 10).tax, 0)    # ۰٫۴ ⇒ ۰
        self.assertEqual(compute_totals(15, 0, 10).tax, 2)   # ۱٫۵ ⇒ ۲

    def test_zero_vat_and_shipping(self):
        self.assertEqual(compute_totals(1000, 0, 0).total, 1000)

    def test_invalid(self):
        for args in ((-1, 0, 10), (1, -1, 10), (1, 0, -1), (1, 0, 101), (1.5, 0, 10), (True, 0, 10)):
            with self.subTest(args=args), self.assertRaises(ValueError):
                compute_totals(*args)


class ShippingTests(unittest.TestCase):
    post = ShippingRule("post", "پست", 80_000, free_over_toman=5_000_000)
    courier = ShippingRule("courier", "پیک", 60_000, provinces=("تهران",))

    def test_base_and_free(self):
        self.assertEqual(quote(self.post, "فارس", 1_000_000), 80_000)
        self.assertEqual(quote(self.post, "فارس", 5_000_000), 0)
        self.assertEqual(quote(self.post, "فارس", 4_999_999), 80_000)

    def test_province_restriction(self):
        self.assertEqual(quote(self.courier, "تهران", 1), 60_000)
        self.assertIsNone(quote(self.courier, "فارس", 1))

    def test_inactive(self):
        self.assertIsNone(quote(ShippingRule("x", "x", 1, active=False), "تهران", 1))


if __name__ == "__main__":
    unittest.main()
