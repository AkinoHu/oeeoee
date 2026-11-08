/**
 * Browser cart store backed by localStorage, consumed with useSyncExternalStore.
 * Keeps every tab in sync through the `storage` event. Client-only.
 */
import { cartReducer, type CartAction } from "./reducer";
import { CART_STORAGE_KEY, parseCart, readCart, writeCart } from "./storage";
import { EMPTY_CART, type CartState } from "./types";

let state: CartState | null = null;
const listeners = new Set<() => void>();

function current(): CartState {
  state ??= readCart();
  return state;
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  state = parseCart(event.newValue);
  emit();
}

export const cartStore = {
  subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: current,
  getServerSnapshot: (): CartState => EMPTY_CART,
  dispatch(action: CartAction) {
    const next = cartReducer(current(), action);
    if (next === state) return;
    state = next;
    writeCart(next);
    emit();
  },
};
