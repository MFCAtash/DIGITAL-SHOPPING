from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from apps.payments.views import callback as payment_callback
from config.api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api.urls),
    # بازگشت مرورگر از درگاه (ریدایرکت، نه JSON): reverse proxy باید /payments/ را هم به بک‌اند بدهد
    path("payments/callback/<str:gateway>", payment_callback, name="payment-callback"),
]

# فقط در حالت محلی/دمو: تصاویر کالا توسط runserver سرو شوند (درprod Caddy این کار را میکند).
if settings.DEBUG and getattr(settings, "MEDIA_ROOT", None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
