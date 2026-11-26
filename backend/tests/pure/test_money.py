import random
import unittest

from apps.pricing.money import clamp_discount, final_usd_cents, to_toman


class MoneyTests(unittest.TestCase):
    def test_final_matches_frontend_examples(self):
        # همان مثال‌های overlay/tests/usd.test.ts
        self.assertEqual(final_usd_cents(100000, 10), 90000)
        self.assertEqual(final_usd_cents(99999, 15), 84999)
        self.assertEqual(final_usd_cents(5000, 0), 5000)
        self.assertEqual(final_usd_cents(5000, 150), 0)
        self.assertEqual(final_usd_cents(1000, -20), 1000)
        self.assertEqual(final_usd_cents(1000, None), 1000)

    def test_rejects_non_integers_and_negatives(self):
        with self.assertRaises(TypeError):
            final_usd_cents(10.5, 0)  # type: ignore[arg-type]
        with self.assertRaises(TypeError):
            final_usd_cents(True, 0)  # type: ignore[arg-type]
        with self.assertRaises(ValueError):
            final_usd_cents(-1, 0)

    def test_property_never_negative_never_above_price(self):
        rnd = random.Random(7)
        for _ in range(5000):
            price, disc = rnd.randint(0, 10**7), rnd.randint(-50, 200)
            out = final_usd_cents(price, disc)
            self.assertTrue(0 <= out <= price)
            self.assertIsInstance(out, int)

    def test_discount_monotonic(self):
        for price in (1, 99, 12345, 99999):
            vals = [final_usd_cents(price, d) for d in range(0, 101)]
            self.assertEqual(vals, sorted(vals, reverse=True))
            self.assertEqual(vals[0], price)
            self.assertEqual(vals[-1], 0)

    def test_clamp(self):
        self.assertEqual((clamp_discount(-5), clamp_discount(50), clamp_discount(500), clamp_discount(None)), (0, 50, 100, 0))

    def test_to_toman(self):
        # 239.50 دلار با نرخ ۱٬۰۰۰٬۰۰۰ تومان = ۲۳۹٬۵۰۰٬۰۰۰
        self.assertEqual(to_toman(23950, 1_000_000), 239_500_000)
        # گرد به هزار تومان
        self.assertEqual(to_toman(100, 123_456), 123_000)   # 123456 -> 123000
        self.assertEqual(to_toman(100, 123_500), 124_000)   # نیم رو به بالا
        self.assertEqual(to_toman(0, 1_000_000), 0)
        with self.assertRaises(ValueError):
            to_toman(100, 0)
        with self.assertRaises(TypeError):
            to_toman(1.5, 1000)  # type: ignore[arg-type]

    def test_to_toman_is_integer_and_monotonic(self):
        rate = 987_654
        last = -1
        for cents in range(0, 200_000, 997):
            t = to_toman(cents, rate)
            self.assertIsInstance(t, int)
            self.assertEqual(t % 1000, 0)
            self.assertGreaterEqual(t, last)
            last = t


if __name__ == "__main__":
    unittest.main()
