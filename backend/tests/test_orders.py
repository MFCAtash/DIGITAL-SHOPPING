"""تست‌های دیتابیسی سفارش (نیاز به Postgres؛ نگاه کنید به README)."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import override_settings
from django.utils import timezone

from apps.catalog.models import Product
from apps.core.models import AuditLog
from apps.orders.models import Order, Shipment, ShippingMethod
from apps.orders.services import (
    EmptyOrder,
    IdempotencyConflict,
    NotPurchasable,
    OrderError,
    OutOfStock,
    ShipmentError,
    advance_shipment,
    change_status,
    ensure_shipment,
    expire_pending_orders,
    place_order,
    run_expiry,
    verify_order_totals,
)
from apps.orders.states import InvalidTransition, OrderStatus
from tests.factories import ProductFactory, UserFactory

pytestmark = pytest.mark.django_db


def key() -> str:
    return str(uuid.uuid4())


def test_price_comes_from_database_not_client(rate):
    product = ProductFactory(price_usd_cents=20000, discount_percent=10, stock=3)
    order = place_order(UserFactory(), [(product.pk, 2)], key())
    item = order.items.get()
    assert item.unit_usd_cents == 18000          # ۲۰۰ دلار منهای ۱۰٪
    assert order.total_usd_cents == 36000
    assert order.total_toman == item.unit_toman * 2
    assert order.rate_used == 1_000_000
    product.refresh_from_db()
    assert product.stock == 1
    assert AuditLog.objects.filter(action="order.create", object_id=str(order.pk)).exists()


def test_idempotent_same_key_returns_same_order(rate):
    product, user = ProductFactory(stock=5), UserFactory()
    k = key()
    a = place_order(user, [(product.pk, 1)], k)
    b = place_order(user, [(product.pk, 1)], k)
    assert a.pk == b.pk and Order.objects.count() == 1
    product.refresh_from_db()
    assert product.stock == 4  # فقط یک بار کم شده


def test_duplicate_product_lines_are_merged(rate):
    product = ProductFactory(stock=5)
    order = place_order(UserFactory(), [(product.pk, 1), (product.pk, 2)], key())
    assert order.items.get().qty == 3


def test_unavailable_products_are_rejected(rate):
    # پرچم قدیمی purchasable دیگر مانع سفارش نیست؛ فقط وضعیت/قیت نامعتبر رد میشود.
    for kwargs in ({"status": Product.Status.HIDDEN}, {"price_usd_cents": None}):
        product = ProductFactory(**kwargs)
        with pytest.raises(NotPurchasable):
            place_order(UserFactory(), [(product.pk, 1)], key())
    approx = ProductFactory(purchasable=False)
    assert place_order(UserFactory(), [(approx.pk, 1)], key()).items.count() == 1


def test_failure_rolls_back_everything(rate):
    ok, short = ProductFactory(stock=5), ProductFactory(stock=1)
    with pytest.raises(OutOfStock):
        place_order(UserFactory(), [(ok.pk, 2), (short.pk, 2)], key())
    ok.refresh_from_db()
    assert ok.stock == 5 and Order.objects.count() == 0


def test_invalid_quantities_and_empty(rate):
    product = ProductFactory()
    for bad in (0, -1, 1.5, True):
        with pytest.raises(OrderError):
            place_order(UserFactory(), [(product.pk, bad)], key())
    with pytest.raises(EmptyOrder):
        place_order(UserFactory(), [], key())


def test_cancel_restores_stock_and_audits(rate):
    product = ProductFactory(stock=5)
    order = place_order(UserFactory(), [(product.pk, 2)], key())
    change_status(order.pk, OrderStatus.CANCELLED)
    product.refresh_from_db()
    assert product.stock == 5
    assert AuditLog.objects.filter(action="order.status", object_id=str(order.pk)).exists()


def test_invalid_transition_is_rejected(rate):
    order = place_order(UserFactory(), [(ProductFactory().pk, 1)], key())
    with pytest.raises(InvalidTransition):
        change_status(order.pk, OrderStatus.SHIPPED)


def test_expire_pending_orders(rate):
    product = ProductFactory(stock=5)
    order = place_order(UserFactory(), [(product.pk, 2)], key())
    assert expire_pending_orders(now=timezone.now()) == 0           # هنوز منقضی نشده
    assert expire_pending_orders(now=order.expires_at + timedelta(seconds=1)) == 1
    product.refresh_from_db()
    assert product.stock == 5 and Order.objects.get().status == OrderStatus.CANCELLED.value


@pytest.mark.django_db(transaction=True)
def test_concurrent_orders_never_oversell(rate):
    """مهم‌ترین تست: ۲۰ خرید هم‌زمان از موجودی ۵ تایی؛ فقط ۵ موفق. (SQLite قفل سطح جدول دارد → در CI با Postgres)"""
    from django.db import connection

    if connection.vendor == "sqlite":
        pytest.skip("SQLite برای آزمون هم‌زمانی مناسب نیست؛ در CI با Postgres اجرا می‌شود.")
    product = ProductFactory(stock=5)
    users = [UserFactory() for _ in range(20)]

    def buy(i):
        try:
            place_order(users[i], [(product.pk, 1)], key())
            return "ok"
        except OutOfStock:
            return "sold_out"
        finally:
            connection.close()  # هر ترد اتصال خودش را می‌بندد

    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(buy, range(20)))
    product.refresh_from_db()
    assert results.count("ok") == 5 and results.count("sold_out") == 15
    assert product.stock == 0 and Order.objects.count() == 5


@pytest.mark.django_db(transaction=True)
def test_concurrent_same_idempotency_key_creates_one_order(rate):
    from django.db import connection as db_connection

    if db_connection.vendor == "sqlite":
        pytest.skip("SQLite برای آزمون هم‌زمانی مناسب نیست؛ در CI با Postgres اجرا می‌شود.")
    product, user, k = ProductFactory(stock=10), UserFactory(), key()

    def buy(_):
        try:
            return place_order(user, [(product.pk, 1)], k).pk
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=8) as pool:
        ids = set(pool.map(buy, range(8)))
    product.refresh_from_db()
    assert len(ids) == 1 and Order.objects.count() == 1 and product.stock == 9


# ---------- رفع باگ idempotency (مرحلهٔ ۱.۴) ----------


def test_same_key_for_two_users_never_leaks_orders(rate):
    """کلید فقط در محدودهٔ کاربر یکتاست: کاربر دوم با همان کلید سفارش خودش را می‌سازد، نه سفارش کاربر اول را می‌بیند."""
    product, alice, bob, k = ProductFactory(stock=5), UserFactory(), UserFactory(), key()
    a = place_order(alice, [(product.pk, 1)], k)
    b = place_order(bob, [(product.pk, 2)], k)
    assert a.pk != b.pk
    assert a.user_id == alice.pk and b.user_id == bob.pk
    assert Order.objects.count() == 2
    product.refresh_from_db()
    assert product.stock == 2  # ۱ + ۲ کم شده


def test_same_key_with_different_cart_is_conflict(rate):
    product, other, user, k = ProductFactory(stock=5), ProductFactory(stock=5), UserFactory(), key()
    place_order(user, [(product.pk, 1)], k)
    with pytest.raises(IdempotencyConflict):
        place_order(user, [(product.pk, 2)], k)
    with pytest.raises(IdempotencyConflict):
        place_order(user, [(other.pk, 1)], k)
    product.refresh_from_db()
    assert product.stock == 4 and Order.objects.count() == 1  # تلاش‌های ناسازگار اثری نداشتند


def test_same_key_with_different_address_is_conflict(rate):
    product, user, k = ProductFactory(stock=5), UserFactory(), key()
    place_order(user, [(product.pk, 1)], k, address={"city": "تهران"})
    place_order(user, [(product.pk, 1)], k, address={"city": "تهران"})  # تکرار عینی مجاز است
    with pytest.raises(IdempotencyConflict):
        place_order(user, [(product.pk, 1)], k, address={"city": "شیراز"})


def test_line_order_and_duplicate_lines_do_not_make_conflict(rate):
    a, b, user, k = ProductFactory(stock=9), ProductFactory(stock=9), UserFactory(), key()
    first = place_order(user, [(a.pk, 1), (b.pk, 2), (a.pk, 1)], k)
    second = place_order(user, [(b.pk, 2), (a.pk, 2)], k)
    assert first.pk == second.pk


def test_invalid_idempotency_keys_are_rejected(rate):
    product, user = ProductFactory(stock=5), UserFactory()
    for bad in ("k1", "same", "", "x" * 65, str(uuid.uuid4()) + "0" * 40):
        with pytest.raises(OrderError):
            place_order(user, [(product.pk, 1)], bad)
    assert Order.objects.count() == 0


def test_db_constraint_is_per_user(rate):
    from django.db import IntegrityError, transaction

    product, user, k = ProductFactory(stock=5), UserFactory(), key()
    order = place_order(user, [(product.pk, 1)], k)
    with pytest.raises(IntegrityError), transaction.atomic():
        Order.objects.create(user=user, idempotency_key=k, rate_used=order.rate_used, expires_at=order.expires_at)
    Order.objects.create(user=UserFactory(), idempotency_key=k, rate_used=order.rate_used, expires_at=order.expires_at)  # کاربر دیگر مجاز است


# ---------- زمان‌بند و آزادسازی موجودی (مرحلهٔ ۱.۵) ----------


def test_run_expiry_audits_batch_and_restocks(rate):
    product = ProductFactory(stock=10)
    o1 = place_order(UserFactory(), [(product.pk, 2)], key())
    o2 = place_order(UserFactory(), [(product.pk, 3)], key())
    later = max(o1.expires_at, o2.expires_at) + timedelta(seconds=1)
    assert run_expiry(now=later) == 2
    product.refresh_from_db()
    assert product.stock == 10
    batch = AuditLog.objects.get(action="order.expire_batch")
    assert batch.after["count"] == 2 and sorted(batch.after["order_ids"]) == sorted([o1.pk, o2.pk])
    assert run_expiry(now=later) == 0                                # بار دوم کاری برای انجام نیست
    assert AuditLog.objects.filter(action="order.expire_batch").count() == 1  # و خلاصهٔ تکراری ثبت نمی‌شود


def test_paid_orders_are_never_expired(rate):
    product = ProductFactory(stock=5)
    order = place_order(UserFactory(), [(product.pk, 1)], key())
    change_status(order.pk, OrderStatus.PAID)
    assert run_expiry(now=order.expires_at + timedelta(hours=1)) == 0
    assert Order.objects.get().status == OrderStatus.PAID.value


def test_expire_command_runs_without_worker(rate):
    from django.core.management import call_command

    product = ProductFactory(stock=5)
    order = place_order(UserFactory(), [(product.pk, 1)], key())
    Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    call_command("expire_pending_orders")
    assert Order.objects.get().status == OrderStatus.CANCELLED.value


def test_periodic_task_is_registered():
    """کار periodic با procrastinate ثبت شده و هر دقیقه اجرا می‌شود (آزمون ثبت، نه اجرای worker)."""
    from apps.orders.tasks import expire_pending_orders_task

    assert expire_pending_orders_task.name == "orders.expire_pending_orders"


def test_hidden_brand_is_rejected_at_order_placement(rate):
    """رگرسیون: کالایی که قبل از پنهان شدن برندش در سبد بوده قابل سفارش نیست (تطابق case-insensitive)."""
    product = ProductFactory(brand="Starlink", stock=5)
    with pytest.raises(NotPurchasable):
        place_order(UserFactory(), [(product.pk, 1)], key())
    with override_settings(HIDDEN_BRANDS=["  starlink  "]):
        with pytest.raises(NotPurchasable):
            place_order(UserFactory(), [(product.pk, 1)], key())
    product.brand = "Xiaomi"
    product.save(update_fields=["brand"])
    assert place_order(UserFactory(), [(product.pk, 1)], key()).items.count() == 1


def test_verify_order_totals_checks_shipping_method_and_rate(rate):
    ShippingMethod.objects.create(code="post", name="پست", base_toman=80_000)
    order = place_order(UserFactory(), [(ProductFactory(price_usd_cents=1000).pk, 1)], key(), {"province": "تهران"}, "post")
    verify_order_totals(order)  # سالم است

    order.shipping_toman += 1
    with pytest.raises(OrderError):
        verify_order_totals(order)
    order.shipping_toman -= 1

    order.shipping_code = "unknown"
    with pytest.raises(OrderError):
        verify_order_totals(order)
    order.shipping_code = "post"

    order.rate_used += 1
    with pytest.raises(OrderError):
        verify_order_totals(order)
    order.rate_used -= 1

    order.shipping_code = ""
    order.shipping_toman = 80_000
    with pytest.raises(OrderError):
        verify_order_totals(order)


def test_shipment_created_and_advanced_with_order_status(rate):
    order = place_order(UserFactory(), [(ProductFactory().pk, 1)], key())
    assert not Shipment.objects.filter(order=order).exists()

    change_status(order.pk, OrderStatus.PAID)
    change_status(order.pk, OrderStatus.PROCESSING)
    change_status(order.pk, OrderStatus.SHIPPED)
    shipment = Shipment.objects.get(order=order)
    assert shipment.status == Shipment.Status.HANDED_OVER and shipment.shipped_at

    change_status(order.pk, OrderStatus.DELIVERED)
    shipment.refresh_from_db()
    assert shipment.status == Shipment.Status.DELIVERED and shipment.delivered_at
    assert ensure_shipment(order).pk == shipment.pk  # idempotent
    assert AuditLog.objects.filter(action="shipment.status", object_id=str(shipment.pk)).count() == 2

    with pytest.raises(ShipmentError):
        advance_shipment(shipment.pk, Shipment.Status.PREPARING)
