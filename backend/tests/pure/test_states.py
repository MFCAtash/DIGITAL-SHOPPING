import unittest

from apps.orders.states import TRANSITIONS, InvalidTransition, can_transition, ensure_transition
from apps.orders.states import OrderStatus as S


class StateTests(unittest.TestCase):
    def test_every_status_has_an_entry(self):
        self.assertEqual(set(TRANSITIONS), set(S))

    def test_happy_path(self):
        for a, b in [(S.PENDING, S.PAID), (S.PAID, S.PROCESSING), (S.PROCESSING, S.SHIPPED), (S.SHIPPED, S.DELIVERED)]:
            ensure_transition(a, b)

    def test_terminal_states_have_no_exits(self):
        for t in (S.CANCELLED, S.REFUNDED):
            for target in S:
                self.assertFalse(can_transition(t, target))

    def test_forbidden(self):
        for a, b in [(S.PENDING, S.SHIPPED), (S.PAID, S.PENDING), (S.DELIVERED, S.CANCELLED), (S.SHIPPED, S.PAID)]:
            with self.assertRaises(InvalidTransition):
                ensure_transition(a, b)

    def test_no_self_transition(self):
        for s in S:
            self.assertFalse(can_transition(s, s))

    def test_needs_review_can_resolve(self):
        self.assertTrue(can_transition(S.NEEDS_REVIEW, S.PAID))
        self.assertTrue(can_transition(S.PENDING, S.NEEDS_REVIEW))


if __name__ == "__main__":
    unittest.main()
