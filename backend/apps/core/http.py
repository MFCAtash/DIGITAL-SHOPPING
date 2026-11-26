"""کمک‌های پاسخ HTTP برای endpointهایی که باید کوکی/هدر بنویسند (ninja وقتی HttpResponse برگردد آن را عیناً می‌فرستد)."""
from __future__ import annotations

import json
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse


def json_response(data: Any, status: int = 200) -> HttpResponse:
    return HttpResponse(json.dumps(data, cls=DjangoJSONEncoder, ensure_ascii=False), status=status, content_type="application/json; charset=utf-8")
