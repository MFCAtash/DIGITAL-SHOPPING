import pytest
from django.db import IntegrityError

from apps.catalog.models import Product
from apps.core.models import AuditLog
from apps.pricing.models import ExchangeRate, NoActiveRate
from tests.factories import CategoryFactory, ProductFactory

pytestmark = pytest.mark.django_db


def test_only_one_active_rate_and_audit():
    ExchangeRate.activate(900_000)
    ExchangeRate.activate(950_000)
    assert ExchangeRate.objects.filter(is_active=True).count() == 1
    assert ExchangeRate.current().toman_per_usd == 950_000
    assert AuditLog.objects.filter(action="rate.activate").count() == 2


def test_no_rate_raises():
    with pytest.raises(NoActiveRate):
        ExchangeRate.current()


def test_db_forbids_two_active_rates():
    ExchangeRate.objects.create(toman_per_usd=1, is_active=True)
    with pytest.raises(IntegrityError):
        ExchangeRate.objects.create(toman_per_usd=2, is_active=True)


def test_db_constraints_on_product():
    with pytest.raises(IntegrityError):
        ProductFactory(price_usd_cents=0)


def test_db_constraint_discount():
    with pytest.raises(IntegrityError):
        ProductFactory(discount_percent=101)


def test_publish_rule_requires_price_and_image():
    p = ProductFactory(with_image=False, price_usd_cents=None, status=Product.Status.DRAFT, category=CategoryFactory())
    assert set(p.problems_for_publish()) == {"قیمت ندارد", "عکس ندارد"}
    assert ProductFactory().problems_for_publish() == []


def test_audit_log_is_append_only():
    log = AuditLog.record(None, "x", "t", 1)
    with pytest.raises(RuntimeError):
        log.save()
    with pytest.raises(RuntimeError):
        log.delete()
