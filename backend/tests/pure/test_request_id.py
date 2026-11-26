import unittest

from apps.core.request_id import sanitize_request_id


class RequestIdTests(unittest.TestCase):
    def test_safe_incoming_is_kept(self):
        self.assertEqual(sanitize_request_id("abc-123_X.y"), "abc-123_X.y")

    def test_missing_gets_fresh_id(self):
        a, b = sanitize_request_id(None), sanitize_request_id("")
        self.assertRegex(a, r"^[0-9a-f]{32}$")
        self.assertNotEqual(a, b)

    def test_unsafe_incoming_is_replaced(self):
        for bad in ("a b", "line\nbreak", "x" * 65, "<script>", "ی"):
            with self.subTest(bad=bad):
                self.assertRegex(sanitize_request_id(bad), r"^[0-9a-f]{32}$")


if __name__ == "__main__":
    unittest.main()
