"""رابط درگاه پرداخت + درگاه آزمایشی (FakeGateway). منطق خالص؛ بدون Django و بدون شبکه.

اصل: به پارامترهای callback مرورگر هرگز اعتماد نکن؛ همیشه verify سمت سرور و مقایسهٔ مبلغ.
واحد مبلغ: بعضی درگاه‌ها ریال و بعضی تومان می‌گیرند؛ تبدیل فقط در `to_gateway_amount` (تست‌شده) انجام می‌شود.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal, Protocol
from urllib.parse import urlencode
from urllib.request import Request, urlopen

AmountUnit = Literal["toman", "rial"]
SCENARIOS = ("success", "failed", "timeout", "wrong_amount", "duplicate")


def to_gateway_amount(toman: int, unit: AmountUnit) -> int:
    if isinstance(toman, bool) or not isinstance(toman, int) or toman <= 0:
        raise ValueError("مبلغ باید عدد صحیح مثبت (تومان) باشد")
    return toman * 10 if unit == "rial" else toman


def from_gateway_amount(amount: int, unit: AmountUnit) -> int:
    """مبلغ برگشتی درگاه را به تومان برمی‌گرداند (ریال باید بر ۱۰ بخش‌پذیر باشد وگرنه ValueError)."""
    if unit == "rial":
        if amount % 10:
            raise ValueError("مبلغ ریالی بر ۱۰ بخش‌پذیر نیست")
        return amount // 10
    return amount


@dataclass(frozen=True)
class GatewayStart:
    authority: str
    redirect_url: str


@dataclass(frozen=True)
class VerifyResult:
    status: Literal["verified", "failed", "pending"]
    ref_id: str | None = None
    #: مبلغ پرداخت‌شده به **تومان** (پس از تبدیل واحد)؛ برای verified
    paid_toman: int | None = None


@dataclass(frozen=True)
class RefundResult:
    """نتیجهٔ فراخوان بازپرداخت درگاه؛ وضعیت pending یعنی درگاه پذیرفت ولی نهایی نشده است."""

    status: Literal["refunded", "pending", "failed"]
    ref_id: str | None = None


class Gateway(Protocol):
    name: str
    amount_unit: AmountUnit

    def start(self, *, order_number: str, amount_toman: int, callback_url: str) -> GatewayStart: ...
    def verify(self, *, authority: str, amount_toman: int, params: dict[str, str]) -> VerifyResult: ...
    def inquire(self, *, authority: str, amount_toman: int) -> VerifyResult: ...
    def refund(self, *, authority: str, amount_toman: int, ref_id: str = "") -> RefundResult: ...


class FakeGateway:
    """درگاه آزمایشی: سناریو داخل خود authority کدگذاری می‌شود (`FAKE<hex>.<scenario>`) تا بین پروسه‌ها بدون ذخیره کار کند.

    - success: callback و verify موفق، مبلغ برابر.
    - failed: کاربر انصراف داد (status=NOK) ⇒ verify شکست.
    - timeout: callback هرگز نمی‌رسد/نتیجه مبهم؛ verify = pending، اما استعلام (inquire) بعداً «پرداخت شده» می‌گوید (مغایرت‌گیری).
    - wrong_amount: پرداخت موفق ولی مبلغ کمتر ⇒ باید needs_review شود.
    - duplicate: مثل success؛ callback دوبار می‌رسد و باید فقط یک‌بار اثر کند.
    """

    name = "fake"
    amount_unit: AmountUnit = "toman"

    def __init__(self, scenario: str = "success", uuid_hex: Callable[[], str] = lambda: uuid.uuid4().hex):
        if scenario not in SCENARIOS:
            raise ValueError(f"سناریوی ناشناخته: {scenario}")
        self.scenario = scenario
        self._uuid_hex = uuid_hex

    @staticmethod
    def scenario_of(authority: str) -> str:
        sc = authority.rsplit(".", 1)[-1] if authority.startswith("FAKE") and "." in authority else ""
        return sc if sc in SCENARIOS else "failed"  # authority نامعتبر هرگز موفق حساب نمی‌شود

    def start(self, *, order_number: str, amount_toman: int, callback_url: str) -> GatewayStart:
        to_gateway_amount(amount_toman, self.amount_unit)  # اعتبارسنجی مبلغ
        authority = f"FAKE{self._uuid_hex()}.{self.scenario}"
        status = "NOK" if self.scenario == "failed" else "OK"
        sep = "&" if "?" in callback_url else "?"
        return GatewayStart(authority, f"{callback_url}{sep}{urlencode({'authority': authority, 'status': status, 'order': order_number})}")

    def verify(self, *, authority: str, amount_toman: int, params: dict[str, str]) -> VerifyResult:
        sc = self.scenario_of(authority)
        if params.get("status") != "OK" or sc == "failed":
            return VerifyResult("failed")
        if sc == "timeout":
            return VerifyResult("pending")
        paid = amount_toman - 1000 if sc == "wrong_amount" else amount_toman
        return VerifyResult("verified", ref_id=f"REF-{authority[4:12]}", paid_toman=paid)

    def inquire(self, *, authority: str, amount_toman: int) -> VerifyResult:
        sc = self.scenario_of(authority)
        if sc == "failed":
            return VerifyResult("failed")
        paid = amount_toman - 1000 if sc == "wrong_amount" else amount_toman
        return VerifyResult("verified", ref_id=f"REF-{authority[4:12]}", paid_toman=paid)

    def refund(self, *, authority: str, amount_toman: int, ref_id: str = "") -> RefundResult:
        """درگاه آزمایشی هیچ تماس شبکهای نمیزند؛ بازپرداخت همیشه موفق فرض میشود."""
        return RefundResult("refunded", ref_id=ref_id or f"REF-{authority[4:12]}")


class GatewayError(Exception):
    """خطای ارتباط با درگاه یا پاسخ نامعتبر."""


def hmac_signature(secret: str, authority: str, paid_amount: int, ref_id: str) -> str:
    """امضای پاسخ درگاه. کلاینت هرگز نباید بدون تأیید این امضا پرداختی را موفق بداند."""
    payload = f"{authority}:{paid_amount}:{ref_id}".encode()
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def http_post(url: str, payload: dict, headers: dict[str, str]) -> dict:
    """POST JSON با stdlib؛ پاسخ غیر ۲xx یا JSON نامعتبر خطا است."""
    req = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urlopen(req, timeout=10) as resp:  # noqa: S310 — URL از تنظیمات امن میآید
            if resp.status >= 300:
                raise GatewayError(f"gateway_status_{resp.status}")
            data = json.loads(resp.read().decode("utf-8"))
    except GatewayError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise GatewayError(str(exc)) from exc
    if not isinstance(data, dict):
        raise GatewayError("gateway_bad_response")
    return data


class HttpGateway:
    """آداپتور درگاه واقعی بر بستر HTTP با تأیید امضا و مقایسهٔ مبلغ.

    پیکربندی: `PAYMENT_START_URL`, `PAYMENT_VERIFY_URL`, `PAYMENT_REFUND_URL`, `PAYMENT_API_KEY`,
    `PAYMENT_CALLBACK_SECRET`, `PAYMENT_AMOUNT_UNIT`.
    """

    name = "http"

    def __init__(
        self, *, start_url: str, verify_url: str, api_key: str, secret: str,
        amount_unit: AmountUnit = "toman", refund_url: str = "", post=http_post,
    ):
        if not all((start_url, verify_url, api_key, secret)):
            raise GatewayError("PAYMENT_* تنظیم نشدهاند")
        self.start_url, self.verify_url, self.secret, self.amount_unit = start_url, verify_url, secret, amount_unit
        self.refund_url, self.api_key, self.post = refund_url, api_key, post

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def start(self, *, order_number: str, amount_toman: int, callback_url: str) -> GatewayStart:
        amount = to_gateway_amount(amount_toman, self.amount_unit)
        data = self.post(self.start_url, {"order": order_number, "amount": amount, "callback": callback_url}, self._headers())
        authority, redirect_url = data.get("authority"), data.get("redirect_url")
        if not authority or not redirect_url:
            raise GatewayError("gateway_start_incomplete")
        return GatewayStart(str(authority), str(redirect_url))

    def _verify_response(self, authority: str, amount_toman: int, data: dict) -> VerifyResult:
        status = data.get("status")
        if status not in ("verified", "failed", "pending"):
            raise GatewayError("gateway_bad_status")
        if status == "failed":
            return VerifyResult("failed")
        if status == "pending":
            return VerifyResult("pending")
        ref_id = str(data.get("ref_id") or "")
        # مبلغ برگشتی به واحد درگاه است و باید به تومان تبدیل شود.
        paid_amount = int(data.get("paid_amount") or 0)
        paid_toman = from_gateway_amount(paid_amount, self.amount_unit)
        signature = str(data.get("signature") or "")
        expected = hmac_signature(self.secret, authority, paid_amount, ref_id)
        if not hmac.compare_digest(signature, expected):
            raise GatewayError("gateway_bad_signature")
        if paid_toman < amount_toman:  # پرداخت کمتر از مبلغ سفارش ⇒ نیاز به بازبینی
            return VerifyResult("verified", ref_id=ref_id, paid_toman=paid_toman)
        return VerifyResult("verified", ref_id=ref_id, paid_toman=paid_toman)

    def verify(self, *, authority: str, amount_toman: int, params: dict[str, str]) -> VerifyResult:
        data = self.post(self.verify_url, {"authority": authority, "amount": to_gateway_amount(amount_toman, self.amount_unit)}, self._headers())
        return self._verify_response(authority, amount_toman, data)

    def inquire(self, *, authority: str, amount_toman: int) -> VerifyResult:
        data = self.post(self.verify_url, {"authority": authority, "amount": to_gateway_amount(amount_toman, self.amount_unit), "inquire": True}, self._headers())
        return self._verify_response(authority, amount_toman, data)

    def refund(self, *, authority: str, amount_toman: int, ref_id: str = "") -> RefundResult:
        """فراخوان واقعی بازپرداخت؛ هر پاسخ غیرمجاز/خطای شبکه GatewayError میدهد تا وضعیت محلی تغییر نکند."""
        if not self.refund_url:
            raise GatewayError("PAYMENT_REFUND_URL تنظیم نشده است")
        data = self.post(
            self.refund_url,
            {"authority": authority, "amount": to_gateway_amount(amount_toman, self.amount_unit), "ref_id": ref_id},
            self._headers(),
        )
        status = data.get("status")
        if status not in ("refunded", "pending", "failed"):
            raise GatewayError("gateway_bad_refund_status")
        return RefundResult(status, str(data.get("refund_id") or ref_id or "") or None)
