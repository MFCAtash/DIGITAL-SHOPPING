"""افزودن عملیات فاز ۶–۱۲ به قرارداد موجود (حفظ تمام پاسخها و توضیحات دستی قبلی)."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "contracts" / "openapi.json"
doc = json.loads(path.read_text(encoding="utf-8"))


def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}


def ok(name, code="200", desc=None):
    return {
        code: {
            "description": desc or code,
            "content": {"application/json": {"schema": ref(name)}},
        }
    }


def err(code, desc):
    return {code: {"description": desc, "content": {"application/json": {"schema": ref("Error")}}}}


def params(*items):
    return list(items)


path_param = lambda name: {"name": name, "in": "path", "required": True, "schema": {"type": "string"}}
query_param = lambda name, typ="string", required=False: {"name": name, "in": "query", "required": required, "schema": {"type": typ}}

SECURITY = [{"cookieAuth": []}]

doc["paths"]["/catalog/products/{slug}/variants"] = {
    "get": {
        "operationId": "catalog_list_variants",
        "tags": ["catalog"],
        "summary": "واریانتهای قابلانتخاب محصول",
        "parameters": params(path_param("slug")),
        "responses": {**ok("VariantList"), **err("404", "not_found")},
    }
}
doc["paths"]["/catalog/products/{slug}/price-history"] = {
    "get": {
        "operationId": "catalog_price_history",
        "tags": ["catalog"],
        "summary": "تاریخچهٔ قیمت محصول",
        "parameters": params(path_param("slug")),
        "responses": {**ok("PriceHistoryOut"), **err("404", "not_found")},
    }
}
doc["paths"]["/catalog/products/{slug}/reviews"] = {
    "get": {
        "operationId": "catalog_list_reviews",
        "tags": ["catalog"],
        "summary": "نظرات تأییدشدهٔ محصول",
        "parameters": params(path_param("slug")),
        "responses": {**ok("ReviewList"), **err("404", "not_found")},
    },
    "post": {
        "operationId": "catalog_create_review",
        "tags": ["catalog"],
        "summary": "ثبت نظر (پس از تأیید توسط ادمین نمایش داده میشود)",
        "security": SECURITY,
        "parameters": params(path_param("slug")),
        "requestBody": {"required": True, "content": {"application/json": {"schema": ref("ReviewIn")}}},
        "responses": {**ok("ReviewOut", "201", "201"), **err("401", "unauthorized"), **err("404", "not_found"), **err("422", "invalid_review")},
    },
}
doc["paths"]["/catalog/wishlist"] = {
    "get": {
        "operationId": "catalog_wishlist_list",
        "tags": ["catalog"],
        "summary": "فهرست علاقهمندیها",
        "security": SECURITY,
        "parameters": params(),
        "responses": {**ok("WishlistOut"), **err("401", "unauthorized")},
    }
}
doc["paths"]["/catalog/wishlist/{slug}"] = {
    "post": {
        "operationId": "catalog_wishlist_add",
        "tags": ["catalog"],
        "summary": "افزودن به علاقهمندیها",
        "security": SECURITY,
        "parameters": params(path_param("slug")),
        "responses": {**ok("WishToggleOut"), **err("401", "unauthorized"), **err("404", "not_found")},
    },
    "delete": {
        "operationId": "catalog_wishlist_remove",
        "tags": ["catalog"],
        "summary": "حذف از علاقهمندیها",
        "security": SECURITY,
        "parameters": params(path_param("slug")),
        "responses": {**ok("WishToggleOut"), **err("401", "unauthorized")},
    },
}
doc["paths"]["/pricing/coupons/validate"] = {
    "get": {
        "operationId": "pricing_validate_coupon",
        "tags": ["pricing"],
        "summary": "محاسبهٔ تخفیف کوپن بر اساس جمع کالاها",
        "parameters": params(query_param("code", required=True), query_param("subtotal_toman", "integer", True)),
        "responses": {**ok("CouponOut"), **err("404", "not_found"), **err("409", "coupon_unavailable")},
    }
}

schemas = doc["components"]["schemas"]
schemas["VariantOut"] = {
    "type": "object",
    "required": ["sku", "name", "options", "final_usd_cents", "price_toman", "stock", "is_active"],
    "properties": {
        "sku": {"type": "string"},
        "name": {"type": "string"},
        "options": {"type": "object", "additionalProperties": {"type": "string"}},
        "final_usd_cents": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
        "price_toman": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
        "stock": {"type": "integer"},
        "is_active": {"type": "boolean"},
    },
}
schemas["VariantList"] = {
    "type": "object",
    "required": ["items"],
    "properties": {"items": {"type": "array", "items": ref("VariantOut")}},
}
schemas["PricePointOut"] = {
    "type": "object",
    "required": ["label", "t", "v"],
    "properties": {"label": {"type": "string"}, "t": {"type": "integer"}, "v": {"type": "integer"}},
}
schemas["PriceHistoryOut"] = {
    "type": "object",
    "required": ["items"],
    "properties": {"items": {"type": "array", "items": ref("PricePointOut")}},
}
schemas["ReviewOut"] = {
    "type": "object",
    "required": ["id", "rating", "title", "body", "created_at"],
    "properties": {
        "id": {"type": "integer"},
        "rating": {"type": "integer"},
        "title": {"type": "string"},
        "body": {"type": "string"},
        "created_at": {"type": "string"},
    },
}
schemas["ReviewList"] = {
    "type": "object",
    "required": ["items", "average"],
    "properties": {
        "items": {"type": "array", "items": ref("ReviewOut")},
        "average": {"type": "number"},
    },
}
schemas["ReviewIn"] = {
    "type": "object",
    "required": ["rating", "body"],
    "properties": {
        "rating": {"type": "integer"},
        "title": {"type": "string", "default": ""},
        "body": {"type": "string"},
    },
}
schemas["WishlistOut"] = {
    "type": "object",
    "required": ["items"],
    "properties": {"items": {"type": "array", "items": ref("Product")}},
}
schemas["WishToggleOut"] = {
    "type": "object",
    "required": ["wished"],
    "properties": {"wished": {"type": "boolean"}},
}
schemas["CouponOut"] = {
    "type": "object",
    "required": ["code", "discount_toman"],
    "properties": {"code": {"type": "string"}, "discount_toman": {"type": "integer"}},
}

path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"patched {path}: {len(doc['paths'])} paths, {len(schemas)} schemas")
