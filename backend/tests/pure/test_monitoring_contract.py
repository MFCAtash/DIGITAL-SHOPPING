"""استاتیک: قرارداد مانیتورینگ نباید دچار drift شود (بدون نیاز به Django)."""
from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def test_prometheus_scrapes_the_real_metrics_endpoint():
    prom = read("ops/monitoring/prometheus.yml")
    api = read("backend/apps/core/api.py")
    assert "metrics_path: /api/v1/metrics" in prom
    assert '@router.get("/metrics"' in api
    assert 'targets: ["redis-exporter:9121"]' in prom
    assert "  redis-exporter:" in read("docker-compose.yml")


def test_every_alert_metric_is_exported_or_is_a_prometheus_builtin():
    alerts = read("ops/monitoring/alerts.yml")
    metrics = read("backend/apps/core/metrics.py")
    referenced = {name for name in re.findall(r"\b(digital_shopping_[a-z0-9_]+)\b", alerts)}
    referenced = {re.sub(r"_(bucket|sum|count)$", "", name) for name in referenced}
    assert referenced, "هیچ متریکی در هشدارها یافت نشد"
    missing = sorted(name for name in referenced if name not in metrics)
    assert missing == [], f"متریکهایی که کسی export نمیکند: {missing}"


def test_alertmanager_template_is_rendered_at_container_start():
    compose = read("docker-compose.yml")
    assert "alertmanager-entrypoint.sh" in compose
    assert (ROOT / "ops/monitoring/alertmanager-entrypoint.sh").exists()
    assert "smtp_require_tls: ${SMTP_REQUIRE_TLS}" in read("ops/monitoring/alertmanager.yml")


@pytest.mark.parametrize("anchor", ["api-high-error-rate", "api-high-latency", "worker-backlog", "payment", "database"])
def test_runbook_anchors_exist(anchor):
    assert f'<a id="{anchor}">' in read("docs/RUNBOOK.md")
