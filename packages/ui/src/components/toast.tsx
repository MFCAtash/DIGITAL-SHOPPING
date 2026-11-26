"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { defaultDuration, toastReducer, type ToastItem, type ToastTone } from "../lib/toast";
import { Icon, type IconName } from "../icons/Icon";
import { IconButton } from "./button";

export interface ToastApi {
  show: (message: string, opts?: { tone?: ToastTone; duration?: number }) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

const Ctx = createContext<ToastApi | null>(null);

const ICON: Record<ToastTone, IconName> = { info: "info", success: "check", warning: "alert", danger: "alert" };

/** اعلان‌ها: ناحیهٔ aria-live؛ خطا با role=alert و بدون بسته‌شدن خودکار. حداکثر ۳ اعلان هم‌زمان. */
export function ToastProvider({ children, dismissLabel = "بستن اعلان", regionLabel = "اعلان‌ها" }: { children: ReactNode; dismissLabel?: string; regionLabel?: string }) {
  const [toasts, dispatch] = useReducer(toastReducer, [] as ToastItem[]);
  const nextId = useRef(1);

  const show = useCallback<ToastApi["show"]>((message, opts = {}) => {
    const tone = opts.tone ?? "info";
    const id = nextId.current++;
    dispatch({ type: "add", toast: { id, message, tone, duration: opts.duration ?? defaultDuration(tone) } });
    return id;
  }, []);
  const api = useMemo<ToastApi>(() => ({ show, dismiss: (id) => dispatch({ type: "dismiss", id }), clear: () => dispatch({ type: "clear" }) }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div role="region" aria-label={regionLabel} className="cx-toasts">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => api.dismiss(t.id)} dismissLabel={dismissLabel} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ toast, onDismiss, dismissLabel }: { toast: ToastItem; onDismiss: () => void; dismissLabel: string }) {
  useEffect(() => {
    if (!toast.duration) return;
    const t = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role={toast.tone === "danger" ? "alert" : "status"} className={cx("cx-toast", `cx-toast--${toast.tone}`)}>
      <Icon name={ICON[toast.tone]} size={18} />
      <p className="cx-toast__msg">{toast.message}</p>
      <IconButton icon="close" label={dismissLabel} size="sm" onClick={onDismiss} />
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToast باید داخل <ToastProvider> استفاده شود");
  return api;
}
