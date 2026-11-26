"""تولید قرارداد OpenAPI از بکاند + اعمال قواعد قرارداد (برای هماهنگی با تغییرات API).

خروجی `contracts/openapi.json` یک قرارداد مستقل است: علاوه بر آنچه Django Ninja تولید میکند،
چند قاعدهای را که در `tests/pure/test_openapi_contract_file.py` بررسی میشوند بهصورت صریح
درج میکند تا قرارداد همیشه کامل و خودتوصیف باشد:

- مسیرها بدون پیشوند `/api/v1` (پیشوند در `servers` اعلام میشود)؛
- تمام پاسخهای خطا (4xx/5xx) از طرح یکپارچهٔ `Error` استفاده میکنند؛
- عملیات محافظتشدهٔ 401 را صریح اعلام میکند؛
- هدر `Idempotency-Key` در ایجاد سفارش الزامی است؛
- طرح پارامترهای فیلتر (`ProductFilters`) با postfix `x-querySchema` مستند میشود.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
import django  # noqa: E402

django.setup()

from config.api import api  # noqa: E402

METHODS = {"get", "post", "put", "patch", "delete"}
ERROR_REF = {"$ref": "#/components/schemas/Error"}
PREFIX = "/api/v1"


def _iter_operations(doc: dict):
    for item in doc["paths"].values():
        for method, op in item.items():
            if method in METHODS:
                yield op


def enforce_contract_rules(doc: dict) -> None:
    # ۱) پیشوند مسیرها را جدا میکنیم (servers.url تنها مرجع پیشوند است).
    doc["paths"] = {
        (p[len(PREFIX) :] if p.startswith(PREFIX) else p): item for p, item in doc["paths"].items()
    }
    doc["servers"] = [{"url": PREFIX}]

    # ۲) طرح خطای یکپارچه: {"code", "message", ...part} همان شکلی که register_handlers میفرستد.
    doc["components"]["schemas"].setdefault(
        "Error",
        {
            "type": "object",
            "required": ["code", "message"],
            "properties": {"code": {"type": "string"}, "message": {"type": "string"}},
            "additionalProperties": True,
            "description": "شکل یکپارچهٔ خطا: {code, message, ...parts}.",
        },
    )

    for op in _iter_operations(doc):
        responses = op.setdefault("responses", {})
        # ۳) 모든 پاسخهای خطا به Error ارجاع میشوند.
        for code, response in responses.items():
            if str(code)[:1] in {"4", "5"}:
                response["content"] = {"application/json": {"schema": dict(ERROR_REF)}}
                response.setdefault("description", "Error")
        # ۴) عملیات محافظتشده صریحاً 401 اعلام میکند.
        if "security" in op and "401" not in responses:
            responses["401"] = {
                "description": "Unauthorized",
                "content": {"application/json": {"schema": dict(ERROR_REF)}},
            }

    # ۵) ایجاد سفارش بدون Idempotency-Key معتبر نیست (پیادهسازی 422 با کد مخصوص برمیگرداند).
    create_order = doc["paths"].get("/orders", {}).get("post", {})
    for param in create_order.get("parameters", []):
        if param.get("name") == "Idempotency-Key":
            param["required"] = True

    # ۶) طرح فیلتر بهعنوان پارامتر query مستند میشود (Ninja آن را به پارامترهای مسطح تبدیل میکند).
    for op in _iter_operations(doc):
        if op.get("operationId") in {"catalog_list_products", "catalog_facets"}:
            op["x-querySchema"] = {"$ref": "#/components/schemas/ProductFilters"}


schema = api.get_openapi_schema()
enforce_contract_rules(schema)
out = Path(__file__).resolve().parents[1] / "contracts" / "openapi.json"
out.write_text(json.dumps(schema, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"contract written: {out} ({len(schema['paths'])} paths)")
