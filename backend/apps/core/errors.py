"""قالب یکدست خطای API: {"code": "...", "message": "...", ...extra}. فرانت فقط روی code تصمیم می‌گیرد (message برای نمایش)."""
from __future__ import annotations

from typing import Any


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str = "", headers: dict[str, str] | None = None, **extra: Any):
        super().__init__(code)
        self.status, self.code, self.message, self.headers, self.extra = status, code, message, headers or {}, extra

    def body(self) -> dict[str, Any]:
        return {"code": self.code, "message": self.message, **self.extra}


def register_handlers(api) -> None:
    """خطاهای ninja (اعتبارسنجی، ورود، HttpError) را به همان قالب یکدست تبدیل می‌کند."""
    from ninja.errors import AuthenticationError, HttpError, ValidationError

    @api.exception_handler(ApiError)
    def _api_error(request, exc: ApiError):
        resp = api.create_response(request, exc.body(), status=exc.status)
        for k, v in exc.headers.items():
            resp[k] = v
        return resp

    @api.exception_handler(ValidationError)
    def _validation(request, exc: ValidationError):
        return api.create_response(request, {"code": "validation_error", "message": "ورودی نامعتبر است.", "errors": exc.errors}, status=422)

    @api.exception_handler(AuthenticationError)
    def _auth(request, exc: AuthenticationError):
        return api.create_response(request, {"code": "unauthorized", "message": "ابتدا وارد شوید."}, status=401)

    @api.exception_handler(HttpError)
    def _http(request, exc: HttpError):
        return api.create_response(request, {"code": str(exc.message) or "error", "message": ""}, status=exc.status_code)
