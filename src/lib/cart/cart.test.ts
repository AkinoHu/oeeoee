import { describe, expect, it } from "vitest";
import { cartCount, cartReducer, isCountryConflict } from "./reducer";
import { checkoutRequestSchema } from "./schema";
import { parseCart } from "./storage";
import { EMPTY_CART, MAX_LINE_QTY, MAX_LINES, lineKey, type CartLine } from "./types";

const potM: CartLine = { potSku: "POT-M", finish: "sage", plantId: "pothos", quantity: 1 };

describe("cartReducer", () => {
  it("adds, merges identical lines and clamps quantity", () => {
    let s = cartReducer(EMPTY_CART, { type: "add", countryCode: "cn", line: potM });
    expect(s.countryCode).toBe("CN");
    s = cartReducer(s, { type: "add", countryCode: "CN", line: { ...potM, quantity: 99 } });
    expect(s.lines).toHaveLength(1);
    expect(s.lines[0].quantity).toBe(MAX_LINE_QTY);
    expect(cartCount(s)).toBe(MAX_LINE_QTY);
  });

  it("keeps a cart single-country", () => {
    const s = cartReducer(EMPTY_CART, { type: "add", countryCode: "CN", line: potM });
    expect(isCountryConflict(s, "jp")).toBe(true);
    expect(isCountryConflict(s, "cn")).toBe(false);
    expect(cartReducer(s, { type: "add", countryCode: "JP", line: potM })).toBe(s);
    const replaced = cartReducer(s, { type: "replace", countryCode: "JP", line: { ...potM, plantId: null } });
    expect(replaced).toEqual({ countryCode: "JP", lines: [{ ...potM, plantId: null, previewPlantId: null }] });
  });

  it("updates quantity within bounds and empties the cart on last removal", () => {
    let s = cartReducer(EMPTY_CART, { type: "add", countryCode: "CN", line: potM });
    const key = lineKey(s.lines[0]);
    s = cartReducer(s, { type: "setQuantity", key, quantity: 0 });
    expect(s.lines[0].quantity).toBe(1);
    s = cartReducer(s, { type: "setQuantity", key, quantity: 4 });
    expect(s.lines[0].quantity).toBe(4);
    s = cartReducer(s, { type: "remove", key });
    expect(s).toEqual(EMPTY_CART);
  });

  it("caps the number of distinct lines", () => {
    let s = EMPTY_CART;
    for (let i = 0; i < MAX_LINES + 3; i++) {
      s = cartReducer(s, { type: "add", countryCode: "US", line: { ...potM, plantId: null, previewPlantId: `p${i}` } });
    }
    expect(s.lines).toHaveLength(MAX_LINES);
  });
});

describe("parseCart", () => {
  it("survives garbage and drops invalid lines", () => {
    expect(parseCart(null)).toEqual(EMPTY_CART);
    expect(parseCart("{not json")).toEqual(EMPTY_CART);
    expect(parseCart(JSON.stringify({ countryCode: "cn", lines: [potM, { potSku: 1 }, { ...potM, quantity: 500 }] }))).toEqual({
      countryCode: "CN",
      lines: [potM],
    });
  });
});

describe("checkoutRequestSchema", () => {
  it("normalises the country and rejects bad quantities", () => {
    const ok = checkoutRequestSchema.safeParse({ countryCode: "jp", lines: [potM], locale: "ja" });
    expect(ok.success && ok.data.countryCode).toBe("JP");
    expect(checkoutRequestSchema.safeParse({ countryCode: "JP", lines: [{ ...potM, quantity: 0 }], locale: "en" }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ countryCode: "JP", lines: [], locale: "en" }).success).toBe(false);
  });
});
