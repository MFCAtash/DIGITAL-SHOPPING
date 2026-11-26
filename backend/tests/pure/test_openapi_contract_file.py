"""اعتبار ساختاری contracts/openapi.json (خالص): ارجاع‌ها حل می‌شوند، operationId یکتاست، مسیرهای محافظت‌شده ۴۰۱ دارند."""
import json
import re
import unittest
from pathlib import Path

DOC = json.loads((Path(__file__).resolve().parents[3] / "contracts" / "openapi.json").read_text(encoding="utf-8"))
METHODS = {"get", "post", "put", "patch", "delete"}


def walk(node):
    yield node
    if isinstance(node, dict):
        for v in node.values():
            yield from walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)


def operations():
    for path, item in DOC["paths"].items():
        for method, op in item.items():
            assert method in METHODS, (path, method)
            yield path, method, op


class OpenApiContractFileTests(unittest.TestCase):
    def test_all_refs_resolve(self):
        schemas = DOC["components"]["schemas"]
        for n in walk(DOC):
            if isinstance(n, dict) and "$ref" in n:
                m = re.fullmatch(r"#/components/schemas/(\w+)", n["$ref"])
                self.assertTrue(m and m.group(1) in schemas, n["$ref"])

    def test_every_schema_is_used(self):
        used = {n["$ref"].rsplit("/", 1)[1] for n in walk(DOC) if isinstance(n, dict) and "$ref" in n}
        self.assertEqual(set(DOC["components"]["schemas"]) - used - {"Error"}, set() , "schema بلااستفاده")

    def test_operation_ids_unique_and_snake_case(self):
        ids = [op["operationId"] for _, _, op in operations()]
        self.assertEqual(len(ids), len(set(ids)))
        for i in ids:
            self.assertRegex(i, r"^[a-z]+(_[a-z]+)+$")

    def test_path_params_are_declared(self):
        for path, method, op in operations():
            declared = {p["name"] for p in op["parameters"] if p["in"] == "path"}
            self.assertEqual(declared, set(re.findall(r"{(\w+)}", path)), (path, method))

    def test_protected_operations_declare_401_and_security(self):
        for path, method, op in operations():
            if "security" in op:
                self.assertIn("401", op["responses"], (path, method))

    def test_error_responses_use_error_schema(self):
        for path, method, op in operations():
            for code, r in op["responses"].items():
                if int(code) >= 400:
                    self.assertEqual(r["content"]["application/json"]["schema"], {"$ref": "#/components/schemas/Error"}, (path, method, code))

    def test_order_creation_requires_idempotency_header(self):
        op = DOC["paths"]["/orders"]["post"]
        h = [p for p in op["parameters"] if p["in"] == "header"]
        self.assertEqual([(p["name"], p["required"]) for p in h], [("Idempotency-Key", True)])
        self.assertIn("201", op["responses"])

    def test_money_fields_are_integers(self):
        for name, s in DOC["components"]["schemas"].items():
            for field, spec in s.get("properties", {}).items():
                if field.endswith(("_toman", "_cents")):
                    types = [spec.get("type")] + [x.get("type") for x in spec.get("anyOf", [])]
                    self.assertIn("integer", types, f"{name}.{field}")
                    self.assertNotIn("number", types, f"{name}.{field}")

    def test_server_prefix(self):
        self.assertEqual(DOC["servers"], [{"url": "/api/v1"}])


if __name__ == "__main__":
    unittest.main()
