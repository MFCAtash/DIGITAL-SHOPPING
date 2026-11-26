"""ارسال دورهای اعلانهای پیامک/ایمیل/پوش و ضربان قلب worker."""
from __future__ import annotations

import pytest
from django.core import mail

from apps.accounts.models import SmsOutbox
from apps.accounts.sms import RecordingSms
from apps.core.models import Notification
from apps.core.notifications import dispatch_pending_notifications, notify
from apps.core.tasks import dispatch_notifications_task, worker_heartbeat_task
from tests.factories import UserFactory

pytestmark = pytest.mark.django_db

PUSHED: list[tuple[str, str]] = []


def recording_push(user, notification):
    PUSHED.append((user.phone, notification.title))


def broken_push(user, notification):
    raise RuntimeError("provider down")


def test_periodic_tasks_are_registered():
    assert dispatch_notifications_task.name == "core.notification_dispatch"
    assert worker_heartbeat_task.name == "core.worker_heartbeat"


def test_sms_notification_is_dispatched_and_in_app_is_untouched():
    RecordingSms.reset()
    user = UserFactory()
    sms = notify(user, "order.paid", "پرداخت موفق", "سفارش پرداخت شد", channel=Notification.Channel.SMS)
    in_app = Notification.objects.create(user=user, event="x", title="داخل سایت", status=Notification.Status.PENDING)

    assert dispatch_pending_notifications() == {"sent": 1, "failed": 0, "skipped": 0}
    sms.refresh_from_db()
    in_app.refresh_from_db()
    assert sms.status == Notification.Status.SENT
    assert in_app.status == Notification.Status.PENDING
    assert RecordingSms.sent == [(user.phone, "پرداخت موفق\nسفارش پرداخت شد")]
    assert SmsOutbox.objects.count() == 0  # اعلان مستقیم از آداپتور استفاده میکند، نه صف OTP
    assert dispatch_pending_notifications()["sent"] == 0  # تکرار بیاثر است


def test_email_and_push_use_configured_adapters(settings):
    user = UserFactory()
    email = notify(user, "order.paid", "ایمیل", "متن", payload={"email": "buyer@example.com"}, channel=Notification.Channel.EMAIL)
    PUSHED.clear()
    settings.NOTIFICATION_PUSH_ADAPTER = "tests.test_notification_dispatch.recording_push"
    push = notify(user, "order.paid", "پوش", "متن", channel=Notification.Channel.PUSH)

    assert dispatch_notifications_task(0) == {"sent": 2, "failed": 0, "skipped": 0}
    email.refresh_from_db()
    push.refresh_from_db()
    assert email.status == push.status == Notification.Status.SENT
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ["buyer@example.com"]
    assert PUSHED == [(user.phone, "پوش")]


def test_failed_adapter_marks_only_that_notification_failed(settings):
    user = UserFactory()
    settings.NOTIFICATION_PUSH_ADAPTER = "tests.test_notification_dispatch.broken_push"
    bad = notify(user, "a", "پوش", "متن", channel=Notification.Channel.PUSH)
    good = notify(user, "b", "پیامک", "متن", channel=Notification.Channel.SMS)

    counts = dispatch_pending_notifications()
    assert counts == {"sent": 1, "failed": 1, "skipped": 0}
    bad.refresh_from_db()
    good.refresh_from_db()
    assert bad.status == Notification.Status.FAILED and "provider down" in bad.payload["last_error"]
    assert good.status == Notification.Status.SENT


def test_unconfigured_push_is_skipped_and_reported(settings, tmp_path):
    settings.NOTIFICATION_PUSH_ADAPTER = ""
    user = UserFactory()
    row = notify(user, "a", "پوش", "متن", channel=Notification.Channel.PUSH)
    assert dispatch_pending_notifications()["skipped"] == 1
    row.refresh_from_db()
    assert row.status == Notification.Status.PENDING


def test_worker_heartbeat_writes_file(settings, tmp_path):
    settings.WORKER_HEARTBEAT_FILE = str(tmp_path / "heartbeat")
    worker_heartbeat_task(12345)
    assert (tmp_path / "heartbeat").read_text(encoding="utf-8") == "12345"
