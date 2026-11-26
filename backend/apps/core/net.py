"""IP واقعی کلاینت پشت پروکسی؛ بدون Django (قابل تست). فقط به ورودی‌هایی که پروکسی‌های مورد اعتماد اضافه کرده‌اند اعتماد می‌شود."""
from __future__ import annotations

import ipaddress
from collections.abc import Mapping


def _valid(ip: str) -> str | None:
    try:
        return str(ipaddress.ip_address(ip.strip()))
    except ValueError:
        return None


def client_ip(meta: Mapping[str, str], num_proxies: int) -> str | None:
    """num_proxies = تعداد پروکسی‌های مورد اعتماد جلوی برنامه (Caddy = 1). صفر یعنی فقط REMOTE_ADDR.

    X-Forwarded-For را کلاینت هم می‌تواند جعل کند، ولی پروکسی مورد اعتماد IP اتصال خودش را **به انتهای** فهرست
    اضافه می‌کند؛ پس `num_proxies`‌امین عنصر از انتها قابل‌اعتماد است و عناصر قبلی (جعلی) نادیده گرفته می‌شوند.
    """
    remote = _valid(meta.get("REMOTE_ADDR", "")) if meta.get("REMOTE_ADDR") else None
    if num_proxies <= 0:
        return remote
    parts = [p for p in (meta.get("HTTP_X_FORWARDED_FOR") or "").split(",") if p.strip()]
    if len(parts) < num_proxies:
        return remote
    return _valid(parts[-num_proxies]) or remote
