"""شناسهٔ درخواست و لاگ ساختاریافتهٔ هر درخواست."""
from __future__ import annotations

import time

import structlog
from django.conf import settings
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware

from .net import client_ip
from .request_id import sanitize_request_id
from .security import ip_allowed, log_security

log = structlog.get_logger("request")
QUIET_PATHS = {"/api/v1/health"}  # healthcheck داکر هر ۳۰ ثانیه؛ در سطح debug

class RequestIdMiddleware:
    """request_id را از X-Request-ID (در صورت امن‌بودن) یا تازه می‌سازد، به همهٔ لاگ‌های درخواست می‌چسباند
    و در هدر پاسخ برمی‌گرداند. فقط مسیر (بدون query string) لاگ می‌شود تا داده‌های شخصی به لاگ نرسد."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        rid = sanitize_request_id(request.headers.get("X-Request-ID"))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=rid)
        request.request_id = rid
        started = time.perf_counter()
        status = 500
        try:
            response = self.get_response(request)
            status = response.status_code
            response["X-Request-ID"] = rid
            return response
        finally:
            emit = log.debug if request.path in QUIET_PATHS and status < 500 else log.info
            emit("request", method=request.method, path=request.path, status=status, duration_ms=round((time.perf_counter() - started) * 1000, 1))
            structlog.contextvars.clear_contextvars()


class MetricsMiddleware:
    """متریک‌های RED (Rate/Errors/Duration) برای Prometheus؛ بدون وابستگی خارجی.

    مسیرها نرمال‌سازی می‌شوند (`/orders/123` → `/orders/{id}`) تا کاردینالیتی کنترل شود.
    مسیرهای health و metrics شمرده نمی‌شوند تا سری زمانی با نویز پر نشود.
    """

    SKIP = {"/metrics", "/api/v1/health"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from . import metrics

        if request.path in self.SKIP:
            return self.get_response(request)
        labels = {"method": request.method, "path": metrics.normalize_path(request.path)}
        metrics.in_progress("digital_shopping_http_in_progress", **labels)
        started = time.perf_counter()
        status = 500
        try:
            response = self.get_response(request)
            status = response.status_code
            return response
        finally:
            elapsed = time.perf_counter() - started
            metrics.progress_done("digital_shopping_http_in_progress", **labels)
            metrics.inc("digital_shopping_http_requests_total", status=str(status), **labels)
            metrics.observe("digital_shopping_http_request_duration_seconds", elapsed, **labels)


class ApiCsrfMiddleware:
    """Django-Ninja تمام viewها را `csrf_exempt` میکند و CSRF فقط برای ورود نشستی میسنجد.

    این لایه برای **تمام** متدهای تغییردهندهٔ `/api/` (از جمله سبد مهمان) بررسی CSRF اعمال
    میکند، مگر مسیرهای صریحاً معاف (OTP و بازنشانی رمز که قبل از ورود کاربر فراخوانده میشوند).
    """

    SAFE = {"GET", "HEAD", "OPTIONS", "TRACE"}
    EXEMPT = {
        "/api/v1/auth/otp/request",
        "/api/v1/auth/password/reset/request",
        "/api/v1/auth/password/reset/confirm",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in self.SAFE or not request.path.startswith("/api/") or request.path in self.EXEMPT:
            return self.get_response(request)
        # Django test client با enforce_csrf_checks=False پرچم `_dont_enforce_csrf_checks` را میگذارد.
        checker = CsrfViewMiddleware(lambda r: None)

        def dummy_view(req):
            return None

        dummy_view.csrf_exempt = False
        response = checker.process_view(request, dummy_view, (), {})
        if response is not None:
            log_security("csrf_failure", request, method=request.method)
            return JsonResponse({"code": "csrf_failed", "message": "توکن امنیتی معتبر نیست."}, status=403)
        return self.get_response(request)


class AdminGuardMiddleware:
    """قفل دوم برای `/admin/` در کنار IP-allowlist سیاست Caddy (defense in depth)."""

    PREFIX = "/admin/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith(self.PREFIX):
            ip = client_ip(request.META, settings.NINJA_NUM_PROXIES)
            cidrs = getattr(settings, "ADMIN_ALLOWED_IPS", [])
            if cidrs and not ip_allowed(ip, cidrs):
                log_security("admin_ip_denied", request, ip=ip)
                return JsonResponse({"code": "forbidden", "message": "دسترسی مجاز نیست."}, status=403)
            user = getattr(request, "user", None)
            if user is not None and user.is_authenticated and not user.is_staff:
                log_security("admin_staff_denied", request)
                return JsonResponse({"code": "forbidden", "message": "دسترسی مجاز نیست."}, status=403)
        return self.get_response(request)


class SuspiciousActivityMiddleware:
    """لاگ رویدادهای مشکوک (401/403/429) بدون ذخیرهٔ query string یا PII."""

    CODES = {400, 401, 403, 429}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code in self.CODES and request.path.startswith("/api/"):
            log_security("suspicious_response", request, status=response.status_code, method=request.method)
        return response
