from django.contrib import admin, messages

from .models import Order, OrderItem, ReturnRequest, Shipment, ShippingMethod
from .services import advance_shipment, change_status, sync_shipment_for_order
from .states import InvalidTransition, OrderStatus


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "qty", "unit_usd_cents", "unit_toman")

    def has_add_permission(self, request, obj=None):
        return False


def _mover(target: OrderStatus):
    def action(modeladmin, request, queryset):
        for order in queryset:
            try:
                change_status(order.pk, target, actor=request.user)
            except InvalidTransition as exc:
                modeladmin.message_user(request, f"#{order.pk}: {exc}", level=messages.ERROR)

    action.short_description = f"تغییر وضعیت به {target.value}"
    action.__name__ = f"to_{target.value}"
    return action


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_toman", "total_usd_cents", "rate_used", "created_at")
    list_filter = ("status",)
    # شمارهٔ عمومی سفارش تنها شناسهای است که پشتیبانی در اختیار مشتری میدهد؛
    # بدون آن، جستجوی سفارش از طریق ادمین عملاً غیرممکن است.
    search_fields = ("number", "id", "user__phone", "idempotency_key")
    inlines = [OrderItemInline]
    readonly_fields = [f.name for f in Order._meta.fields]
    actions = [
        _mover(OrderStatus.PROCESSING), _mover(OrderStatus.SHIPPED), _mover(OrderStatus.DELIVERED),
        _mover(OrderStatus.CANCELLED), _mover(OrderStatus.REFUNDED), "sync_shipment",
    ]

    @admin.action(description="ایجاد/پیشبرد shipment متناسب با وضعیت سفارش")
    def sync_shipment(self, request, queryset):
        from .services import ShipmentError

        for order in queryset:
            try:
                sync_shipment_for_order(order, actor=request.user)
            except ShipmentError as exc:
                self.message_user(request, f"#{order.pk}: {exc}", level=messages.ERROR)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "base_toman", "free_over_toman", "is_active", "sort")
    list_editable = ("is_active", "sort")


def _shipment_mover(target: Shipment.Status):
    def action(modeladmin, request, queryset):
        from .services import ShipmentError

        for shipment in queryset:
            try:
                advance_shipment(shipment.pk, target, actor=request.user)
            except ShipmentError as exc:
                modeladmin.message_user(request, f"#{shipment.pk}: {exc}", level=messages.ERROR)

    action.short_description = f"تغییر وضعیت ارسال به {target.label}"
    action.__name__ = f"to_shipment_{target.value}"
    return action


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("order", "carrier", "tracking_number", "status", "shipped_at", "delivered_at", "eta")
    list_filter = ("status", "carrier")
    search_fields = ("order__number", "tracking_number")
    autocomplete_fields = ("order",)
    readonly_fields = ("created_at", "updated_at")
    actions = [
        _shipment_mover(Shipment.Status.HANDED_OVER),
        _shipment_mover(Shipment.Status.IN_TRANSIT),
        _shipment_mover(Shipment.Status.DELIVERED),
    ]


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ("order", "item", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("order__number",)
    actions = ("approve", "refund")

    @admin.action(description="تأیید درخواست مرجوعی")
    def approve(self, request, queryset):
        from .services import ReturnError, approve_return

        for row in queryset:
            try:
                approve_return(row, actor=request.user)
            except ReturnError as exc:
                self.message_user(request, f"#{row.pk}: {exc}", level=messages.ERROR)

    @admin.action(description="بازپرداخت شد")
    def refund(self, request, queryset):
        from .services import ReturnError, refund_return

        for row in queryset:
            try:
                refund_return(row, actor=request.user)
            except ReturnError as exc:
                self.message_user(request, f"#{row.pk}: {exc}", level=messages.ERROR)
