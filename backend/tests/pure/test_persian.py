import unittest

from apps.core.persian import normalize_fa, normalize_phone


class PersianTests(unittest.TestCase):
    def test_normalize_search(self):
        self.assertEqual(normalize_fa("  گوشي   موبايل ۱۲۸ "), "گوشی موبایل 128")
        self.assertEqual(normalize_fa("كتاب"), "کتاب")
        self.assertEqual(normalize_fa("می\u200cخواهم"), "میخواهم")
        self.assertEqual(normalize_fa("ASUS TUF"), "asus tuf")
        self.assertEqual(normalize_fa("٣٢ GB"), "32 gb")

    def test_phone_variants(self):
        for raw in ("09123456789", "+989123456789", "00989123456789", "989123456789", "9123456789", "۰۹۱۲۳۴۵۶۷۸۹", "0912 345 6789", "0912-345-6789"):
            self.assertEqual(normalize_phone(raw), "09123456789", raw)

    def test_phone_invalid(self):
        for raw in ("", "0812345678", "0912345678", "091234567890", "abc", "+15551234567"):
            with self.assertRaises(ValueError, msg=raw):
                normalize_phone(raw)


if __name__ == "__main__":
    unittest.main()
