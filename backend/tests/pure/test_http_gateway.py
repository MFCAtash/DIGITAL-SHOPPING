"""آداپتور درگاه HTTP: امضا، تبدیل واحد و رفتار verify (بدون شبکه)."""
from __future__ import annotations

import unittest

from apps.payments.gateway import GatewayError, HttpGateway, from_gateway_amount, hmac_signature, to_gateway_amount


class HttpGatewayTests(unittest.TestCase):
    SECRET = "test-secret"

    def setUp(self):
        self.posts = []

    def _gateway(self, response, refund_url="https://pay.test/refund"):
        def post(url, payload, headers):
            self.posts.append((url, payload, headers))
            return response
        return HttpGateway(
            start_url="https://pay.test/start",
            verify_url="https://pay.test/verify",
            api_key="key",
            secret=self.SECRET,
            refund_url=refund_url,
            post=post,
        )

    def test_amount_units(self):
        self.assertEqual(to_gateway_amount(1000, "rial"), 10000)
        self.assertEqual(from_gateway_amount(10000, "rial"), 1000)
        with self.assertRaises(ValueError):
            from_gateway_amount(10001, "rial")

    def test_start_builds_authority_and_redirect(self):
        gw = self._gateway({"authority": "A123", "redirect_url": "https://pay.test/go/A123"})
        started = gw.start(order_number="CS-1", amount_toman=5000, callback_url="https://shop.test/cb")
        self.assertEqual(started.authority, "A123")
        self.assertEqual(self.posts[0][1]["amount"], 5000)
        self.assertEqual(self.posts[0][2]["Authorization"], "Bearer key")

    def test_verify_accepts_valid_signature(self):
        paid = 5000
        sig = hmac_signature(self.SECRET, "A123", paid, "REF-1")
        gw = self._gateway({"status": "verified", "ref_id": "REF-1", "paid_amount": paid, "signature": sig})
        result = gw.verify(authority="A123", amount_toman=5000, params={})
        self.assertEqual(result.status, "verified")
        self.assertEqual(result.paid_toman, 5000)

    def test_verify_rejects_tampered_signature(self):
        gw = self._gateway({"status": "verified", "ref_id": "REF-1", "paid_amount": 5000, "signature": "bad"})
        with self.assertRaises(GatewayError):
            gw.verify(authority="A123", amount_toman=5000, params={})

    def test_verify_rejects_unknown_status(self):
        gw = self._gateway({"status": "maybe"})
        with self.assertRaises(GatewayError):
            gw.verify(authority="A123", amount_toman=5000, params={})

    def test_refund_calls_gateway_and_converts_amount(self):
        gw = self._gateway({"status": "refunded", "refund_id": "RF-9"})
        result = gw.refund(authority="A123", amount_toman=5000, ref_id="REF-1")
        self.assertEqual(result.status, "refunded")
        self.assertEqual(result.ref_id, "RF-9")
        self.assertEqual(self.posts[0][0], "https://pay.test/refund")
        self.assertEqual(self.posts[0][1], {"authority": "A123", "amount": 5000, "ref_id": "REF-1"})
        self.assertEqual(self.posts[0][2]["Authorization"], "Bearer key")

    def test_refund_without_url_raises_and_rial_units_are_converted(self):
        gw = self._gateway({"status": "refunded"}, refund_url="")
        with self.assertRaises(GatewayError):
            gw.refund(authority="A123", amount_toman=1000)
        posts = []

        def post(url, payload, headers):
            posts.append(payload)
            return {"status": "refunded"}

        rial = HttpGateway(
            start_url="https://pay.test/start", verify_url="https://pay.test/verify",
            api_key="key", secret=self.SECRET, amount_unit="rial",
            refund_url="https://pay.test/refund", post=post,
        )
        rial.refund(authority="A123", amount_toman=1000)
        self.assertEqual(posts[0]["amount"], 10000)

    def test_refund_rejects_unknown_status(self):
        gw = self._gateway({"status": "maybe"})
        with self.assertRaises(GatewayError):
            gw.refund(authority="A123", amount_toman=5000)


if __name__ == "__main__":
    unittest.main()
