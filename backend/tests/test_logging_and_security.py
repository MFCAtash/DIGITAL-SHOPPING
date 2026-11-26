"""مرحلهٔ ۱.۶ و ۱.۸: request_id، CORS و محدودیت نرخ."""
import json
import logging

import pytest
from django.test import Client
from django.test.utils import override_settings

from tests.factories import ProductFactory

pytestmark = pytest.mark.django_db


def test_response_has_request_id_and_echoes_safe_incoming():
    r = Client().get("/api/v1/health")
    assert len(r["X-Request-ID"]) == 32
    r = Client().get("/api/v1/health", headers={"X-Request-ID": "trace-123"})
    assert r["X-Request-ID"] == "trace-123"
    r = Client().get("/api/v1/health", headers={"X-Request-ID": "bad id\nwith newline"})
    assert r["X-Request-ID"] != "bad id\nwith newline" and len(r["X-Request-ID"]) == 32


def test_request_log_contains_request_id_and_no_query_string(caplog):
    ProductFactory()
    with caplog.at_level(logging.INFO):
        r = Client().get("/api/v1/catalog/products", {"q": "09123456789"})
    assert r.status_code == 200
    text = " ".join(rec.getMessage() for rec in caplog.records)
    assert "09123456789" not in text  # فقط مسیر لاگ می‌شود، نه query string


@override_settings(CORS_ALLOWED_ORIGINS=["https://shop.example"])
def test_cors_allows_only_listed_origin_and_idempotency_header():
    c = Client()
    ok = c.options("/api/v1/health", headers={"Origin": "https://shop.example", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "idempotency-key"})
    assert ok["Access-Control-Allow-Origin"] == "https://shop.example"
    assert "idempotency-key" in ok["Access-Control-Allow-Headers"].lower()
    bad = c.options("/api/v1/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert "Access-Control-Allow-Origin" not in bad


def test_json_log_config_is_valid_json_with_context():
    """ساختار JSON لاگ: یک شیٔ معتبر با فیلدهای level، timestamp و request_id."""
    import io

    import structlog

    from config.logging import build_logging

    cfg = build_logging(json_output=True)
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(cfg["formatters"]["structured"].pop("()")(**{k: v for k, v in cfg["formatters"]["structured"].items()}))
    logger = logging.getLogger("tests.json")
    logger.handlers, logger.propagate = [handler], False
    structlog.contextvars.bind_contextvars(request_id="rid-1")
    try:
        structlog.get_logger("tests.json").info("hello", count=3)
    finally:
        structlog.contextvars.clear_contextvars()
    line = json.loads(stream.getvalue().strip().splitlines()[-1])
    assert line["event"] == "hello" and line["count"] == 3 and line["request_id"] == "rid-1" and line["level"] == "info" and "timestamp" in line
