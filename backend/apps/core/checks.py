"""_system checks_ امنیتی Fail-closed برای محیط تولید.

این بررسیها هنگام `manage.py check` و `check --deploy` اجرا میشوند و در تولید از راهاندازی
سرویس با تنظیمات ناامن جلوگیری میکنند. در محیطهای توسعه/تست بررسیها غیرفعالاند.
"""
from __future__ import annotations

import os

from django.conf import settings
from django.core.checks import Error, Warning, register

PLACEHOLDERS = {"changeme", "change-me", "secret", "dev", "test", "ci-only", "build-only", "fake"}


def _is_prod() -> bool:
    return os.environ.get("DJANGO_SETTINGS_MODULE", "").endswith(".prod")


def _bad(value: str) -> bool:
    v = (value or "").lower()
    return not v or any(p in v for p in PLACEHOLDERS)


@register("security")
def check_production_secrets(app_configs=None, **kwargs):
    errors = []
    if not _is_prod():
        return errors
    if settings.DEBUG:
        errors.append(Error("DEBUG must be False in production.", id="security.E001"))
    if len(settings.SECRET_KEY) < 50 or _bad(settings.SECRET_KEY):
        errors.append(Error("SECRET_KEY must be a long random secret from the environment.", id="security.E002"))
    otp = getattr(settings, "OTP_SECRET", "")
    if len(otp) < 32 or otp == settings.SECRET_KEY or _bad(otp):
        errors.append(Error("OTP_SECRET must be independent, random and at least 32 chars.", id="security.E003"))
    token = getattr(settings, "METRICS_TOKEN", "")
    if len(token) < 32 or _bad(token):
        errors.append(Error("METRICS_TOKEN must be a random token of at least 32 chars.", id="security.E004"))
    callback = getattr(settings, "PAYMENT_CALLBACK_SECRET", "")
    if getattr(settings, "PAYMENT_GATEWAY", "") == "http" and (len(callback) < 32 or _bad(callback)):
        errors.append(Error("PAYMENT_CALLBACK_SECRET must be random and at least 32 chars.", id="security.E005"))
    if getattr(settings, "PAYMENT_AMOUNT_UNIT", "") not in {"toman", "rial"}:
        errors.append(Error("PAYMENT_AMOUNT_UNIT must be 'toman' or 'rial'.", id="security.E006"))
    if getattr(settings, "PASSWORD_RESET_TIMEOUT", 3600) > 3600:
        errors.append(Error("PASSWORD_RESET_TIMEOUT must be at most one hour.", id="security.E007"))
    return errors


@register("security")
def check_transport_and_hosts(app_configs=None, **kwargs):
    errors = []
    if not _is_prod():
        return errors
    if not settings.SECURE_SSL_REDIRECT:
        errors.append(Error("SECURE_SSL_REDIRECT must be enabled.", id="security.E010"))
    if getattr(settings, "SECURE_HSTS_SECONDS", 0) < 31536000:
        errors.append(Error("HSTS must be at least one year.", id="security.E011"))
    if not getattr(settings, "SESSION_COOKIE_SECURE", False) or not getattr(settings, "CSRF_COOKIE_SECURE", False):
        errors.append(Error("Session and CSRF cookies must be Secure.", id="security.E012"))
    if not settings.ALLOWED_HOSTS or "*" in settings.ALLOWED_HOSTS:
        errors.append(Error("ALLOWED_HOSTS must be an explicit allowlist.", id="security.E013"))
    options = settings.DATABASES["default"].get("OPTIONS", {}) or {}
    sslmode = options.get("sslmode") or ("require" if "sslmode=require" in os.environ.get("DATABASE_URL", "") else "")
    if "postgres" in str(settings.DATABASES["default"].get("ENGINE", "")) and sslmode not in {"require", "verify-ca", "verify-full"}:
        errors.append(Error("PostgreSQL connections must require TLS (sslmode=require or stricter).", id="security.E014"))
    return errors


@register("security")
def check_browser_origins(app_configs=None, **kwargs):
    warnings = []
    if not _is_prod():
        return warnings
    cors = list(getattr(settings, "CORS_ALLOWED_ORIGINS", []))
    csrf = list(getattr(settings, "CSRF_TRUSTED_ORIGINS", []))
    if not cors or "*" in cors:
        warnings.append(Error("CORS_ALLOWED_ORIGINS must be an explicit allowlist.", id="security.E020"))
    if not csrf or "*" in csrf:
        warnings.append(Error("CSRF_TRUSTED_ORIGINS must be configured in production.", id="security.E021"))
    for origin in cors + csrf:
        if not origin.startswith("https://"):
            warnings.append(Error(f"Origin must use HTTPS: {origin}", id="security.E022"))
    for name in ("FRONTEND_URL", "PUBLIC_BASE_URL"):
        value = str(getattr(settings, name, ""))
        if not value.startswith("https://"):
            warnings.append(Error(f"{name} must use HTTPS in production.", id="security.E023"))
    if not getattr(settings, "CORS_ALLOW_CREDENTIALS", False) and cors:
        warnings.append(Warning("CORS credentials are disabled while an allowlist exists.", id="security.W020"))
    if not getattr(settings, "REDIS_URL", ""):
        warnings.append(Warning("REDIS_URL is empty; rate-limit counters are per-process only.", id="security.W021"))
    return warnings


@register("security")
def check_admin_allowlist(app_configs=None, **kwargs):
    if not _is_prod():
        return []
    cidrs = getattr(settings, "ADMIN_ALLOWED_IPS", [])
    if not cidrs:
        return [Error("ADMIN_ALLOWED_IPS must contain at least one CIDR in production.", id="security.E030")]
    if "0.0.0.0/0" in cidrs or "::/0" in cidrs:
        return [Error("ADMIN_ALLOWED_IPS must not allow the whole world.", id="security.E031")]
    return []
