"""قوانین برند پنهان: سیاستی که هم در API و هم در سبد اعمال میشود."""
from __future__ import annotations

import unittest

from apps.catalog.rules import is_hidden_brand


class HiddenBrandRuleTests(unittest.TestCase):
    def test_exact_and_case_insensitive(self):
        hidden = ["Starlink", "Example Brand"]
        self.assertTrue(is_hidden_brand("starlink", hidden))
        self.assertTrue(is_hidden_brand("  STARLINK  ", hidden))
        self.assertTrue(is_hidden_brand("example brand", hidden))

    def test_unknown_brand_is_visible(self):
        self.assertFalse(is_hidden_brand("Xiaomi", ["Starlink"]))
        self.assertFalse(is_hidden_brand("", ["Starlink"]))
        self.assertFalse(is_hidden_brand(None, ["Starlink"]))
        self.assertFalse(is_hidden_brand("Xiaomi", []))

    def test_blank_entries_are_ignored(self):
        self.assertFalse(is_hidden_brand("", [" ", ""]))
        self.assertTrue(is_hidden_brand("Starlink", ["", " Starlink "]))


if __name__ == "__main__":
    unittest.main()
