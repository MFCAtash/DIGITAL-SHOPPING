"""کارهای صف: ارسال فوری پیامک، جاروی تلاش مجدد هر دقیقه، پاک‌سازی روزانه."""
from datetime import timedelta

from django.utils import timezone
from procrastinate.contrib.django import app

from .models import OtpChallenge, SmsOutbox
from .sms import send_pending_sms


@app.task(name="accounts.sms_send_now")
def sms_send_now() -> int:
    return send_pending_sms()


@app.periodic(cron="* * * * *")  # جاروی تلاش‌های مجدد (backoff) و پیامک‌های جامانده
@app.task(name="accounts.sms_sweep", queueing_lock="accounts.sms_sweep")
def sms_sweep(timestamp: int) -> int:
    return send_pending_sms()


@app.periodic(cron="17 3 * * *")
@app.task(name="accounts.cleanup_otp", queueing_lock="accounts.cleanup_otp")
def cleanup_otp(timestamp: int) -> int:
    """OTP و پیامک‌های قدیمی‌تر از ۷ روز حذف می‌شوند (حداقل‌سازی داده)."""
    cutoff = timezone.now() - timedelta(days=7)
    n1, _ = OtpChallenge.objects.filter(created_at__lt=cutoff).delete()
    n2, _ = SmsOutbox.objects.filter(created_at__lt=cutoff).exclude(status=SmsOutbox.Status.PENDING).delete()
    return n1 + n2
