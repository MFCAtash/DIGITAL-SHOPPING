import pytest
from django.test import Client

from apps.accounts.models import Address
from tests.factories import UserFactory
from tests.helpers import ADDRESS, API, jpost

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    c = Client()
    c.force_login(UserFactory())
    return c


def test_requires_login():
    assert Client().get(f"{API}/addresses").status_code == 401


def test_create_normalizes_and_first_becomes_default(client):
    r = jpost(client, "/addresses", {**ADDRESS, "receiver_phone": "+98 912 345 6789", "postal_code": "۱۲۳۴۵-۶۷۸۹۰"})
    assert r.status_code == 201
    a = r.json()
    assert a["receiver_phone"] == "09123456789" and a["postal_code"] == "1234567890" and a["is_default"] is True


def test_invalid_address_lists_field_errors(client):
    r = jpost(client, "/addresses", {**ADDRESS, "province": "x", "postal_code": "12"})
    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "invalid_address" and sorted(body["fields"]) == ["postalCode", "province"]


def test_only_one_default(client):
    a1 = jpost(client, "/addresses", ADDRESS).json()
    a2 = jpost(client, "/addresses", {**ADDRESS, "is_default": True}).json()
    ids = {a["id"]: a["is_default"] for a in client.get(f"{API}/addresses").json()}
    assert ids == {a1["id"]: False, a2["id"]: True}
    assert jpost(client, f"/addresses/{a1['id']}/default").json()["is_default"] is True
    assert Address.objects.filter(is_default=True).count() == 1


def test_limit_of_ten(client):
    for _ in range(10):
        assert jpost(client, "/addresses", ADDRESS).status_code == 201
    r = jpost(client, "/addresses", ADDRESS)
    assert r.status_code == 409 and r.json()["code"] == "address_limit"


def test_cannot_touch_other_users_address(client):
    other = Address.objects.create(user=UserFactory(), receiver_name="x y z", receiver_phone="09120000000", province="تهران", city="تهران", postal_code="1234567890", street="abcdefg")
    assert jpost(client, f"/addresses/{other.pk}", ADDRESS, method="put").status_code == 404
    assert jpost(client, f"/addresses/{other.pk}", method="delete").status_code == 404
    assert jpost(client, f"/addresses/{other.pk}/default").status_code == 404
    assert client.get(f"{API}/addresses").json() == []


def test_delete_default_promotes_another(client):
    a1 = jpost(client, "/addresses", ADDRESS).json()
    a2 = jpost(client, "/addresses", ADDRESS).json()
    assert jpost(client, f"/addresses/{a1['id']}", method="delete").status_code == 200
    rest = client.get(f"{API}/addresses").json()
    assert [(a["id"], a["is_default"]) for a in rest] == [(a2["id"], True)]
