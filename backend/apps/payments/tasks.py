from procrastinate.contrib.django import app

from .services import reconcile_payments


@app.periodic(cron="*/5 * * * *")
@app.task(name="payments.reconcile", queueing_lock="payments.reconcile")
def reconcile_task(timestamp: int) -> dict:
    """هر ۵ دقیقه: پرداخت‌های ریدایرکت‌شدهٔ بدون callback (بیش از ۱۰ دقیقه) را از درگاه استعلام می‌کند."""
    return reconcile_payments()
