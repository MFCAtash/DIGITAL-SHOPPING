import unittest
from datetime import date

from apps.catalog.freshness import is_stale, stale_cutoff
from apps.pricing.rate_guard import SuspiciousRate, check_rate_change

TODAY = date(2026, 11, 14)


class FreshnessTests(unittest.TestCase):
    def test_none_is_stale(self):
        self.assertTrue(is_stale(None, TODAY))

    def test_boundary_is_exact(self):
        self.assertEqual(stale_cutoff(TODAY, 7), date(2026, 11, 7))
        self.assertFalse(is_stale(date(2026, 11, 7), TODAY, 7))  # دقیقاً ۷ روز پیش ⇒ هنوز تازه
        self.assertTrue(is_stale(date(2026, 11, 6), TODAY, 7))

    def test_catalog_checked_on_2026_10_11_is_stale_today(self):
        self.assertTrue(is_stale(date(2026, 10, 11), TODAY, 7))

    def test_today_and_future_are_fresh(self):
        self.assertFalse(is_stale(TODAY, TODAY))
        self.assertFalse(is_stale(date(2026, 11, 20), TODAY))

    def test_negative_days_rejected(self):
        with self.assertRaises(ValueError):
            stale_cutoff(TODAY, -1)


class RateGuardTests(unittest.TestCase):
    def test_first_rate_has_no_baseline(self):
        check_rate_change(None, 1_000_000)

    def test_small_change_ok(self):
        check_rate_change(1_000_000, 1_150_000)
        check_rate_change(1_000_000, 850_000)

    def test_extra_zero_typo_rejected(self):
        with self.assertRaises(SuspiciousRate):
            check_rate_change(1_000_000, 10_000_000)

    def test_big_drop_rejected(self):
        with self.assertRaises(SuspiciousRate):
            check_rate_change(1_000_000, 700_000)

    def test_custom_limit(self):
        check_rate_change(1_000_000, 1_400_000, max_change_percent=50)

    def test_invalid_values(self):
        for bad in (0, -5, True, 1.5, "100"):
            with self.subTest(bad=bad), self.assertRaises(SuspiciousRate):
                check_rate_change(1_000_000, bad)  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main()
