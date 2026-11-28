"""بک‌اند باید دقیقاً همان مسیرها/متدها/operationId/کدهای موفقیت را داشته باشد که contracts/openapi.json می‌گوید (نیاز به Django)."""
import json
from pathlib import Path

import pytest

from config.api import api

CONTRACT = json.loads((Path(__file__).resolve().parents[2] / "contracts" / "openapi.json").read_text(encoding="utf-8"))
METHODS = {"get", "post", "put", "patch", "delete"}
pytestmark = pytest.mark.django_db


def ops(doc, strip_prefix=""):
    out = {}
    for path, item in doc["paths"].items():
        p = path[len(strip_prefix):] if strip_prefix and path.startswith(strip_prefix) else path
        for m, op in item.items():
            if m in METHODS:
                out[(m, p)] = op
    return out


@pytest.fixture(scope="module")
def generated():
    # ninja مسیرها را با پیشوند /api/v1 می‌سازد؛ قرارداد با servers.url مقایسه می‌شود
    return ops(api.get_openapi_schema(), "/api/v1")


def test_same_operations(generated):
    want = ops(CONTRACT)
    assert set(generated) == set(want), {"فقط در بک‌اند": sorted(set(generated) - set(want)), "فقط در قرارداد": sorted(set(want) - set(generated))}


def test_same_operation_ids(generated):
    for key, op in ops(CONTRACT).items():
        assert generated[key]["operationId"] == op["operationId"], key


def _ref_name(schema: dict) -> str:
    """Django Ninja نسخه‌های مختلف، بدنهٔ اختیاری را `$ref` یا `anyOf[$ref]` می	nویسند."""
    ref = schema.get("$ref") or schema.get("anyOf", [{}])[0].get("$ref")
    assert ref, f"مرجع طرح بدنه یافت نشد: {schema}"
    return ref.rsplit("/", 1)[1]


def _success_codes(op: dict) -> set[str]:
    """کلیدهای پاسخ در نسخه‌های مختلف Ninja می‌توانند عددی یا رشته‌ای باشند."""
    return {str(c) for c in op["responses"] if str(c).startswith("2")}


def test_success_status_codes_match(generated):
    for key, op in ops(CONTRACT).items():
        want = _success_codes(op)
        got = _success_codes(generated[key])
        assert want == got, (key, want, got)


def test_query_parameters_match(generated):
    """فیلترهای کاتالوگ نباید بین اسکیمای Ninja و قرارداد دچار drift شوند."""
    for key, op in ops(CONTRACT).items():
        want = {p["name"] for p in op.get("parameters", [])}
        got = {p["name"] for p in generated[key].get("parameters", [])}
        assert want == got, (key, sorted(want - got), sorted(got - want))


def test_required_request_properties_match(generated):
    schemas = api.get_openapi_schema()["components"]["schemas"]
    for key, op in ops(CONTRACT).items():
        body = op.get("requestBody")
        if not body:
            continue
        name = _ref_name(body["content"]["application/json"]["schema"])
        want = set(CONTRACT["components"]["schemas"][name].get("required", []))
        gen_ref = generated[key]["requestBody"]["content"]["application/json"]["schema"]
        gen_name = _ref_name(gen_ref)
        assert want == set(schemas[gen_name].get("required", [])), (key, name)
