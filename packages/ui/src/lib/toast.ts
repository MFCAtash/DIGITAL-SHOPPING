export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  /** میلی‌ثانیه؛ خطاها خودکار بسته نمی‌شوند (0) */
  duration: number;
}

export type ToastAction = { type: "add"; toast: ToastItem } | { type: "dismiss"; id: number } | { type: "clear" };

export const MAX_TOASTS = 3;

export function toastReducer(state: readonly ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case "add":
      return [...state, action.toast].slice(-MAX_TOASTS);
    case "dismiss":
      return state.filter((t) => t.id !== action.id);
    case "clear":
      return [];
  }
}

export const defaultDuration = (tone: ToastTone): number => (tone === "danger" ? 0 : 5000);
