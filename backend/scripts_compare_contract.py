"""نمایش تفاوت عملیات بکاند با قرارداد (برای بهروزرسازی دستی قرارداد)."""
import json
import os
from pathlib import Path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
import django  # noqa: E402

django.setup()
from config.api import api  # noqa: E402

METHODS = {"get", "post", "put", "patch", "delete"}
root = Path(__file__).resolve().parents[1]
contract = json.loads((root / "contracts" / "openapi.json").read_text(encoding="utf-8"))


def ops(doc, strip=""):
    out = set()
    for path, item in doc["paths"].items():
        p = path[len(strip):] if strip and path.startswith(strip) else path
        for m in item:
            if m in METHODS:
                out.add((m, p))
    return out


gen = api.get_openapi_schema()
gen_ops = ops(gen, "/api/v1")
want_ops = ops(contract)
print("ONLY BACKEND:", sorted(gen_ops - want_ops))
print("ONLY CONTRACT:", sorted(want_ops - gen_ops))
