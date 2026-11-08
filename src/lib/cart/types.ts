/**
 * Cart model shared by the client cart, the checkout API and order pricing.
 * Prices are never stored in the cart — they are recomputed from the catalog.
 */

export interface CartLine {
  /** Pot model SKU, e.g. "POT-M". */
  potSku: string;
  /** Pot finish id, e.g. "sage". */
  finish: string;
  /** Live plant bought with the pot. Only set when the plant is sellable in the cart's country. */
  plantId: string | null;
  /**
   * Plant shown growing in the pot when no live plant is bought (pot-only markets, or
   * "pot only" in full markets). Display-only: it also tells the companion which
   * personality to start with. Never priced.
   */
  previewPlantId?: string | null;
  quantity: number;
}

export interface CartState {
  /** ISO alpha-2 (upper-case) of the market the cart ships to. A cart is single-country. */
  countryCode: string | null;
  lines: CartLine[];
}

/** Per-line quantity bounds. */
export const MIN_LINE_QTY = 1;
export const MAX_LINE_QTY = 10;
/** Distinct lines a cart may hold. */
export const MAX_LINES = 10;

export const EMPTY_CART: CartState = { countryCode: null, lines: [] };

/** Stable identity of a line: same pot + finish + plant(s) merge into one line. */
export function lineKey(line: Pick<CartLine, "potSku" | "finish" | "plantId" | "previewPlantId">): string {
  return [line.potSku, line.finish, line.plantId ?? "-", line.plantId ? "-" : (line.previewPlantId ?? "-")].join("|");
}

/** The plant to draw in the pot for a line (bought plant first, then the preview pick). */
export function shownPlantId(line: Pick<CartLine, "plantId" | "previewPlantId">): string | null {
  return line.plantId ?? line.previewPlantId ?? null;
}
