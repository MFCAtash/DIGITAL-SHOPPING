"""بازگشت کاربر از درگاه: verify سمت سرور و ریدایرکت به صفحهٔ سفارش در فرانت. همیشه ریدایرکت (هرگز خطای خام به کاربر)."""
from __future__ import annotations

import structlog
from django.conf import settings
from django.http import HttpResponseNotFound, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .services import PaymentError, handle_callback
from .states import PaymentStatus

log = structlog.get_logger(__name__)

_OUTCOME = {
    PaymentStatus.VERIFIED.value: "success",
    PaymentStatus.FAILED.value: "failed",
    PaymentStatus.NEEDS_REVIEW.value: "review",
    PaymentStatus.REFUNDED.value: "refunded",
}


@csrf_exempt  # درگاه نمیتواند توکن CSRF بفرستد؛ امنیت از طریق HMAC و verify سمتسرور تأمین میشود
@require_http_methods(["GET", "POST"])
def callback(request, gateway: str):
    params = {k: v for k, v in (request.POST if request.method == "POST" else request.GET).items()}
    try:
        payment = handle_callback(gateway, params)
    except PaymentError:
        return HttpResponseNotFound("پرداخت پیدا نشد")
    except Exception:  # noqa: BLE001 — خطای غیرمنتظره نباید کاربر را با صفحهٔ خام رها کند
        log.exception("payment_callback_error")
        return HttpResponseRedirect(f"{settings.FRONTEND_URL.rstrip('/')}/orders?payment=error")
    outcome = _OUTCOME.get(payment.status, "pending")
    return HttpResponseRedirect(f"{settings.FRONTEND_URL.rstrip('/')}/orders/{payment.order.number}?payment={outcome}")
