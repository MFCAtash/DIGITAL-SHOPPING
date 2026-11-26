"""تستهای جریان مرجوعی و صندوق اعلانها."""
from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.catalog.models import StockMovement
from apps.core.models import AuditLog, Notification
from apps.orders.models import Order, ReturnRequest
from apps.orders.services import ReturnError, approve_return, place_order, refund_return
from apps.orders.states import OrderStatus
from tests.factories import ProductFactory, UserFactory
from tests.helpers import API, jpost

pytestmark = pytest.mark.django_db


def delivered_order(rate):
    p = ProductFactory(price_usd_cents=1000, stock=5)
    u = UserFactory()
    order = place_order(u, [(p.pk, 2)], str(uuid.uuid4()))
    order.status = OrderStatus.DELIVERED.value
    order.save(update_fields=["status"])
    return u, order


def login(user):
    c = Client()
    c.force_login(user)
    return c


def test_return_request_create_list_and_notification(rate):
    u, order = delivered_order(rate)
    item = order.items.first()
    c = login(u)
    r = jpost(c, f"/orders/{order.number}/returns", {"item_id": item.pk, "reason": "مطابقت ندارد"})
    assert r.status_code == 200, r.content
    assert r.json()["status"] == "requested"
    row = ReturnRequest.objects.get(order=order)
    assert row.item_id == item.pk
    assert Notification.objects.filter(user=u, event="return.requested").exists()
    assert AuditLog.objects.filter(action="return.requested").exists()

    listed = c.get(f"{API}/orders/returns")
    assert listed.status_code == 200 and listed.json()["items"][0]["id"] == row.pk

    # یک قلم نمیتواند دوبار درخواست مرجوعی داشته باشد
    duplicate = jpost(c, f"/orders/{order.number}/returns", {"item_id": item.pk, "reason": "دوباره"})
    assert duplicate.status_code == 422 and duplicate.json()["code"] == "invalid_return"


def test_return_request_rejects_pending_and_expired(rate):
    p = ProductFactory(price_usd_cents=1000, stock=5)
    u = UserFactory()
    pending = place_order(u, [(p.pk, 1)], str(uuid.uuid4()))
    c = login(u)
    r = jpost(c, f"/orders/{pending.number}/returns", {"item_id": pending.items.first().pk, "reason": "x"})
    assert r.status_code == 422

    _, delivered = delivered_order(rate)
    Order.objects.filter(pk=delivered.pk).update(created_at=timezone.now() - timedelta(days=8))
    r2 = jpost(c, f"/orders/{delivered.number}/returns", {"item_id": delivered.items.first().pk, "reason": "x"})
    assert r2.status_code == 422


def test_admin_approve_and_refund_restock_and_audit(rate):
    u, order = delivered_order(rate)
    row = ReturnRequest.objects.create(order=order, item=order.items.first(), reason="تست")
    product = order.items.first().product
    before = product.stock
    approve_return(row, actor=u)
    product.refresh_from_db()
    assert product.stock == before + order.items.first().qty
    assert StockMovement.objects.filter(product=product, reason="return").exists()
    refund_return(row, actor=u)
    row.refresh_from_db()
    order.refresh_from_db()
    assert row.status == "refunded" and order.status == OrderStatus.REFUNDED.value
    assert AuditLog.objects.filter(action__startswith="return.").count() == 2
    with pytest.raises(ReturnError):
        approve_return(row)


def test_notifications_are_private_and_read_state(rate):
    u1, u2 = UserFactory(), UserFactory()
    n1 = Notification.objects.create(user=u1, event="a", title="اول")
    Notification.objects.create(user=u2, event="b", title="دوم")
    c = login(u1)
    body = c.get(f"{API}/notifications").json()
    assert body["unread_count"] == 1 and [i["id"] for i in body["items"]] == [n1.pk]

    read = c.post(f"{API}/notifications/{n1.pk}/read")
    assert read.status_code == 200 and read.json()["read_at"]
    assert c.get(f"{API}/notifications").json()["unread_count"] == 0
    assert c.post(f"{API}/notifications/read-all").status_code == 200
    assert Notification.objects.get(pk=n1.pk).read_at is not None
