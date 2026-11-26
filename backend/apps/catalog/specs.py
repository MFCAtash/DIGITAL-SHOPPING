"""استخراج مقدارهای عددی از رشتهٔ مشخصات برای فیلتر و مقایسه (بدون وابستگی به Django)."""
from __future__ import annotations

import re

_GB = re.compile(r"(\d+(?:\.\d+)?)\s*(TB|GB)", re.I)
_INCH = re.compile(r"(\d+(?:\.\d+)?)\s*inch", re.I)
_MAH = re.compile(r"(\d{3,5})\s*mAh", re.I)
_GRAMS = re.compile(r"(\d+(?:\.\d+)?)\s*g\b")
_KG = re.compile(r"(\d+(?:\.\d+)?)\s*kg", re.I)


def _gb(text: str | None) -> int | None:
    """اولین ظرفیت ذکرشده به گیگابایت (۱ ترابایت = ۱۰۰۰ گیگابایت)."""
    if not text:
        return None
    m = _GB.search(text)
    if not m:
        return None
    return int(float(m.group(1)) * (1000 if m.group(2).upper() == "TB" else 1))


def extract_numbers(specs: dict[str, str]) -> dict[str, int | float | None]:
    screen = _INCH.search(specs.get("display", "") or "")
    mah = _MAH.search(specs.get("battery", "") or "")
    weight = specs.get("weight", "") or ""
    kg, g = _KG.search(weight), _GRAMS.search(weight)
    weight_g = int(float(kg.group(1)) * 1000) if kg else (int(float(g.group(1))) if g else None)
    return {
        "ram_gb": _gb(specs.get("ram")),
        "storage_gb": _gb(specs.get("storage")),
        "screen_in": float(screen.group(1)) if screen else None,
        "battery_mah": int(mah.group(1)) if mah else None,
        "weight_g": weight_g,
    }
