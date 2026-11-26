"""شناسهٔ درخواست (request_id)؛ بدون وابستگی به Django."""
from __future__ import annotations

import re
import uuid

_SAFE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def sanitize_request_id(incoming: str | None) -> str:
    """هدر ورودی فقط در صورت امن‌بودن پذیرفته می‌شود (جلوگیری از تزریق به لاگ)؛ وگرنه شناسهٔ تازه."""
    if incoming and _SAFE.match(incoming):
        return incoming
    return uuid.uuid4().hex
