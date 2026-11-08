import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";
import { daysAgo, formatAddress, parseCountryParam, parsePage, shortId, stripePaymentUrl } from "./format";
import { ORDER_STATUSES, canTransition, isOrderStatus, isPartnerStatus, nextOrderStatuses } from "./order-status";

describe("order status transitions", () => {
  it("follows the fulfilment flow", () => {
    expect(nextOrderStatuses("PAID")).toContain("FULFILLING");
    expect(canTransition("FULFILLING", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("never allows skipping steps, marking paid by hand, or leaving final states", () => {
    expect(canTransition("PAID", "SHIPPED")).toBe(false);
    expect(canTransition("PENDING", "PAID")).toBe(false);
    expect(canTransition("DELIVERED", "SHIPPED")).toBe(false);
    expect(nextOrderStatuses("CANCELED")).toEqual([]);
    expect(nextOrderStatuses("REFUNDED")).toEqual([]);
  });

  it("allows cancel/refund marking where it makes sense", () => {
    expect(canTransition("PENDING", "CANCELED")).toBe(true);
    expect(canTransition("PENDING", "REFUNDED")).toBe(false);
    expect(canTransition("DELIVERED", "REFUNDED")).toBe(true);
    expect(canTransition("SHIPPED", "CANCELED")).toBe(false);
  });

  it("has a rule for every status and only targets real statuses", () => {
    for (const s of ORDER_STATUSES) {
      for (const n of nextOrderStatuses(s)) expect(isOrderStatus(n)).toBe(true);
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it("guards enum values", () => {
    expect(isOrderStatus("PAID")).toBe(true);
    expect(isOrderStatus("paid")).toBe(false);
    expect(isPartnerStatus("APPROVED")).toBe(true);
    expect(isPartnerStatus(undefined)).toBe(false);
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("neutralises spreadsheet formulas in strings", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-5)).toBe("-5");
  });

  it("serialises dates as ISO and rows with CRLF", () => {
    const d = new Date("2026-01-02T03:04:05.000Z");
    expect(toCsv(["a", "b"], [["x", d]])).toBe("a,b\r\nx,2026-01-02T03:04:05.000Z\r\n");
  });
});

describe("formatAddress", () => {
  it("understands the Stripe shape and labels the country", () => {
    const result = formatAddress(
      { name: "Sam Ortiz", address: { line1: "1450 Valencia St", line2: "Apt 3", city: "San Francisco", state: "CA", postal_code: "94110", country: "US" } },
      (code) => (code === "US" ? "United States" : code),
    );
    expect(result).toEqual({
      recipient: ["Sam Ortiz"],
      lines: ["1450 Valencia St", "Apt 3", "94110 San Francisco CA", "United States"],
      extra: [],
    });
  });

  it("handles flat objects, keeps unknown scalars and ignores empties", () => {
    const result = formatAddress({ street: "Main 1", city: "Berlin", zip: "10115", phone: "+49 1", note: "", nested: { a: 1 } });
    expect(result?.lines).toEqual(["Main 1", "10115 Berlin"]);
    expect(result?.extra).toEqual([["phone", "+49 1"]]);
  });

  it("returns null for nothing useful", () => {
    expect(formatAddress(null)).toBeNull();
    expect(formatAddress({})).toBeNull();
    expect(formatAddress([1, 2])).toBeNull();
    expect(formatAddress("")).toBeNull();
  });

  it("splits a plain string into lines", () => {
    expect(formatAddress("a\nb")?.lines).toEqual(["a", "b"]);
  });
});

describe("misc format helpers", () => {
  it("parses query params defensively", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "9"])).toBe(2);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parseCountryParam("jp")).toBe("JP");
    expect(parseCountryParam("JPN")).toBeUndefined();
    expect(parseCountryParam(undefined)).toBeUndefined();
  });

  it("builds ids, dates and Stripe links", () => {
    expect(shortId("clx1abc2def3ghi4jkl5")).toBe("GHI4JKL5");
    expect(daysAgo(7, new Date("2026-01-08T00:00:00Z")).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(stripePaymentUrl("pi_123", true)).toBe("https://dashboard.stripe.com/test/payments/pi_123");
    expect(stripePaymentUrl("pi_123", false)).toBe("https://dashboard.stripe.com/payments/pi_123");
  });
});
