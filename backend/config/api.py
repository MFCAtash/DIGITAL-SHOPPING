from django.conf import settings
from ninja import NinjaAPI
from ninja.throttling import AnonRateThrottle, AuthRateThrottle

from apps.accounts.api import addresses_router, auth_router
from apps.cart.api import router as cart_router
from apps.catalog.api import router as catalog_router
from apps.core.api import router as core_router
from apps.core.errors import register_handlers
from apps.orders.api import router as orders_router
from apps.orders.api import shipping_router
from apps.payments.api import router as payments_router
from apps.pricing.api import router as pricing_router

api = NinjaAPI(
    title="Digital Shopping API",
    version="1.1.0",
    description="قرارداد مرجع: contracts/openapi.yaml (تست‌شده در tests/test_openapi_contract.py). خطاها: {code, message, ...}.",
    throttle=[AnonRateThrottle(settings.API_THROTTLE_ANON), AuthRateThrottle(settings.API_THROTTLE_AUTH)],
)
register_handlers(api)
api.add_router("/catalog", catalog_router)
api.add_router("/auth", auth_router)
api.add_router("/addresses", addresses_router)
api.add_router("/cart", cart_router)
api.add_router("/orders", orders_router)
api.add_router("/pricing", pricing_router)
api.add_router("/shipping", shipping_router)
api.add_router("", payments_router)  # /orders/{number}/pay
api.add_router("", core_router)
