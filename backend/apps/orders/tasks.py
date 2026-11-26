"""کارهای زمان‌بندی‌شدهٔ سفارش (procrastinate روی همان Postgres؛ بدون Redis).

worker:  python manage.py procrastinate worker
بدون procrastinate هم می‌شود با cron:  python manage.py expire_pending_orders
"""
from procrastinate.contrib.django import app

from .services import run_expiry


@app.periodic(cron="* * * * *")  # هر دقیقه
@app.task(name="orders.expire_pending_orders", queueing_lock="orders.expire_pending_orders")
def expire_pending_orders_task(timestamp: int) -> int:
    """سفارش‌های pending منقضی را لغو و موجودی را آزاد می‌کند. queueing_lock از هم‌پوشانی اجراها جلوگیری می‌کند."""
    return run_expiry()
