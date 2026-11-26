import unittest
from datetime import UTC, datetime, timedelta

from apps.accounts.otp_policy import (
    DEFAULT_POLICY,
    OtpPolicy,
    decide_request,
    decide_verify,
    generate_code,
    hash_code,
    next_sms_retry_seconds,
    verify_code,
)

NOW = datetime(2026, 11, 17, 10, 0, 0, tzinfo=UTC)
ago = lambda s: NOW - timedelta(seconds=s)  # noqa: E731


class CodeTests(unittest.TestCase):
    def test_code_is_zero_padded_digits(self):
        self.assertEqual(generate_code(6, randbelow=lambda n: 42), "000042")
        self.assertEqual(generate_code(6, randbelow=lambda n: 999999), "999999")
        for _ in range(200):
            c = generate_code()
            self.assertRegex(c, r"^\d{6}$")

    def test_uses_secrets_range(self):
        seen = []
        generate_code(6, randbelow=lambda n: seen.append(n) or 0)
        self.assertEqual(seen, [10**6])

    def test_short_codes_rejected(self):
        with self.assertRaises(ValueError):
            generate_code(3)

    def test_hash_binds_phone_secret_and_code(self):
        h = hash_code("k", "09123456789", "123456")
        self.assertEqual(len(h), 64)
        self.assertTrue(verify_code("k", "09123456789", "123456", h))
        self.assertFalse(verify_code("k", "09123456789", "123457", h))
        self.assertFalse(verify_code("k", "09120000000", "123456", h))  # کد شمارهٔ دیگر کار نمی‌کند
        self.assertFalse(verify_code("other", "09123456789", "123456", h))
        self.assertNotIn("123456", h)
        with self.assertRaises(ValueError):
            hash_code("", "09123456789", "123456")


class RequestPolicyTests(unittest.TestCase):
    def test_first_request_allowed(self):
        self.assertTrue(decide_request(NOW, [], []).allowed)

    def test_resend_within_60s_blocked_with_retry_after(self):
        d = decide_request(NOW, [ago(20)], [])
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "resend_too_soon")
        self.assertTrue(40 <= d.retry_after <= 41)

    def test_resend_after_60s_ok(self):
        self.assertTrue(decide_request(NOW, [ago(61)], []).allowed)

    def test_phone_hourly_limit(self):
        times = [ago(s) for s in (3500, 2900, 2300, 1700, 1100)]  # ۵ درخواست در ساعت، همه بیش از ۶۰ثانیه پیش
        d = decide_request(NOW, times, [])
        self.assertEqual((d.allowed, d.reason), (False, "phone_hourly_limit"))
        self.assertTrue(0 < d.retry_after <= 3600 - 1100 + 3600 - 3500 + 5)
        # قدیمی‌ترین از پنجره بیرون برود ⇒ دوباره مجاز
        self.assertTrue(decide_request(NOW, [ago(3601)] + times[1:], []).allowed)

    def test_ip_hourly_limit_is_independent(self):
        ips = [ago(100 + i * 100) for i in range(20)]
        d = decide_request(NOW, [], ips)
        self.assertEqual((d.allowed, d.reason), (False, "ip_hourly_limit"))
        self.assertTrue(decide_request(NOW, [], ips[:19]).allowed)

    def test_custom_policy(self):
        p = OtpPolicy(resend_seconds=5, per_phone_hour=1)
        self.assertEqual(decide_request(NOW, [ago(30)], [], p).reason, "phone_hourly_limit")

    def test_retry_after_is_positive_and_decreases_as_time_passes(self):
        times = [ago(s) for s in (3500, 2900, 2300, 1700, 1100)]
        a = decide_request(NOW, times, []).retry_after
        b = decide_request(NOW + timedelta(seconds=50), times, []).retry_after
        self.assertGreater(a, b)
        self.assertGreater(b, 0)


class VerifyPolicyTests(unittest.TestCase):
    base = dict(now=NOW, expires_at=NOW + timedelta(seconds=60), attempts=0, consumed=False, code_matches=True)

    def decide(self, **over):
        return decide_verify(**{**self.base, **over})

    def test_ok(self):
        self.assertEqual(self.decide().outcome, "ok")

    def test_wrong_counts_down_attempts(self):
        d = self.decide(code_matches=False)
        self.assertEqual((d.outcome, d.attempts_left), ("wrong", 4))
        self.assertEqual(self.decide(code_matches=False, attempts=4).attempts_left, 0)

    def test_locked_after_max_attempts_even_with_correct_code(self):
        self.assertEqual(self.decide(attempts=DEFAULT_POLICY.max_attempts).outcome, "locked")

    def test_expired_and_boundary(self):
        self.assertEqual(self.decide(expires_at=NOW).outcome, "expired")
        self.assertEqual(self.decide(expires_at=NOW - timedelta(seconds=1)).outcome, "expired")
        self.assertEqual(self.decide(expires_at=NOW + timedelta(seconds=1)).outcome, "ok")

    def test_consumed_wins_over_everything(self):
        self.assertEqual(self.decide(consumed=True, expires_at=NOW - timedelta(hours=1), attempts=99).outcome, "consumed")

    def test_expired_wins_over_locked(self):
        self.assertEqual(self.decide(expires_at=NOW - timedelta(seconds=5), attempts=9).outcome, "expired")


class SmsRetryTests(unittest.TestCase):
    def test_exponential_with_cap(self):
        self.assertEqual([next_sms_retry_seconds(n) for n in range(7)], [15, 30, 60, 120, 240, 480, 600])
        self.assertEqual(next_sms_retry_seconds(-3), 15)


if __name__ == "__main__":
    unittest.main()
