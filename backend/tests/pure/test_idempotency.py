import unittest
import uuid

from apps.orders.idempotency import InvalidIdempotencyKey, request_fingerprint, validate_key


class ValidateKeyTests(unittest.TestCase):
    def test_accepts_uuid_and_returns_canonical_form(self):
        raw = str(uuid.uuid4())
        self.assertEqual(validate_key(raw), raw)
        self.assertEqual(validate_key(raw.upper()), raw)

    def test_rejects_non_uuid(self):
        for bad in ("k1", "same", "", "not-a-uuid", "x" * 65, None, 123, b"abc"):
            with self.subTest(bad=bad), self.assertRaises(InvalidIdempotencyKey):
                validate_key(bad)

    def test_rejects_overlong_even_if_prefix_is_uuid(self):
        with self.assertRaises(InvalidIdempotencyKey):
            validate_key(str(uuid.uuid4()) + "0" * 40)


class FingerprintTests(unittest.TestCase):
    def test_order_and_duplicate_lines_do_not_matter(self):
        a = request_fingerprint([(1, 1), (2, 3), (1, 2)])
        b = request_fingerprint([(2, 3), (1, 3)])
        self.assertEqual(a, b)

    def test_different_cart_changes_fingerprint(self):
        self.assertNotEqual(request_fingerprint([(1, 1)]), request_fingerprint([(1, 2)]))
        self.assertNotEqual(request_fingerprint([(1, 1)]), request_fingerprint([(2, 1)]))

    def test_address_is_part_of_fingerprint(self):
        self.assertNotEqual(request_fingerprint([(1, 1)], {"city": "تهران"}), request_fingerprint([(1, 1)], {"city": "شیراز"}))
        self.assertEqual(request_fingerprint([(1, 1)], None), request_fingerprint([(1, 1)], {}))

    def test_key_order_in_address_does_not_matter(self):
        self.assertEqual(request_fingerprint([(1, 1)], {"a": 1, "b": 2}), request_fingerprint([(1, 1)], {"b": 2, "a": 1}))

    def test_is_hex_sha256(self):
        fp = request_fingerprint([(1, 1)])
        self.assertEqual(len(fp), 64)
        int(fp, 16)


if __name__ == "__main__":
    unittest.main()


class FingerprintExtraTests(unittest.TestCase):
    def test_extra_changes_fingerprint_but_absent_extra_does_not(self):
        base = request_fingerprint([(1, 1)], {"a": 1})
        self.assertEqual(request_fingerprint([(1, 1)], {"a": 1}, None), base)
        self.assertEqual(request_fingerprint([(1, 1)], {"a": 1}, {}), base)
        self.assertNotEqual(request_fingerprint([(1, 1)], {"a": 1}, {"shipping": "post"}), base)
        self.assertNotEqual(request_fingerprint([(1, 1)], {"a": 1}, {"shipping": "post"}), request_fingerprint([(1, 1)], {"a": 1}, {"shipping": "courier"}))
