"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/client";
import { cartCount, isCountryConflict } from "@/lib/cart/reducer";
import { cartStore } from "@/lib/cart/store";
import type { CartLine, CartState } from "@/lib/cart/types";
import { CartDrawer } from "./CartDrawer";
import { ReplaceCartDialog } from "./ReplaceCartDialog";

export type CheckoutStatus =
  | { phase: "idle" }
  | { phase: "loading"; resuming: boolean }
  /** `code` is the API error code (e.g. "stripe_not_configured") or "network". */
  | { phase: "error"; code: string };

export interface CartContextValue {
  /** False during SSR / before localStorage has been read. */
  hydrated: boolean;
  cart: CartState;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /**
   * Adds a line and opens the drawer; asks before replacing a cart for another country.
   * "full": nothing was added (line or quantity limit reached) — the drawer explains why.
   */
  add: (countryCode: string, line: CartLine) => "added" | "confirm_replace" | "full";
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  checkout: CheckoutStatus;
  /** POST /api/checkout → Stripe. Signs the user in first (and resumes) when needed. */
  startCheckout: (options?: { resuming?: boolean }) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const noopSubscribe = () => () => {};

/** Cart state for the whole site (wraps the app in the root layout). */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [isOpen, setOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutStatus>({ phase: "idle" });
  const [pendingReplace, setPendingReplace] = useState<{ countryCode: string; line: CartLine } | null>(null);
  const locale = useLocale();
  const router = useRouter();

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => {
    setOpen(false);
    setCheckout((c) => (c.phase === "error" ? { phase: "idle" } : c));
  }, []);

  const add = useCallback((countryCode: string, line: CartLine) => {
    if (isCountryConflict(cartStore.getSnapshot(), countryCode)) {
      setPendingReplace({ countryCode, line });
      return "confirm_replace" as const;
    }
    const before = cartCount(cartStore.getSnapshot());
    cartStore.dispatch({ type: "add", countryCode, line });
    setOpen(true);
    if (cartCount(cartStore.getSnapshot()) === before) {
      // The reducer caps lines and per-line quantity; don't pretend it was added.
      setCheckout({ phase: "error", code: "cart_full" });
      return "full" as const;
    }
    setCheckout({ phase: "idle" });
    return "added" as const;
  }, []);

  const confirmReplace = useCallback(() => {
    if (!pendingReplace) return;
    cartStore.dispatch({ type: "replace", ...pendingReplace });
    setPendingReplace(null);
    setCheckout({ phase: "idle" });
    setOpen(true);
  }, [pendingReplace]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    cartStore.dispatch({ type: "setQuantity", key, quantity });
    setCheckout({ phase: "idle" });
  }, []);
  const remove = useCallback((key: string) => {
    cartStore.dispatch({ type: "remove", key });
    setCheckout({ phase: "idle" });
  }, []);
  const clear = useCallback(() => cartStore.dispatch({ type: "clear" }), []);

  const startCheckout = useCallback(
    async ({ resuming = false }: { resuming?: boolean } = {}) => {
      const snapshot = cartStore.getSnapshot();
      if (!snapshot.countryCode || snapshot.lines.length === 0) return;
      setOpen(true);
      setCheckout({ phase: "loading", resuming });
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ countryCode: snapshot.countryCode, lines: snapshot.lines, locale }),
        });
        if (res.status === 401) {
          // Sign in, then come back to this market and pick checkout up again.
          const next = `/c/${snapshot.countryCode.toLowerCase()}?checkout=1`;
          setOpen(false);
          setCheckout({ phase: "idle" });
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        const data: unknown = await res.json().catch(() => null);
        const body = (data && typeof data === "object" ? data : {}) as { url?: unknown; error?: unknown };
        if (res.ok && typeof body.url === "string") {
          window.location.assign(body.url);
          return;
        }
        setCheckout({ phase: "error", code: typeof body.error === "string" ? body.error : "generic" });
      } catch {
        setCheckout({ phase: "error", code: "network" });
      }
    },
    [locale, router],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      hydrated,
      cart,
      count: cartCount(cart),
      isOpen,
      openCart,
      closeCart,
      add,
      setQuantity,
      remove,
      clear,
      checkout,
      startCheckout,
    }),
    [hydrated, cart, isOpen, openCart, closeCart, add, setQuantity, remove, clear, checkout, startCheckout],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <ReplaceCartDialog
        pending={pendingReplace}
        currentCountryCode={cart.countryCode}
        onConfirm={confirmReplace}
        onCancel={() => setPendingReplace(null)}
      />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
