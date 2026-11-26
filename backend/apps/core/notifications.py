"""ایجاد اعلان درونبرنامهای و ارسال دورهای اعلانهای سایر کانالها.

هیچ محتوای حساسی (کد OTP، رمز، آدرس کامل) در اعلان ذخیره نمیشود.
اعلان in-app دقیقاً همان رفتار پیشین را دارد: در لحظه SENT میشود و توسط worker لمس نمیشود.
"""
from __future__ import annotations

import structlog
from django.conf import settings
from django.core.mail import send_mail
from django.utils.module_loading import import_string

from .models import Notification

log = structlog.get_logger(__name__)


class NotificationError(Exception):
    """آداپتور کانال نتوانست اعلان را ارسال کند."""


def notify(user, event: str, title: str, body: str = "", payload: dict | None = None, channel: str = Notification.Channel.IN_APP) -> Notification:
    return Notification.objects.create(
        user=user,
        channel=channel,
        event=event,
        title=title[:200],
        body=body[:2000],
        payload=payload or {},
        status=Notification.Status.SENT if channel == Notification.Channel.IN_APP else Notification.Status.PENDING,
    )


def _sms_sender(user, notification: Notification) -> None:
    """از همان آداپتور پیامک موجود در accounts.sms (HttpSms/RecordingSms) استفاده میکند."""
    phone = getattr(user, "phone", "") or ""
    if not phone:
        raise NotificationError("شمارهای برای ارسال پیامک وجود ندارد")
    text = f"{notification.title}\n{notification.body}".strip()
    from apps.accounts.sms import get_gateway

    get_gateway().send(phone, text)


def _email_sender(user, notification: Notification) -> None:
    recipient = (notification.payload or {}).get("email") or getattr(user, "email", "") or ""
    if not recipient:
        raise NotificationError("نشانی ایمیل گیرنده مشخص نشده است")
    send_mail(
        notification.title,
        notification.body or notification.title,
        settings.DEFAULT_FROM_EMAIL,
        [recipient],
        fail_silently=False,
    )


def _configured_sender(path: str):
    sender = import_string(path)
    if callable(sender):
        return sender
    if hasattr(sender, "send") and callable(sender.send):
        return sender.send
    raise NotificationError(f"آداپتور اعلان قابل فراخوانی نیست: {path}")


def _sender_for(channel: str):
    if channel == Notification.Channel.SMS:
        return _sms_sender
    if channel == Notification.Channel.EMAIL:
        path = getattr(settings, "NOTIFICATION_EMAIL_ADAPTER", "")
        return _configured_sender(path) if path else _email_sender
    if channel == Notification.Channel.PUSH:
        path = getattr(settings, "NOTIFICATION_PUSH_ADAPTER", "")
        return _configured_sender(path) if path else None
    return None


def dispatch_pending_notifications(batch: int = 50) -> dict[str, int]:
    """اعلانهای pending غیر in-app را ارسال میکند؛ شکست هر کانال فقط همان ردیف را ناموفق میسازد."""
    counts = {"sent": 0, "failed": 0, "skipped": 0}
    rows = list(
        Notification.objects.exclude(channel=Notification.Channel.IN_APP)
        .filter(status=Notification.Status.PENDING)
        .select_related("user")
        .order_by("id")[: max(1, batch)]
    )
    for row in rows:
        sender = _sender_for(row.channel)
        if sender is None:
            counts["skipped"] += 1
            continue
        try:
            sender(row.user, row)
        except Exception as exc:  # noqa: BLE001 — شکست ارائهدهنده نباید worker را متوقف کند
            row.status = Notification.Status.FAILED
            row.payload = {**(row.payload or {}), "last_error": f"{type(exc).__name__}: {exc}"[:200]}
            row.save(update_fields=["status", "payload"])
            counts["failed"] += 1
            log.warning("notification_dispatch_failed", id=row.pk, channel=row.channel, error=row.payload["last_error"])
        else:
            row.status = Notification.Status.SENT
            row.save(update_fields=["status"])
            counts["sent"] += 1
    return counts
