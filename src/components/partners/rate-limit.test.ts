import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("a", 100).ok).toBe(true);
    const blocked = limiter.hit("a", 200);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(800);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("b", 0).ok).toBe(true);
    expect(limiter.hit("a", 1).ok).toBe(false);
  });

  it("frees capacity once old hits leave the window", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.hit("a", 0).ok).toBe(true);
    expect(limiter.hit("a", 999).ok).toBe(false);
    expect(limiter.hit("a", 1001).ok).toBe(true);
  });

  it("prunes stale keys when the map grows", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10, maxKeys: 2 });
    limiter.hit("a", 0);
    limiter.hit("b", 0);
    limiter.hit("c", 100); // triggers prune of a/b
    expect(limiter.hit("a", 100).ok).toBe(true);
  });
});

describe("clientIp", () => {
  const h = (init: Record<string, string>) => new Headers(init);
  it("prefers x-real-ip (set by Railway's edge)", () => {
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 198.51.100.4", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });
  it("otherwise uses the last x-forwarded-for hop, then unknown", () => {
    expect(clientIp(h({ "x-forwarded-for": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7, 198.51.100.4 ," }))).toBe("198.51.100.4");
    expect(clientIp(h({ "x-forwarded-for": " , " }))).toBe("unknown");
    expect(clientIp(h({}))).toBe("unknown");
  });
  it("can't be dodged by rotating a spoofed first x-forwarded-for hop", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    const results = [1, 2, 3].map((i) =>
      limiter.hit(clientIp(h({ "x-forwarded-for": `203.0.113.${i}, 198.51.100.4` })), 0).ok,
    );
    expect(results).toEqual([true, true, false]);
  });
});
