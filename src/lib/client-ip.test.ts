import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("prefers X-Real-IP set by the proxy", () => {
    expect(clientIp(h({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("uses the last forwarded hop, so a client-chosen first hop can't dodge limits", () => {
    const a = clientIp(h({ "x-forwarded-for": "6.6.6.1, 198.51.100.9" }));
    const b = clientIp(h({ "x-forwarded-for": "6.6.6.2, 198.51.100.9" }));
    expect(a).toBe("198.51.100.9");
    expect(b).toBe(a);
  });

  it("falls back to a shared bucket when no proxy headers are present", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});
