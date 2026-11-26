"""کارهای دورهای core: ارسال اعلانهای خارج از سایت و ضربان قلب worker.

این ماژول توسط procrastinate.contrib.django بهصورت خودکار کشف میشود (مانند tasks.py سایر اپها).
"""
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from procrastinate.contrib.django import app

from .notifications import dispatch_pending_notifications


@app.periodic(cron="* * * * *")
@app.task(name="core.notification_dispatch", queueing_lock="core.notification_dispatch")
def dispatch_notifications_task(timestamp: int) -> dict:
    """هر دقیقه اعلانهای pending پیامک/ایمیل/پوش را ارسال میکند؛ اعلان in-app دستخوش نمیشود."""
    return dispatch_pending_notifications()


@app.periodic(cron="* * * * *")
@app.task(name="core.worker_heartbeat", queueing_lock="core.worker_heartbeat")
def worker_heartbeat_task(timestamp: int) -> str:
    """ردیفی مینویسد تا healthcheck worker در compose بفهمد صف کار زنده است."""
    path = Path(settings.WORKER_HEARTBEAT_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(str(timestamp), encoding="utf-8")
    return str(path)
