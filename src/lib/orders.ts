/**
 * Order pricing — the single source of truth for what a cart costs.
 *
 * Pure and client-safe: the cart drawer uses it for display and the checkout API
 * runs exactly the same function on the server, so the browser never sends a price.
 * All amounts are integer minor units of the country's currency (JPY/KRW: whole units).
 */
import { getFinish, getPlant, getPotBySku, lt, plantPrice, type Country, type CurrencyCode, type PotSize } from "@/data";
import type { Locale } from "@/i18n/config";
import { MAX_LINE_QTY, MAX_LINES, MIN_LINE_QTY, lineKey, type CartLine } from "@/lib/cart/types";

export type PriceErrorCode =
  | "market_not_open"
  | "empty_cart"
  | "too_many_lines"
  | "invalid_quantity"
  | "unknown_pot"
  | "unknown_finish"
  | "unknown_plant"
  | "plant_not_sellable"
  | "plant_size_mismatch"
  | "price_unavailable";

export interface PricedLine {
  key: string;
  potSku: string;
  size: PotSize;
  finish: string;
  plantId: string | null;
  previewPlantId: string | null;
  quantity: number;
  potUnit: number;
  /** 0 when no live plant is bought. */
  plantUnit: number;
  lineTotal: number;
}

export interface OrderItemDraft {
  kind: "pot" | "plant";
  sku: string;
  name: string;
  quantity: number;
  unitAmount: number;
  meta: {
    size: PotSize;
    finish: string;
    plantId: string | null;
    /** Plant the companion starts as when no live plant is bought. */
    previewPlantId: string | null;
  };
}

export interface CartQuote {
  countryCode: string;
  currency: CurrencyCode;
  lines: PricedLine[];
  /** One order item per pot and per live plant — what Stripe and the Order store. */
  items: OrderItemDraft[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  /** Amount still needed to unlock free shipping, or null when it doesn't apply / is unlocked. */
  freeShippingRemaining: number | null;
  total: number;
}

export type PriceResult =
  | { ok: true; quote: CartQuote }
  | { ok: false; error: PriceErrorCode; lineIndex?: number };

export function plantSku(plantId: string): string {
  return `PLANT-${plantId.toUpperCase()}`;
}

/** Flat fee per order, waived once the subtotal reaches the country's free-shipping threshold. */
export function shippingFor(country: Country, subtotal: number): number {
  const { flatFee, freeOver } = country.shipping;
  if (flatFee <= 0) return 0;
  if (freeOver !== undefined && subtotal >= freeOver) return 0;
  return flatFee;
}

function freeShippingRemaining(country: Country, subtotal: number): number | null {
  const { flatFee, freeOver } = country.shipping;
  if (flatFee <= 0 || freeOver === undefined || subtotal >= freeOver) return null;
  return freeOver - subtotal;
}

/** Merge lines that describe the same thing so quantity bounds apply to the real total. */
function mergeLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + line.quantity } : { ...line });
  }
  return [...merged.values()];
}

/**
 * Price a cart for a market. Rejects anything that can't be sold there:
 * closed markets, unknown products, live plants not offered in the country,
 * plants that don't fit the pot, and out-of-bounds quantities.
 */
export function priceCart(country: Country, input: CartLine[], locale: Locale = "en"): PriceResult {
  if (country.salesMode === "coming_soon") return { ok: false, error: "market_not_open" };
  if (input.length === 0) return { ok: false, error: "empty_cart" };

  for (let i = 0; i < input.length; i++) {
    const q = input[i].quantity;
    if (!Number.isInteger(q) || q < MIN_LINE_QTY || q > MAX_LINE_QTY) {
      return { ok: false, error: "invalid_quantity", lineIndex: i };
    }
  }
  const lines = mergeLines(input);
  if (lines.length > MAX_LINES) return { ok: false, error: "too_many_lines" };

  const currency = country.currency;
  const priced: PricedLine[] = [];
  const items: OrderItemDraft[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.quantity > MAX_LINE_QTY) return { ok: false, error: "invalid_quantity", lineIndex: i };

    const pot = getPotBySku(line.potSku);
    if (!pot) return { ok: false, error: "unknown_pot", lineIndex: i };
    const finish = getFinish(line.finish);
    if (!finish) return { ok: false, error: "unknown_finish", lineIndex: i };
    const potUnit = pot.prices[currency];
    if (!Number.isInteger(potUnit) || potUnit < 0) return { ok: false, error: "price_unavailable", lineIndex: i };

    let plantUnit = 0;
    let plantName: string | null = null;
    if (line.plantId) {
      const plant = getPlant(line.plantId);
      if (!plant) return { ok: false, error: "unknown_plant", lineIndex: i };
      const price = plantPrice(country, plant.id);
      if (price === null) return { ok: false, error: "plant_not_sellable", lineIndex: i };
      if (!plant.sizes.includes(pot.size)) return { ok: false, error: "plant_size_mismatch", lineIndex: i };
      if (!Number.isInteger(price) || price < 0) return { ok: false, error: "price_unavailable", lineIndex: i };
      plantUnit = price;
      plantName = lt(plant.name, locale);
    }

    const previewPlantId = line.plantId ? null : (line.previewPlantId ?? null);
    if (previewPlantId && !getPlant(previewPlantId)) return { ok: false, error: "unknown_plant", lineIndex: i };

    const meta = { size: pot.size, finish: finish.id, plantId: line.plantId, previewPlantId };
    priced.push({
      key: lineKey(line),
      potSku: pot.sku,
      size: pot.size,
      finish: finish.id,
      plantId: line.plantId,
      previewPlantId,
      quantity: line.quantity,
      potUnit,
      plantUnit,
      lineTotal: (potUnit + plantUnit) * line.quantity,
    });
    items.push({
      kind: "pot",
      sku: pot.sku,
      name: `${lt(pot.name, locale)} · ${lt(finish.name, locale)}`,
      quantity: line.quantity,
      unitAmount: potUnit,
      meta,
    });
    if (line.plantId && plantName) {
      items.push({
        kind: "plant",
        sku: plantSku(line.plantId),
        name: plantName,
        quantity: line.quantity,
        unitAmount: plantUnit,
        meta,
      });
    }
  }

  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = shippingFor(country, subtotal);
  return {
    ok: true,
    quote: {
      countryCode: country.code,
      currency,
      lines: priced,
      items,
      itemCount: priced.reduce((n, l) => n + l.quantity, 0),
      subtotal,
      shipping,
      freeShippingRemaining: freeShippingRemaining(country, subtotal),
      total: subtotal + shipping,
    },
  };
}

// ── Stripe Checkout Session → Order ─────────────────────────

/** The parts of a Stripe Checkout Session the order cares about (structural, so it stays testable). */
export interface CheckoutSessionLike {
  id: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  payment_intent?: string | { id: string } | null;
  customer_details?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  collected_information?: {
    shipping_details?: { name?: string | null; address?: unknown } | null;
  } | null;
}

/** Order id we attached to the session (metadata first, client_reference_id as fallback). */
export function orderIdFromSession(session: CheckoutSessionLike): string | null {
  return session.metadata?.orderId || session.client_reference_id || null;
}

/** Fields written to the Order once a session is paid. */
export function paidOrderUpdate(session: CheckoutSessionLike, paidAt: Date = new Date()) {
  const shipping = session.collected_information?.shipping_details ?? null;
  const pi = session.payment_intent;
  return {
    status: "PAID" as const,
    paidAt,
    stripePaymentIntentId: typeof pi === "string" ? pi : (pi?.id ?? null),
    customerName: shipping?.name ?? session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    shippingAddress: shipping ? { name: shipping.name ?? null, address: shipping.address ?? null } : null,
  };
}

/** Short, human-friendly order reference. */
export function orderReference(orderId: string): string {
  return orderId.slice(-8).toUpperCase();
}
