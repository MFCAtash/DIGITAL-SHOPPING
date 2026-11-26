import hmac
from datetime import datetime

from django.conf import settings
from django.db import connection
from django.http import HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.security import django_auth

from . import metrics
from .models import Notification

router = Router(tags=["core"])


@router.get("/health", response={200: dict, 503: dict}, throttle=[], operation_id="core_health")  # بدون محدودیت: Docker و Uptime Kuma مرتب صدا می‌زنند
def health(request):
    """بررسی سلامت برای Docker، Caddy و Uptime Kuma؛ دیتابیس را هم می‌آزماید."""
    try:
        with connection.cursor() as cur:
            cur.execute("select 1")
            cur.fetchone()
    except Exception:  # noqa: BLE001
        return 503, {"status": "error", "database": "down"}
    return 200, {"status": "ok", "database": "up"}


@router.get("/metrics", throttle=[], auth=None, operation_id="core_metrics", include_in_schema=False)
def prometheus_metrics(request):
    """خروجی Prometheus. اگر METRICS_TOKEN تنظیم شده باشد، هدر `Authorization: Bearer <token>`
    یا پارامتر `?token=` لازم است (Prometheus با `authorization` در scrape_config تنظیم می‌شود)."""
    token = getattr(settings, "METRICS_TOKEN", "")
    if token:
        supplied = request.headers.get("Authorization", "").removeprefix("Bearer ").strip() or request.GET.get("token", "")
        if not hmac.compare_digest(str(supplied), str(token)):
            return HttpResponse("forbidden\n", content_type="text/plain; charset=utf-8", status=403)
    return HttpResponse(metrics.render(), content_type="text/plain; version=0.0.4; charset=utf-8")


# ---------------- اعلانهای کاربر ----------------


class NotificationOut(Schema):
    id: int
    event: str
    title: str
    body: str
    channel: str
    read_at: datetime | None
    created_at: datetime


class NotificationList(Schema):
    items: list[NotificationOut]
    unread_count: int


def _notification_out(n: Notification) -> dict:
    return {
        "id": n.pk, "event": n.event, "title": n.title, "body": n.body,
        "channel": n.channel, "read_at": n.read_at, "created_at": n.created_at,
    }


@router.get("/notifications", response=NotificationList, auth=django_auth, operation_id="core_notification_list")
def notification_list(request, limit: int = 50):
    qs = Notification.objects.filter(user=request.user).order_by("-created_at", "-id")
    unread = qs.filter(read_at__isnull=True).count()
    return {"items": [_notification_out(n) for n in qs[: min(max(limit, 1), 100)]], "unread_count": unread}


@router.post("/notifications/{notification_id}/read", response=NotificationOut, auth=django_auth, operation_id="core_notification_read")
def notification_read(request, notification_id: int):
    n = Notification.objects.filter(pk=notification_id, user=request.user).first()
    if n is None:
        from ninja.errors import HttpError
        raise HttpError(404, "not_found")
    if n.read_at is None:
        n.read_at = timezone.now()
        n.save(update_fields=["read_at"])
    return _notification_out(n)


@router.post("/notifications/read-all", response=dict, auth=django_auth, operation_id="core_notification_read_all")
def notification_read_all(request):
    updated = Notification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
    return {"updated": updated}
