from procrastinate.contrib.django import app

from .services import cleanup_old_carts


@app.periodic(cron="30 3 * * *")
@app.task(name="cart.cleanup_old_carts", queueing_lock="cart.cleanup_old_carts")
def cleanup_old_carts_task(timestamp: int) -> int:
    """سبدهای رهاشده (بدون تغییر در CART_RETENTION_DAYS روز) حذف می‌شوند."""
    return cleanup_old_carts()
