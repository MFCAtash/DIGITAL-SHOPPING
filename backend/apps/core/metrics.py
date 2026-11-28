"""متریک‌های سبک Prometheus بدون وابستگی خارجی.

چرا دست‌ساز؟ تا در هر محیطی (حتی بدون شبکه برای نصب پکیج) کار کند و قرارداد
`ops/monitoring/prometheus.yml` را واقعاً پُر کند. شمارنده‌ها در حافظهٔ هر پروسه‌اند؛
برای چند worker، Prometheus هر instance را جداگانه scrape می‌کند (که رفتار درست است).

قالب خروجی: Prometheus text exposition format 0.0.4.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict

_LOCK = threading.Lock()
_COUNTERS: dict[tuple[str, tuple[tuple[str, str], ...]], float] = defaultdict(float)
_HISTOGRAMS: dict[tuple[str, tuple[tuple[str, str], ...]], dict[float, int]] = {}
_HIST_SUM: dict[tuple[str, tuple[tuple[str, str], ...]], float] = defaultdict(float)
_HIST_COUNT: dict[tuple[str, tuple[tuple[str, str], ...]], int] = defaultdict(int)
_IN_PROGRESS: dict[tuple[str, tuple[tuple[str, str], ...]], int] = defaultdict(int)

# سطل‌های تأخیر (ثانیه) — پوشش p50 تا p99 برای API
BUCKETS = (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)

STARTED_AT = time.time()


def _key(name: str, labels: dict[str, str] | None):
    return name, tuple(sorted((labels or {}).items()))


def inc(name: str, value: float = 1, **labels: str) -> None:
    with _LOCK:
        _COUNTERS[_key(name, labels)] += value


def observe(name: str, value: float, **labels: str) -> None:
    k = _key(name, labels)
    with _LOCK:
        buckets = _HISTOGRAMS.setdefault(k, {b: 0 for b in BUCKETS})
        for b in BUCKETS:
            if value <= b:
                buckets[b] += 1
        _HIST_SUM[k] += value
        _HIST_COUNT[k] += 1


def in_progress(name: str, **labels: str) -> None:
    with _LOCK:
        _IN_PROGRESS[_key(name, labels)] += 1


def progress_done(name: str, **labels: str) -> None:
    with _LOCK:
        k = _key(name, labels)
        _IN_PROGRESS[k] = max(0, _IN_PROGRESS.get(k, 0) - 1)


def _fmt_labels(labels: tuple[tuple[str, str], ...], extra: dict[str, str] | None = None) -> str:
    merged = dict(labels)
    if extra:
        merged.update(extra)
    if not merged:
        return ""
    inner = ",".join(f'{k}="{v}"' for k, v in merged.items())
    return "{" + inner + "}"


def _escape_help(text: str) -> str:
    return text.replace("\\", "\\\\").replace("\n", "\\n")


HELP = {
    "digital_shopping_http_requests_total": "کل درخواست‌های HTTP بر اساس مسیر نرمال‌شده، متد و کد وضعیت.",
    "digital_shopping_http_request_duration_seconds": "توزیع زمان پاسخ HTTP.",
    "digital_shopping_http_in_progress": "درخواست‌های در حال اجرا.",
    "digital_shopping_orders_created_total": "سفارش‌های ثبت‌شده.",
    "digital_shopping_orders_paid_total": "سفارش‌های پرداخت‌شده.",
    "digital_shopping_payments_started_total": "پرداخت‌های آغازشده (ریدایرکت به درگاه).",
    "digital_shopping_payments_failed_total": "پرداخت‌های ناموفق.",
    "digital_shopping_coupon_applied_total": "کوپن‌های اعمال‌شده روی سفارش.",
    "digital_shopping_search_zero_results_total": "جست‌وجوهای بدون نتیجه.",
    "digital_shopping_process_start_time_seconds": "زمان شروع پروسه (Unix).",
}


def render() -> str:
    lines: list[str] = []
    with _LOCK:
        counters = dict(_COUNTERS)
        histograms = {k: dict(v) for k, v in _HISTOGRAMS.items()}
        hist_sum = dict(_HIST_SUM)
        hist_count = dict(_HIST_COUNT)
        inprog = dict(_IN_PROGRESS)

    emitted: set[str] = set()
    for (name, labels), value in sorted(counters.items()):
        if name not in emitted:
            lines.append(f"# HELP {name} {_escape_help(HELP.get(name, name))}")
            lines.append(f"# TYPE {name} counter")
            emitted.add(name)
        lines.append(f"{name}{_fmt_labels(labels)} {value:g}")

    for (name, labels), buckets in sorted(histograms.items()):
        if name not in emitted:
            lines.append(f"# HELP {name} {_escape_help(HELP.get(name, name))}")
            lines.append(f"# TYPE {name} histogram")
            emitted.add(name)
        for b in BUCKETS:
            lines.append(f'{name}_bucket{_fmt_labels(labels, {"le": str(b)})} {buckets.get(b, 0)}')
        lines.append(f'{name}_bucket{_fmt_labels(labels, {"le": "+Inf"})} {hist_count.get((name, labels), 0)}')
        lines.append(f"{name}_sum{_fmt_labels(labels)} {hist_sum.get((name, labels), 0):g}")
        lines.append(f"{name}_count{_fmt_labels(labels)} {hist_count.get((name, labels), 0)}")

    for (name, labels), value in sorted(inprog.items()):
        if name not in emitted:
            lines.append(f"# HELP {name} {_escape_help(HELP.get(name, name))}")
            lines.append(f"# TYPE {name} gauge")
            emitted.add(name)
        lines.append(f"{name}{_fmt_labels(labels)} {value}")

    if "digital_shopping_process_start_time_seconds" not in emitted:
        lines.append("# HELP digital_shopping_process_start_time_seconds زمان شروع پروسه (Unix).")
        lines.append("# TYPE digital_shopping_process_start_time_seconds gauge")
    lines.append(f"digital_shopping_process_start_time_seconds {STARTED_AT:.0f}")
    return "\n".join(lines) + "\n"


def normalize_path(path: str) -> str:
    """شناسه‌های عددی/UUID را جایگزین می‌کند تا کاردینالیتی منفجر نشود."""
    parts = []
    for part in path.strip("/").split("/"):
        if not part:
            continue
        if part.isdigit() or (len(part) >= 8 and all(c in "0123456789abcdef-" for c in part.lower())):
            parts.append("{id}")
        else:
            parts.append(part)
    return "/" + "/".join(parts)


def reset() -> None:
    """فقط برای تست‌ها."""
    with _LOCK:
        _COUNTERS.clear()
        _HISTOGRAMS.clear()
        _HIST_SUM.clear()
        _HIST_COUNT.clear()
        _IN_PROGRESS.clear()
