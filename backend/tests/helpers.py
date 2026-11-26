import json
import re
import uuid

API = "/api/v1"


def jpost(client, path, data=None, method="post", **extra):
    return getattr(client, method)(f"{API}{path}", data=json.dumps(data if data is not None else {}), content_type="application/json", **extra)


def idem(key=None):
    """هدر Idempotency-Key برای Client جنگو."""
    return {"HTTP_IDEMPOTENCY_KEY": key or str(uuid.uuid4())}


def last_otp_code():
    """آخرین کد پیامک‌شدهٔ RecordingSms (فقط تست)."""
    from apps.accounts.sms import RecordingSms

    assert RecordingSms.sent, "پیامکی ارسال نشده است"
    return re.search(r"\d{6}", RecordingSms.sent[-1][1]).group(0)


ADDRESS = {
    "receiver_name": "علی رضایی", "receiver_phone": "09123456789", "province": "تهران", "city": "تهران",
    "postal_code": "1234567890", "street": "خیابان ولیعصر، کوچهٔ دوم", "plate": "12", "unit": "3", "is_default": False,
}
