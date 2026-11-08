import { getCountry, getFinish, getPlant, getPotBySku } from "@/data";
import { cartLineSchema, cartStateSchema } from "./schema";
import { EMPTY_CART, MAX_LINES, type CartLine, type CartState } from "./types";

export const CART_STORAGE_KEY = "oeeoee.cart.v1";

/** A saved line still refers to things the catalog sells. */
function isKnownLine(line: CartLine): boolean {
  return (
    Boolean(getPotBySku(line.potSku)) &&
    Boolean(getFinish(line.finish)) &&
    (line.plantId === null || Boolean(getPlant(line.plantId)))
  );
}

/**
 * Parse untrusted JSON (localStorage, another tab) into a valid cart. Invalid
 * lines, and lines or markets the catalog no longer has, are dropped — so the
 * header badge never counts items the drawer can't show.
 */
export function parseCart(raw: string | null | undefined): CartState {
  if (!raw) return EMPTY_CART;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_CART;
  }
  const parsed = cartStateSchema.safeParse(data);
  if (!parsed.success) return EMPTY_CART;
  const lines: CartLine[] = [];
  for (const candidate of parsed.data.lines) {
    const line = cartLineSchema.safeParse(candidate);
    if (line.success && isKnownLine(line.data) && lines.length < MAX_LINES) lines.push(line.data);
  }
  if (!lines.length || !parsed.data.countryCode || !getCountry(parsed.data.countryCode)) return EMPTY_CART;
  return { countryCode: parsed.data.countryCode, lines };
}

export function readCart(): CartState {
  try {
    return parseCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    // Private mode / blocked storage: start empty.
    return EMPTY_CART;
  }
}

export function writeCart(state: CartState): void {
  try {
    if (state.lines.length) window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Storage full or blocked — the cart still works for this page view.
  }
}
