"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth, cart as cartApi } from "@/lib/api";
import { imageUrl } from "@/lib/media";
import type { CartDto, UserDto } from "@/lib/types";
import { ToastViewport, type ToastItem, pushCartToast, pushToast } from "./toast-viewport";

interface StoreContextValue {
  cart: CartDto;
  user: UserDto | null;
  ready: boolean;
  refreshCart: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setQty: (slug: string, qty: number) => Promise<void>;
  removeLine: (slug: string) => Promise<void>;
  addToCart: (slug: string, qty?: number) => Promise<void>;
  logout: () => Promise<void>;
  notify: (message: string, tone?: ToastItem["tone"]) => void;
}

const emptyCart: CartDto = { lines: [], count: 0, subtotal_toman: 0, notices: [] };
const StoreContext = createContext<StoreContextValue | null>(null);

const uiLang = () => (typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "fa");

function moneyLabel(toman: number | null | undefined, en: boolean): string | null {
  if (toman == null) return null;
  const digits = new Intl.NumberFormat(en ? "en-US" : "fa-IR").format(toman);
  return en ? `${digits} IRR` : `${digits} تومان`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartDto>(emptyCart);
  const [user, setUser] = useState<UserDto | null>(null);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    setToasts((prev) => pushToast(prev, message, tone));
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await cartApi.get());
    } catch {
      /* سبد مهمان قبل از اولین تغییر ممکن است وجود نداشته باشد */
    }
  }, []);

  const loadUser = useCallback(async (): Promise<UserDto | null> => {
    try {
      const me = await auth.me();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // یک درخواست واحد auth/me: نتیجهٔ آن هم برای وضعیت کاربر و هم برای ادغام سبد استفاده میشود.
      const [cartResult, me] = await Promise.allSettled([cartApi.get(), loadUser()]);
      if (cartResult.status === "fulfilled") setCart(cartResult.value);
      const signedIn = me.status === "fulfilled" ? me.value : null;
      if (alive && signedIn) {
        try {
          setCart(await cartApi.merge());
        } catch {
          /* ادغام سبد مهمان در صورت خطا، سبد فعلی را دستکاری نمیکند */
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [loadUser]);

  const setQty = useCallback(
    async (slug: string, qty: number) => {
      try {
        const next = qty <= 0 ? await cartApi.remove(slug) : await cartApi.set(slug, qty);
        setCart(next);
        if (next.notices.length) notify("تعداد برخی کالاها به حد مجاز محدود شد.", "warning");
      } catch {
        notify("بهروزرسانی سبد ممکن نشد.", "danger");
      }
    },
    [notify],
  );

  const removeLine = useCallback(
    async (slug: string) => {
      try {
        setCart(await cartApi.remove(slug));
      } catch {
        notify("حذف کالا از سبد ممکن نشد.", "danger");
      }
    },
    [notify],
  );

  const addToCart = useCallback(
    async (slug: string, qty = 1) => {
      try {
        const next = await cartApi.set(slug, qty);
        setCart(next);
        const line = next.lines.find((l) => l.slug === slug);
        const en = uiLang() === "en";
        setToasts((prev) =>
          pushCartToast(prev, {
            name: line?.name ?? slug,
            brand: line?.brand,
            qty,
            price: moneyLabel(line?.line_toman, en),
            image: imageUrl(line?.image),
            count: next.count,
            en,
          }),
        );
      } catch {
        notify("افزودن به سبد ممکن نشد.", "danger");
      }
    },
    [notify],
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
      setUser(null);
      notify("از حساب خود خارج شدید.", "info");
    } catch {
      notify("خروج از حساب ممکن نشد.", "danger");
    }
  }, [notify]);

  const value = useMemo(
    () => ({ cart, user, ready, refreshCart, refreshUser, setQty, removeLine, addToCart, logout, notify }),
    [cart, user, ready, refreshCart, refreshUser, setQty, removeLine, addToCart, logout, notify],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
