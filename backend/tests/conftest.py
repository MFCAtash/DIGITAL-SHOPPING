import pytest
from django.db import transaction

from apps.pricing.models import ExchangeRate


@pytest.fixture
def rate(db):
    return ExchangeRate.activate(1_000_000)


@pytest.fixture(autouse=True)
def _eager_on_commit(monkeypatch):
    """در تست‌های `django_db` تراکنش هرگز commit نمی‌شود و callbackهای `transaction.on_commit`
    اجرا نمی‌شوند. رفتار inline تولید (مثل ارسال فوری پیامک OTP) در تست باید همان لحظه اجرا شود."""
    monkeypatch.setattr(transaction, "on_commit", lambda func, using=None, robust=False: func())
