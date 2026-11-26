from .base import *  # noqa: F401,F403

DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # فقط برای سرعت تست
API_THROTTLE_ANON = "1000000/min"  # شمارندهٔ حافظه بین تست‌ها پاک نمی‌شود
API_THROTTLE_AUTH = "1000000/min"
AUTH_OTP_THROTTLE = "1000000/min"
AUTH_PASSWORD_THROTTLE = "1000000/min"
SMS_GATEWAY = "apps.accounts.sms.RecordingSms"
SMS_SEND_INLINE = True
OTP_SECRET = "test-otp-secret"
VAT_PERCENT = 0  # تست‌های قدیمی جمع کالاها را بدون مالیات انتظار دارند؛ تست‌های مالیات با override_settings
PAYMENT_SANDBOX = True
