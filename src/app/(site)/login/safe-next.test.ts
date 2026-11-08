import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-site relative paths, including query and hash", () => {
    expect(safeNext("/console")).toBe("/console");
    expect(safeNext("/c/jp?checkout=1")).toBe("/c/jp?checkout=1");
    expect(safeNext("/admin/orders/abc#items")).toBe("/admin/orders/abc#items");
    expect(safeNext(["/admin", "/evil"])).toBe("/admin");
  });

  it("falls back to /console when missing", () => {
    expect(safeNext(undefined)).toBe("/console");
    expect(safeNext("")).toBe("/console");
    expect(safeNext([])).toBe("/console");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\\\\evil.com",
    "\\\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r\n/evil.com",
    "/%2F/evil.com",
    "/%5Cevil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
  ])("rejects %j", (value) => {
    expect(safeNext(value)).toBe("/console");
  });

  it("every accepted value resolves to the current origin in a browser", () => {
    const base = "https://oeeoee.com";
    for (const value of ["/console", "/c/jp?checkout=1", "/a/b/../c"]) {
      expect(new URL(safeNext(value), base).origin).toBe(base);
    }
  });
});
