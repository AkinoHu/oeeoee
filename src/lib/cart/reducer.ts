import { clamp } from "@/lib/utils";
import { EMPTY_CART, MAX_LINE_QTY, MAX_LINES, MIN_LINE_QTY, lineKey, type CartLine, type CartState } from "./types";

export type CartAction =
  | { type: "hydrate"; state: CartState }
  /** Add to the current cart. Ignored when the cart belongs to another country (ask first). */
  | { type: "add"; countryCode: string; line: CartLine }
  /** Start a fresh cart for another country with this line. */
  | { type: "replace"; countryCode: string; line: CartLine }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

function normalize(line: CartLine): CartLine {
  return {
    potSku: line.potSku,
    finish: line.finish,
    plantId: line.plantId ?? null,
    previewPlantId: line.plantId ? null : (line.previewPlantId ?? null),
    quantity: clamp(Math.round(line.quantity) || MIN_LINE_QTY, MIN_LINE_QTY, MAX_LINE_QTY),
  };
}

/** True when adding to `state` for `countryCode` would mix two markets in one cart. */
export function isCountryConflict(state: CartState, countryCode: string): boolean {
  return state.lines.length > 0 && state.countryCode !== null && state.countryCode !== countryCode.toUpperCase();
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "clear":
      return EMPTY_CART;
    case "replace":
      return { countryCode: action.countryCode.toUpperCase(), lines: [normalize(action.line)] };
    case "add": {
      const countryCode = action.countryCode.toUpperCase();
      if (isCountryConflict(state, countryCode)) return state;
      const line = normalize(action.line);
      const key = lineKey(line);
      const existing = state.lines.find((l) => lineKey(l) === key);
      if (existing) {
        return {
          countryCode,
          lines: state.lines.map((l) =>
            l === existing ? { ...l, quantity: clamp(l.quantity + line.quantity, MIN_LINE_QTY, MAX_LINE_QTY) } : l,
          ),
        };
      }
      if (state.lines.length >= MAX_LINES) return state;
      return { countryCode, lines: [...state.lines, line] };
    }
    case "setQuantity":
      return {
        ...state,
        lines: state.lines.map((l) =>
          lineKey(l) === action.key ? { ...l, quantity: clamp(Math.round(action.quantity), MIN_LINE_QTY, MAX_LINE_QTY) } : l,
        ),
      };
    case "remove": {
      const lines = state.lines.filter((l) => lineKey(l) !== action.key);
      return lines.length ? { ...state, lines } : EMPTY_CART;
    }
  }
}

export function cartCount(state: CartState): number {
  return state.lines.reduce((n, l) => n + l.quantity, 0);
}
