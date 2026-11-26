import unittest

from apps.payments.gateway import FakeGateway, VerifyResult, from_gateway_amount, to_gateway_amount
from apps.payments.reconcile import GIVE_UP_AFTER_SECONDS, MIN_AGE_SECONDS, reconcile_action
from apps.payments.states import ALLOWED, TERMINAL, InvalidPaymentTransition, ensure_transition, is_settled
from apps.payments.states import PaymentStatus as S


class StateTests(unittest.TestCase):
    def test_happy_path(self):
        for a, b in [(S.INITIATED, S.REDIRECTED), (S.REDIRECTED, S.VERIFIED), (S.VERIFIED, S.REFUNDED)]:
            ensure_transition(a, b)

    def test_terminal_states_have_no_exit(self):
        self.assertEqual(TERMINAL, {S.FAILED, S.REFUNDED})
        for t in TERMINAL:
            for s in S:
                with self.assertRaises(InvalidPaymentTransition):
                    ensure_transition(t, s)

    def test_cannot_skip_or_go_back(self):
        for a, b in [(S.INITIATED, S.VERIFIED), (S.VERIFIED, S.FAILED), (S.VERIFIED, S.REDIRECTED), (S.REDIRECTED, S.REFUNDED)]:
            with self.assertRaises(InvalidPaymentTransition):
                ensure_transition(a, b)

    def test_needs_review_resolves_three_ways(self):
        self.assertEqual(ALLOWED[S.NEEDS_REVIEW], {S.VERIFIED, S.FAILED, S.REFUNDED})

    def test_settled(self):
        self.assertTrue(is_settled(S.VERIFIED) and is_settled(S.FAILED))
        self.assertFalse(is_settled(S.REDIRECTED) or is_settled(S.NEEDS_REVIEW))


class AmountTests(unittest.TestCase):
    def test_units(self):
        self.assertEqual(to_gateway_amount(1500, "toman"), 1500)
        self.assertEqual(to_gateway_amount(1500, "rial"), 15000)
        self.assertEqual(from_gateway_amount(15000, "rial"), 1500)
        self.assertEqual(from_gateway_amount(1500, "toman"), 1500)

    def test_invalid(self):
        for bad in (0, -1, 1.5, True):
            with self.assertRaises(ValueError):
                to_gateway_amount(bad, "toman")  # type: ignore[arg-type]
        with self.assertRaises(ValueError):
            from_gateway_amount(15001, "rial")


class FakeGatewayTests(unittest.TestCase):
    def gw(self, sc):
        return FakeGateway(sc, uuid_hex=lambda: "a" * 32)

    def go(self, sc, amount=500_000, callback_ok=True):
        g = self.gw(sc)
        st = g.start(order_number="CS-AAAAAAAA", amount_toman=amount, callback_url="https://shop/cb")
        params = {"status": "OK" if (callback_ok and sc != "failed") else "NOK"}
        return g, st, g.verify(authority=st.authority, amount_toman=amount, params=params)

    def test_success(self):
        g, st, r = self.go("success")
        self.assertTrue(st.authority.startswith("FAKE") and st.authority.endswith(".success"))
        self.assertIn("authority=", st.redirect_url)
        self.assertIn("status=OK", st.redirect_url)
        self.assertEqual((r.status, r.paid_toman), ("verified", 500_000))
        self.assertTrue(r.ref_id.startswith("REF-"))

    def test_failed_user_cancelled(self):
        g, st, r = self.go("failed")
        self.assertIn("status=NOK", st.redirect_url)
        self.assertEqual(r.status, "failed")

    def test_timeout_pending_then_inquiry_verified(self):
        g, st, r = self.go("timeout")
        self.assertEqual(r.status, "pending")
        self.assertEqual(g.inquire(authority=st.authority, amount_toman=500_000).status, "verified")

    def test_wrong_amount(self):
        g, st, r = self.go("wrong_amount")
        self.assertEqual((r.status, r.paid_toman), ("verified", 499_000))

    def test_duplicate_is_deterministic(self):
        g, st, r1 = self.go("duplicate")
        r2 = g.verify(authority=st.authority, amount_toman=500_000, params={"status": "OK"})
        self.assertEqual(r1, r2)

    def test_callback_params_are_not_trusted(self):
        g, st, _ = self.go("success")
        self.assertEqual(g.verify(authority=st.authority, amount_toman=500_000, params={"status": "NOK"}).status, "failed")
        self.assertEqual(g.verify(authority=st.authority, amount_toman=500_000, params={}).status, "failed")

    def test_unknown_or_forged_authority_never_succeeds(self):
        g = self.gw("success")
        for a in ("", "garbage", "FAKEabc", "FAKEabc.hacked", "REAL123.success"):
            self.assertEqual(g.verify(authority=a, amount_toman=1, params={"status": "OK"}).status, "failed", a)
            self.assertEqual(g.inquire(authority=a, amount_toman=1).status, "failed", a)

    def test_scenario_validation_and_amount_validation(self):
        with self.assertRaises(ValueError):
            FakeGateway("nope")
        with self.assertRaises(ValueError):
            self.gw("success").start(order_number="x", amount_toman=0, callback_url="u")

    def test_callback_url_with_query(self):
        st = self.gw("success").start(order_number="x", amount_toman=10, callback_url="https://s/cb?lang=fa")
        self.assertIn("?lang=fa&authority=", st.redirect_url)


class ReconcileTests(unittest.TestCase):
    ok = VerifyResult("verified", "R", 1000)

    def act(self, status=S.REDIRECTED, age=MIN_AGE_SECONDS + 1, inq=ok, expected=1000):
        return reconcile_action(status, age, inq, expected)

    def test_skip_when_too_young_or_not_redirected(self):
        self.assertEqual(self.act(age=MIN_AGE_SECONDS - 1), "skip")
        for s in (S.INITIATED, S.VERIFIED, S.FAILED, S.NEEDS_REVIEW, S.REFUNDED):
            self.assertEqual(self.act(status=s), "skip")

    def test_verified_matching_amount(self):
        self.assertEqual(self.act(), "mark_verified")

    def test_verified_wrong_amount_needs_review(self):
        self.assertEqual(self.act(inq=VerifyResult("verified", "R", 900)), "needs_review")
        self.assertEqual(self.act(inq=VerifyResult("verified", "R", None)), "needs_review")

    def test_failed(self):
        self.assertEqual(self.act(inq=VerifyResult("failed")), "mark_failed")

    def test_pending_waits_then_gives_up(self):
        self.assertEqual(self.act(inq=VerifyResult("pending")), "keep")
        self.assertEqual(self.act(inq=VerifyResult("pending"), age=GIVE_UP_AFTER_SECONDS), "mark_failed")

    def test_gateway_down(self):
        self.assertEqual(self.act(inq=None), "keep")
        self.assertEqual(self.act(inq=None, age=GIVE_UP_AFTER_SECONDS + 5), "mark_failed")


if __name__ == "__main__":
    unittest.main()
