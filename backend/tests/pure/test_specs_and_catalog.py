import json
import os
import unittest

from apps.catalog.rules import validate_catalog
from apps.catalog.specs import extract_numbers

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CATALOG = os.path.join(ROOT, "overlay", "data", "real-catalog.json")
IMAGES = os.path.join(ROOT, "overlay", "public", "products")
I18N = os.path.join(ROOT, "overlay", "src", "lib", "i18n-messages.json")


class SpecTests(unittest.TestCase):
    def test_extract(self):
        n = extract_numbers({"ram": "16GB", "storage": "1TB SSD", "display": "15.6 inch", "battery": "5110mAh, 45W", "weight": "1.60 kg"})
        self.assertEqual(n, {"ram_gb": 16, "storage_gb": 1000, "screen_in": 15.6, "battery_mah": 5110, "weight_g": 1600})

    def test_variants_use_first_value(self):
        n = extract_numbers({"ram": "8GB / 12GB", "storage": "128GB / 256GB / 512GB", "weight": "190 g"})
        self.assertEqual((n["ram_gb"], n["storage_gb"], n["weight_g"]), (8, 128, 190))

    def test_missing_values_are_none(self):
        n = extract_numbers({})
        self.assertTrue(all(v is None for v in n.values()))


@unittest.skipUnless(os.path.exists(CATALOG), "catalog not found")
class CatalogRuleTests(unittest.TestCase):
    def setUp(self):
        self.data = json.load(open(CATALOG, encoding="utf8"))
        self.files = os.listdir(IMAGES)
        self.keys = {k[5:] for k in json.load(open(I18N, encoding="utf8"))["en"] if k.startswith("spec.")}

    def test_real_catalog_is_valid(self):
        self.assertEqual(validate_catalog(self.data, self.files, self.keys), [])

    def test_priced_listing_without_images_is_rejected(self):
        d = json.loads(json.dumps(self.data))
        d["products"][0]["images"] = []
        errs = validate_catalog(d, self.files)
        self.assertTrue(any("بدون عکس" in e for e in errs))

    def test_bad_values_are_rejected(self):
        d = json.loads(json.dumps(self.data))
        p = d["products"][0]
        p["usd_cents"], p["stock"], p["slug"] = 1.5, -1, "Bad Slug"
        errs = " | ".join(validate_catalog(d, self.files))
        for needle in ("usd_cents", "stock", "slug"):
            self.assertIn(needle, errs)

    def test_missing_file_and_empty_alt(self):
        d = json.loads(json.dumps(self.data))
        d["products"][0]["images"][0].update(file="nope.webp", alt="")
        errs = " | ".join(validate_catalog(d, self.files))
        self.assertIn("فایل عکس وجود ندارد", errs)
        self.assertIn("alt خالی", errs)

    def test_extract_on_real_products_does_not_crash(self):
        for p in self.data["products"]:
            extract_numbers(p.get("specs", {}))


if __name__ == "__main__":
    unittest.main()
