"""قواعد اعتبارسنجی کاتالوگ؛ همان قواعد scripts/verify-catalog.mjs (بدون وابستگی به Django).

استفاده: در `import_catalog`، در ادمین (ورود CSV) و در تست‌ها.
"""
from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any

SLUG_RE = re.compile(r"^[a-z0-9-]+$")
PRICE_NOTES = {"از": "from", "تقریبی": "approx"}


def is_hidden_brand(brand: str | None, hidden_brands: Iterable[str] = ()) -> bool:
    """تطابق برند با فهرست برندهای پنهان (بدون حساسیت به حروف و فاصله).

    این تابع خالص است تا همان قانون در API، سبد و تستها بدون وابستگی به Django اعمال شود.
    """
    if not brand:
        return False
    needle = str(brand).strip().casefold()
    return any(str(h).strip().casefold() == needle for h in hidden_brands if str(h).strip())


def validate_catalog(data: dict[str, Any], image_files: Iterable[str], spec_keys: set[str] | None = None) -> list[str]:
    """فهرست خطاها را برمی‌گرداند؛ فهرست خالی یعنی سالم."""
    errors: list[str] = []
    files = set(image_files)
    categories = {c.get("slug") for c in data.get("categories", [])}
    seen: set[str] = set()
    for c in data.get("categories", []):
        if not SLUG_RE.match(c.get("slug") or ""):
            errors.append(f"دسته: slug نامعتبر {c.get('slug')!r}")
    for p in data.get("products", []):
        pid = p.get("slug") or p.get("name") or "?"
        if not SLUG_RE.match(p.get("slug") or ""):
            errors.append(f"{pid}: slug نامعتبر")
        if pid in seen:
            errors.append(f"{pid}: slug تکراری")
        seen.add(pid)
        if p.get("category") not in categories:
            errors.append(f"{pid}: دستهٔ ناشناخته {p.get('category')!r}")
        if not p.get("brand"):
            errors.append(f"{pid}: برند ندارد")
        if not p.get("description"):
            errors.append(f"{pid}: توضیح ندارد")
        stock = p.get("stock")
        if isinstance(stock, bool) or not isinstance(stock, int) or stock < 0:
            errors.append(f"{pid}: stock نامعتبر")
        price = p.get("usd_cents")
        priced = price is not None
        if priced and (isinstance(price, bool) or not isinstance(price, int) or price <= 0):
            errors.append(f"{pid}: usd_cents باید عدد صحیح مثبت یا null باشد")
        if priced and not str(p.get("source") or "").startswith("https://"):
            errors.append(f"{pid}: source باید https باشد")
        if p.get("price_note") and p["price_note"] not in PRICE_NOTES:
            errors.append(f"{pid}: price_note نامعتبر {p['price_note']!r}")
        images = p.get("images") or []
        if priced and not images:
            errors.append(f"{pid}: آگهی قیمت‌دار بدون عکس (قانون پروژه)")
        for im in images:
            f = im.get("file") or ""
            if f not in files:
                errors.append(f"{pid}: فایل عکس وجود ندارد {f!r}")
            if not im.get("alt"):
                errors.append(f"{pid}: alt خالی برای {f!r}")
            if not f.endswith(".webp"):
                errors.append(f"{pid}: عکس باید webp باشد {f!r}")
        if spec_keys is not None:
            for k in (p.get("specs") or {}):
                if k not in spec_keys:
                    errors.append(f"{pid}: کلید مشخصات بدون ترجمه {k!r}")
    return errors
