/** نگاشت وضعیت سفارش (backend/apps/orders/states.py) به مراحل نمایشی. */

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | "needs_review";
export type StepState = "done" | "current" | "upcoming";
export type StepTone = "normal" | "warning" | "danger";

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: StepState;
  tone: StepTone;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شد",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شد",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
  refunded: "بازپرداخت شد",
  needs_review: "در حال بررسی پرداخت",
};

const PATH: readonly OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];

const step = (status: OrderStatus, state: StepState, tone: StepTone = "normal"): TimelineStep => ({ status, label: STATUS_LABEL[status], state, tone });

export function timelineSteps(status: OrderStatus): TimelineStep[] {
  const i = PATH.indexOf(status);
  if (i >= 0) {
    return PATH.map((s, idx) => step(s, idx < i ? "done" : idx === i ? "current" : "upcoming"));
  }
  switch (status) {
    case "needs_review":
      return [step("pending", "done"), step("needs_review", "current", "warning")];
    case "cancelled":
      return [step("pending", "done"), step("cancelled", "current", "danger")];
    default: // refunded (وضعیت‌های مسیر اصلی بالاتر برگشتند)
      return [step("paid", "done"), step("refunded", "current", "warning")];
  }
}
