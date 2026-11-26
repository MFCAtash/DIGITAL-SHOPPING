from config.logging import build_logging

from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
LOGGING = build_logging(json_output=False, level="DEBUG")
SMS_SEND_INLINE = True
PAYMENT_SANDBOX = True
