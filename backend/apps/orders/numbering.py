"""شمارهٔ عمومی سفارش: غیرترتیبی (حدس‌زدن و شمارش سفارش‌ها ممکن نیست)؛ بدون حروف/ارقام گیج‌کننده (I O 0 1)."""
from __future__ import annotations

import re
import secrets
from collections.abc import Callable

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
PREFIX = "CS-"
LENGTH = 8
_RE = re.compile(rf"^{re.escape(PREFIX)}[{ALPHABET}]{{{LENGTH}}}$")


def new_order_number(randbelow: Callable[[int], int] = secrets.randbelow) -> str:
    return PREFIX + "".join(ALPHABET[randbelow(len(ALPHABET))] for _ in range(LENGTH))


def is_valid_order_number(value: str) -> bool:
    return bool(_RE.match(value))
