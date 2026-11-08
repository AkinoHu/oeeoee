import { describe, expect, it } from "vitest";
import { getPotBySku, listPlants, type Country } from "@/data";
import type { CartLine } from "@/lib/cart/types";
import { MAX_LINE_QTY, MAX_LINES } from "@/lib/cart/types";
import { orderIdFromSession, paidOrderUpdate, priceCart, shippingFor } from "./orders";

/** Test markets are built here (not read from the catalog) so catalog edits don't break pricing tests. */
function market(overrides: Partial<Country>): Country {
  return {
    code: "XX",
    isoNumeric: "000",
    name: { en: "Testland", zh: "测试国", ja: "テストランド" },
    region: "europe",
    salesMode: "pot_only",
    currency: "usd",
    climates: ["temperate"],
    hemisphere: "north",
    center: [0, 0],
    plantOffers: {},
    localPlantIds: ["pothos", "snake-plant"],
    partnerStatus: "recruiting",
    shipping: { flatFee: 1500, freeOver: 15000, etaDays: [3, 6] },
    ...overrides,
  };
}

const CN = market({
  code: "CN",
  salesMode: "full",
  currency: "cny",
  plantOffers: { pothos: 3900, "snake-plant": 5900 },
  partnerStatus: "live",
  shipping: { flatFee: 0, etaDays: [2, 5] },
});
const US = market({ code: "US", currency: "usd", shipping: { flatFee: 1500, freeOver: 15000, etaDays: [5, 10] } });
const JP = market({ code: "JP", currency: "jpy", shipping: { flatFee: 1500, freeOver: 20000, etaDays: [4, 8] } });
const FR = market({ code: "FR", currency: "eur", salesMode: "coming_soon" });

const potS = getPotBySku("POT-S")!;
const potM = getPotBySku("POT-M")!;
const potL = getPotBySku("POT-L")!;

function line(partial: Partial<CartLine> = {}): CartLine {
  return { potSku: "POT-S", finish: "porcelain", plantId: null, quantity: 1, ...partial };
}

function quoteOf(country: Country, lines: CartLine[]) {
  const result = priceCart(country, lines);
  if (!result.ok) throw new Error(`expected a quote, got ${result.error}`);
  return result.quote;
}

describe("priceCart", () => {
  it("prices a pot + live plant in a full market from the catalog, never from the client", () => {
    const q = quoteOf(CN, [line({ potSku: "POT-M", finish: "sage", plantId: "pothos", quantity: 2 })]);
    expect(q.currency).toBe("cny");
    expect(q.lines[0].potUnit).toBe(potM.prices.cny);
    expect(q.lines[0].plantUnit).toBe(3900);
    expect(q.subtotal).toBe((potM.prices.cny + 3900) * 2);
    expect(q.shipping).toBe(0);
    expect(q.total).toBe(q.subtotal);
    expect(q.itemCount).toBe(2);
    // One Stripe line item per pot and per plant.
    expect(q.items.map((i) => [i.kind, i.sku, i.quantity, i.unitAmount])).toEqual([
      ["pot", "POT-M", 2, potM.prices.cny],
      ["plant", "PLANT-POTHOS", 2, 3900],
    ]);
  });

  it("ignores any price-like fields smuggled into a line", () => {
    const tampered = { ...line({ potSku: "POT-L" }), unitAmount: 1, price: 1 } as unknown as CartLine;
    expect(quoteOf(US, [tampered]).subtotal).toBe(potL.prices.usd);
  });

  it("handles zero-decimal JPY as whole yen", () => {
    const q = quoteOf(JP, [line({ potSku: "POT-S" })]);
    expect(q.currency).toBe("jpy");
    expect(q.subtotal).toBe(potS.prices.jpy);
    expect(Number.isInteger(q.total)).toBe(true);
    const expectedShipping = potS.prices.jpy >= 20000 ? 0 : 1500;
    expect(q.shipping).toBe(expectedShipping);
    expect(q.total).toBe(potS.prices.jpy + expectedShipping);
  });

  it("charges flat shipping below the free-shipping threshold and waives it at/above", () => {
    const below = market({ shipping: { flatFee: 1500, freeOver: potM.prices.usd + 1, etaDays: [1, 2] } });
    const exact = market({ shipping: { flatFee: 1500, freeOver: potM.prices.usd, etaDays: [1, 2] } });

    const q1 = quoteOf(below, [line({ potSku: "POT-M" })]);
    expect(q1.shipping).toBe(1500);
    expect(q1.total).toBe(potM.prices.usd + 1500);
    expect(q1.freeShippingRemaining).toBe(1);

    const q2 = quoteOf(exact, [line({ potSku: "POT-M" })]);
    expect(q2.shipping).toBe(0);
    expect(q2.freeShippingRemaining).toBeNull();

    // Quantity counts towards the threshold.
    const q3 = quoteOf(below, [line({ potSku: "POT-M", quantity: 2 })]);
    expect(q3.shipping).toBe(0);
  });

  it("always charges the flat fee when a market has no threshold", () => {
    const noThreshold = market({ shipping: { flatFee: 999, etaDays: [1, 2] } });
    expect(shippingFor(noThreshold, 10_000_000)).toBe(999);
    expect(quoteOf(noThreshold, [line()]).freeShippingRemaining).toBeNull();
  });

  it("rejects live plants in pot-only markets", () => {
    expect(priceCart(US, [line({ plantId: "pothos" })])).toEqual({ ok: false, error: "plant_not_sellable", lineIndex: 0 });
  });

  it("rejects plants that a full market doesn't offer", () => {
    const notOffered = listPlants().find((p) => !(p.id in CN.plantOffers));
    if (notOffered) {
      expect(priceCart(CN, [line({ plantId: notOffered.id })])).toMatchObject({ ok: false, error: "plant_not_sellable" });
    }
    expect(priceCart(CN, [line({ plantId: "not-a-plant" })])).toMatchObject({ ok: false, error: "unknown_plant" });
  });

  it("rejects a live plant that doesn't fit the pot", () => {
    const bigPlant = listPlants().find((p) => !p.sizes.includes("S"));
    if (!bigPlant) return;
    const shop = market({ salesMode: "full", currency: "cny", plantOffers: { [bigPlant.id]: 5000 } });
    expect(priceCart(shop, [line({ potSku: "POT-S", plantId: bigPlant.id })])).toMatchObject({
      ok: false,
      error: "plant_size_mismatch",
    });
  });

  it("allows a display-only preview plant in pot-only markets without charging for it", () => {
    const q = quoteOf(US, [line({ potSku: "POT-M", previewPlantId: "pothos" })]);
    expect(q.subtotal).toBe(potM.prices.usd);
    expect(q.items).toHaveLength(1);
    expect(q.items[0].meta.previewPlantId).toBe("pothos");
    expect(priceCart(US, [line({ previewPlantId: "nope" })])).toMatchObject({ ok: false, error: "unknown_plant" });
  });

  it("enforces quantity bounds", () => {
    for (const quantity of [0, -1, 1.5, MAX_LINE_QTY + 1, Number.NaN]) {
      expect(priceCart(US, [line({ quantity })])).toMatchObject({ ok: false, error: "invalid_quantity" });
    }
    expect(quoteOf(US, [line({ quantity: MAX_LINE_QTY })]).itemCount).toBe(MAX_LINE_QTY);
  });

  it("merges duplicate lines and applies the bound to the merged quantity", () => {
    const q = quoteOf(US, [line({ quantity: 2 }), line({ quantity: 3 })]);
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0].quantity).toBe(5);
    expect(priceCart(US, [line({ quantity: MAX_LINE_QTY }), line({ quantity: 1 })])).toMatchObject({
      ok: false,
      error: "invalid_quantity",
    });
  });

  it("rejects empty carts, too many lines, closed markets and unknown products", () => {
    expect(priceCart(US, [])).toEqual({ ok: false, error: "empty_cart" });
    expect(priceCart(FR, [line()])).toEqual({ ok: false, error: "market_not_open" });
    expect(priceCart(US, [line({ potSku: "POT-XL" })])).toMatchObject({ ok: false, error: "unknown_pot" });
    expect(priceCart(US, [line({ finish: "neon" })])).toMatchObject({ ok: false, error: "unknown_finish" });

    const plants = listPlants();
    const many: CartLine[] = [];
    for (const sku of ["POT-S", "POT-M", "POT-L"]) {
      for (const finish of ["porcelain", "sage", "graphite"]) {
        for (const p of plants) many.push(line({ potSku: sku, finish, previewPlantId: p.id }));
      }
    }
    if (many.length > MAX_LINES) {
      expect(priceCart(US, many)).toEqual({ ok: false, error: "too_many_lines" });
    }
  });

  it("refuses currencies a pot has no price for", () => {
    const odd = market({ currency: "xyz" as Country["currency"] });
    expect(priceCart(odd, [line()])).toMatchObject({ ok: false, error: "price_unavailable" });
  });
});

describe("checkout session → order", () => {
  it("finds the order id from metadata, then client_reference_id", () => {
    expect(orderIdFromSession({ id: "cs_1", metadata: { orderId: "o1" }, client_reference_id: "o2" })).toBe("o1");
    expect(orderIdFromSession({ id: "cs_1", metadata: {}, client_reference_id: "o2" })).toBe("o2");
    expect(orderIdFromSession({ id: "cs_1" })).toBeNull();
  });

  it("extracts payment, customer and shipping details", () => {
    const paidAt = new Date("2026-01-01T00:00:00Z");
    const update = paidOrderUpdate(
      {
        id: "cs_1",
        payment_status: "paid",
        payment_intent: "pi_123",
        customer_details: { name: "Billing Name", phone: "+81 3 0000 0000" },
        collected_information: {
          shipping_details: { name: "Ship Name", address: { country: "JP", postal_code: "100-0001" } },
        },
      },
      paidAt,
    );
    expect(update).toEqual({
      status: "PAID",
      paidAt,
      stripePaymentIntentId: "pi_123",
      customerName: "Ship Name",
      phone: "+81 3 0000 0000",
      shippingAddress: { name: "Ship Name", address: { country: "JP", postal_code: "100-0001" } },
    });
    expect(paidOrderUpdate({ id: "cs_2", payment_intent: { id: "pi_x" } }).stripePaymentIntentId).toBe("pi_x");
  });
});
