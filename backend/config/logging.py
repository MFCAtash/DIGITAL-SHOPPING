"""لاگ ساختاریافتهٔ JSON با structlog؛ لاگ‌های stdlib (Django، gunicorn، کتابخانه‌ها) هم همین قالب را می‌گیرند."""
from __future__ import annotations

import structlog

_SHARED = [
    structlog.contextvars.merge_contextvars,  # request_id از RequestIdMiddleware
    structlog.stdlib.add_logger_name,
    structlog.stdlib.add_log_level,
    structlog.processors.TimeStamper(fmt="iso", utc=True),
]


def configure_structlog() -> None:
    structlog.configure(
        processors=[
            *_SHARED,
            structlog.processors.StackInfoRenderer(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def build_logging(json_output: bool = True, level: str = "INFO") -> dict:
    """json_output=True برای prod/staging (یک خط JSON در هر لاگ)، False برای کنسول رنگی توسعه."""
    renderer = structlog.processors.JSONRenderer(ensure_ascii=False) if json_output else structlog.dev.ConsoleRenderer()
    tail = [structlog.processors.format_exc_info] if json_output else []
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": structlog.stdlib.ProcessorFormatter,
                "foreign_pre_chain": [*_SHARED, structlog.stdlib.ExtraAdder()],
                "processors": [structlog.stdlib.ProcessorFormatter.remove_processors_meta, *tail, renderer],
            }
        },
        "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "structured"}},
        "root": {"handlers": ["console"], "level": level},
        "loggers": {"django.utils.autoreload": {"level": "WARNING"}},
    }
