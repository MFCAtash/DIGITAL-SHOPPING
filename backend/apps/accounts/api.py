"""API احراز هویت و نشانی‌ها. خطاها همه با قالب {code, message}. نشست کوکی + CSRF (ADR-003)."""
from __future__ import annotations

from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from ninja import Router, Schema
from ninja.security import django_auth
from ninja.throttling import AnonRateThrottle

from apps.core.errors import ApiError
from apps.core.net import client_ip
from apps.core.persian import normalize_phone
from apps.core.security import fingerprint, log_security

from .address_rules import MAX_ADDRESSES_PER_USER, normalize_postal_code, validate_address
from .models import Address, SmsOutbox
from .otp_policy import DEFAULT_POLICY
from .services import OtpError, queue_sms, request_otp, verify_otp

auth_router = Router(tags=["auth"])
addresses_router = Router(tags=["addresses"], auth=django_auth)


class UserOut(Schema):
    id: int
    phone: str
    name: str


class CsrfOut(Schema):
    csrf_token: str


class SessionOut(Schema):
    user: UserOut
    csrf_token: str


class PhoneIn(Schema):
    phone: str


class OtpRequestOut(Schema):
    ok: bool
    expires_in: int
    resend_in: int


class OtpVerifyIn(Schema):
    phone: str
    code: str


class OkOut(Schema):
    ok: bool


class ProfileIn(Schema):
    name: str


class PasswordSetIn(Schema):
    new_password: str


class PasswordChangeIn(Schema):
    current_password: str
    new_password: str


class PasswordResetRequestIn(Schema):
    phone: str


class PasswordResetConfirmIn(Schema):
    uid: str
    token: str
    new_password: str


def _user_out(u) -> dict:
    return {"id": u.pk, "phone": u.phone, "name": u.name}


@auth_router.get("/csrf", response=CsrfOut, auth=None, operation_id="auth_csrf", summary="توکن CSRF (کوکی را هم ست می‌کند)")
def csrf(request):
    return {"csrf_token": get_token(request)}


@auth_router.post("/otp/request", response=OtpRequestOut, auth=None, operation_id="auth_otp_request", throttle=[AnonRateThrottle(settings.AUTH_OTP_THROTTLE)], summary="درخواست کد یک‌بارمصرف پیامکی")
def otp_request(request, body: PhoneIn):
    try:
        d = request_otp(body.phone, client_ip(request.META, settings.NINJA_NUM_PROXIES))
    except ValueError:
        raise ApiError(422, "invalid_phone", "شمارهٔ موبایل معتبر نیست.")
    if not d.allowed:
        raise ApiError(429, d.reason or "rate_limited", "درخواست‌های زیاد؛ کمی بعد دوباره تلاش کنید.", headers={"Retry-After": str(d.retry_after)}, retry_after=d.retry_after)
    return {"ok": True, "expires_in": DEFAULT_POLICY.ttl_seconds, "resend_in": DEFAULT_POLICY.resend_seconds}


@auth_router.post("/otp/verify", response=SessionOut, auth=None, operation_id="auth_otp_verify", throttle=[AnonRateThrottle(settings.AUTH_OTP_THROTTLE)], summary="تأیید کد و ورود")
def otp_verify(request, body: OtpVerifyIn):
    try:
        user = verify_otp(body.phone, body.code)
    except ValueError:
        raise ApiError(422, "invalid_phone", "شمارهٔ موبایل معتبر نیست.")
    except OtpError as e:
        log_security("otp_verify_failed", request, reason=e.code, phone_fp=fingerprint(body.phone, settings.SECRET_KEY))
        if e.code == "otp_locked":
            raise ApiError(429, "otp_locked", "تعداد تلاش‌ها زیاد بود. کد جدید بگیرید.")
        raise ApiError(400, "invalid_code", "کد نامعتبر یا منقضی است.", attempts_left=e.attempts_left)
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")  # شناسهٔ نشست را عوض می‌کند (جلوگیری از session fixation)
    return {"user": _user_out(user), "csrf_token": get_token(request)}


@auth_router.post("/logout", response=OkOut, auth=django_auth, operation_id="auth_logout")
def logout_view(request):
    logout(request)
    return {"ok": True}


@auth_router.get("/me", response=UserOut, auth=django_auth, operation_id="auth_me")
def me(request):
    return _user_out(request.user)


@auth_router.patch("/me", response=UserOut, auth=django_auth, operation_id="auth_me_update")
def me_update(request, body: ProfileIn):
    name = body.name.strip()
    if len(name) > 120:
        raise ApiError(422, "validation_error", "نام بیش از حد طولانی است.")
    request.user.name = name
    request.user.save(update_fields=["name"])
    return _user_out(request.user)


# ---------------- رمز عبور (هششده، با لینک زماندار) ----------------


def _set_validated_password(user, raw: str, request=None) -> None:
    """اعتبارسنجی سمت سرور و ذخیرهٔ هش (هرگز متن خام ذخیره/لاگ نمیشود)."""
    try:
        validate_password(raw, user)
    except DjangoValidationError as exc:
        raise ApiError(422, "weak_password", "رمز عبور معیارهای امنیتی را رعایت نمیکند.", fields={"password": list(exc.messages)}, constraints=list(exc.messages))
    user.set_password(raw)  # PBKDF2-SHA256 (پیشفرض Django) + salt منحصربهفرد
    user.save(update_fields=["password"])
    log_security("password_changed", request, user_fp=fingerprint(str(user.pk), settings.SECRET_KEY))


@auth_router.post("/password/set", response=OkOut, auth=django_auth, operation_id="auth_password_set", summary="تنظیم رمز عبور برای حساب OTP-only")
def password_set(request, body: PasswordSetIn):
    _set_validated_password(request.user, body.new_password, request)
    return {"ok": True}


@auth_router.post("/password/change", response=OkOut, auth=django_auth, operation_id="auth_password_change", summary="تغییر رمز با بررسی رمز فعلی")
def password_change(request, body: PasswordChangeIn):
    if not request.user.has_usable_password() or not request.user.check_password(body.current_password):
        log_security("password_change_denied", request, user_fp=fingerprint(str(request.user.pk), settings.SECRET_KEY))
        raise ApiError(403, "invalid_current_password", "رمز فعلی معتبر نیست.")
    _set_validated_password(request.user, body.new_password, request)
    return {"ok": True}


@auth_router.post(
    "/password/reset/request", response=OkOut, auth=None, operation_id="auth_password_reset_request",
    summary="ارسال لینک زماندار بازنشانی رمز (بدون افشای وجود حساب)",
    throttle=[AnonRateThrottle(settings.AUTH_PASSWORD_THROTTLE)],
)
def password_reset_request(request, body: PasswordResetRequestIn):
    from .models import User

    try:
        phone = normalize_phone(body.phone)
    except ValueError:
        raise ApiError(422, "invalid_phone", "شمارهٔ موبایل معتبر نیست.")
    user = User.objects.filter(phone=phone).first()
    if user is not None:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)  # شامل timestamp؛ با PASSWORD_RESET_TIMEOUT سنجیده میشود
        path = f"/password-reset?uid={quote(uid)}&token={quote(token)}"
        SmsOutbox.objects.create(
            phone=phone,
            text=f"لینک بازنشانی رمز عبور (تنها ۱۵ دقیقه معتبر): {settings.FRONTEND_URL}{path}",
            kind="reset",
            next_attempt_at=timezone.now(),
        )
        queue_sms()
    log_security("password_reset_requested", request, phone_fp=fingerprint(phone, settings.SECRET_KEY))
    return {"ok": True}  # پاسخ یکسان برای شمارهٔ موجود و ناموجود


@auth_router.post(
    "/password/reset/confirm", response=OkOut, auth=None, operation_id="auth_password_reset_confirm",
    summary="تأیید لینک زماندار و تنظیم رمز جدید (هششده)",
    throttle=[AnonRateThrottle(settings.AUTH_PASSWORD_THROTTLE)],
)
def password_reset_confirm(request, body: PasswordResetConfirmIn):
    from .models import User

    try:
        uid = force_str(urlsafe_base64_decode(body.uid))
        user = User.objects.filter(pk=uid).first()
    except (ValueError, TypeError, OverflowError):
        user = None
    if user is None or not default_token_generator.check_token(user, body.token):
        log_security("password_reset_invalid_token", request)
        raise ApiError(400, "invalid_reset_token", "لینک بازنشانی نامعتبر یا منقضی شده است.")
    _set_validated_password(user, body.new_password, request)
    return {"ok": True}


# ---------------- نشانی‌ها ----------------


class AddressIn(Schema):
    receiver_name: str
    receiver_phone: str
    province: str
    city: str
    postal_code: str
    street: str
    plate: str = ""
    unit: str = ""
    is_default: bool = False


class AddressOut(Schema):
    id: int
    receiver_name: str
    receiver_phone: str
    province: str
    city: str
    postal_code: str
    street: str
    plate: str
    unit: str
    is_default: bool


def _camel(body: AddressIn) -> dict[str, str]:
    return {"receiverName": body.receiver_name, "receiverPhone": body.receiver_phone, "province": body.province, "city": body.city, "postalCode": body.postal_code, "street": body.street}


def validated_fields(body: AddressIn) -> dict[str, str]:
    errs = validate_address(_camel(body))
    if errs:
        raise ApiError(422, "invalid_address", "نشانی نامعتبر است.", fields=errs)
    return {
        "receiver_name": body.receiver_name.strip(), "receiver_phone": normalize_phone(body.receiver_phone), "province": body.province, "city": body.city.strip(),
        "postal_code": normalize_postal_code(body.postal_code), "street": body.street.strip(), "plate": body.plate.strip()[:20], "unit": body.unit.strip()[:20],
    }


def _own(request, pk: int) -> Address:
    a = Address.objects.filter(user=request.user, pk=pk).first()  # مالکیت در خود query
    if a is None:
        raise ApiError(404, "not_found", "نشانی پیدا نشد.")
    return a


@addresses_router.get("", response=list[AddressOut], operation_id="addresses_list")
def addresses_list(request):
    return list(Address.objects.filter(user=request.user))


@addresses_router.post("", response={201: AddressOut}, operation_id="addresses_create")
def addresses_create(request, body: AddressIn):
    data = validated_fields(body)
    with transaction.atomic():
        existing = Address.objects.select_for_update().filter(user=request.user)
        if existing.count() >= MAX_ADDRESSES_PER_USER:
            raise ApiError(409, "address_limit", f"حداکثر {MAX_ADDRESSES_PER_USER} نشانی مجاز است.")
        make_default = body.is_default or not existing.exists()
        if make_default:
            existing.filter(is_default=True).update(is_default=False)
        a = Address.objects.create(user=request.user, is_default=make_default, **data)
    return 201, a


@addresses_router.put("/{address_id}", response=AddressOut, operation_id="addresses_update")
def addresses_update(request, address_id: int, body: AddressIn):
    data = validated_fields(body)
    with transaction.atomic():
        a = _own(request, address_id)
        if body.is_default and not a.is_default:
            Address.objects.filter(user=request.user, is_default=True).update(is_default=False)
            a.is_default = True
        for k, v in data.items():
            setattr(a, k, v)
        a.save()
    return a


@addresses_router.delete("/{address_id}", response=OkOut, operation_id="addresses_delete")
def addresses_delete(request, address_id: int):
    with transaction.atomic():
        a = _own(request, address_id)
        was_default = a.is_default
        a.delete()
        if was_default:
            nxt = Address.objects.filter(user=request.user).order_by("-created_at", "-id").first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=["is_default"])
    return {"ok": True}


@addresses_router.post("/{address_id}/default", response=AddressOut, operation_id="addresses_set_default")
def addresses_set_default(request, address_id: int):
    with transaction.atomic():
        a = _own(request, address_id)
        Address.objects.filter(user=request.user, is_default=True).exclude(pk=a.pk).update(is_default=False)
        a.is_default = True
        a.save(update_fields=["is_default"])
    return a


def snapshot_from_fields(d: dict[str, str]) -> dict[str, str]:
    """فیلدهای اعتبارسنجی‌شدهٔ snake_case → کپی ثابت camelCase برای Order.address (هم‌شکل Address.as_snapshot)."""
    return {"receiverName": d["receiver_name"], "receiverPhone": d["receiver_phone"], "province": d["province"], "city": d["city"], "postalCode": d["postal_code"], "street": d["street"], "plate": d.get("plate", ""), "unit": d.get("unit", "")}
