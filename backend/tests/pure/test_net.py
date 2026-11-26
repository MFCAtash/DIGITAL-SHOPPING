import unittest

from apps.core.net import client_ip


class ClientIpTests(unittest.TestCase):
    def test_no_proxy_uses_remote_addr_and_ignores_xff(self):
        self.assertEqual(client_ip({"REMOTE_ADDR": "1.2.3.4", "HTTP_X_FORWARDED_FOR": "6.6.6.6"}, 0), "1.2.3.4")

    def test_one_trusted_proxy_takes_last_entry(self):
        meta = {"REMOTE_ADDR": "10.0.0.2", "HTTP_X_FORWARDED_FOR": "203.0.113.9"}
        self.assertEqual(client_ip(meta, 1), "203.0.113.9")

    def test_spoofed_prefix_is_ignored(self):
        meta = {"REMOTE_ADDR": "10.0.0.2", "HTTP_X_FORWARDED_FOR": "6.6.6.6, 203.0.113.9"}  # کلاینت جعل کرد؛ Caddy ۲۰۳ را اضافه کرد
        self.assertEqual(client_ip(meta, 1), "203.0.113.9")

    def test_two_proxies(self):
        meta = {"REMOTE_ADDR": "10.0.0.3", "HTTP_X_FORWARDED_FOR": "6.6.6.6, 203.0.113.9, 10.0.0.2"}
        self.assertEqual(client_ip(meta, 2), "203.0.113.9")

    def test_missing_or_short_xff_falls_back_to_remote(self):
        self.assertEqual(client_ip({"REMOTE_ADDR": "10.0.0.2"}, 1), "10.0.0.2")
        self.assertEqual(client_ip({"REMOTE_ADDR": "10.0.0.2", "HTTP_X_FORWARDED_FOR": "1.1.1.1"}, 2), "10.0.0.2")

    def test_garbage_ip_rejected(self):
        self.assertEqual(client_ip({"REMOTE_ADDR": "10.0.0.2", "HTTP_X_FORWARDED_FOR": "not-an-ip"}, 1), "10.0.0.2")
        self.assertIsNone(client_ip({"REMOTE_ADDR": "garbage"}, 0))
        self.assertIsNone(client_ip({}, 0))

    def test_ipv6_normalized(self):
        self.assertEqual(client_ip({"REMOTE_ADDR": "::1"}, 0), "::1")
        self.assertEqual(client_ip({"REMOTE_ADDR": "10.0.0.2", "HTTP_X_FORWARDED_FOR": "2001:DB8:0:0:0:0:0:1"}, 1), "2001:db8::1")


if __name__ == "__main__":
    unittest.main()
