import { describe, expect, it } from "vitest";
import {
  generateDeviceToken,
  generateSerial,
  hashDeviceToken,
  issueDeviceCredentials,
  looksLikeDeviceToken,
  parseBearer,
  verifyDeviceToken,
} from "./device-token";
import { createRateLimiter } from "./rate-limit";

describe("device tokens", () => {
  it("generates unique, well-formed tokens", () => {
    const a = generateDeviceToken();
    const b = generateDeviceToken();
    expect(a).not.toBe(b);
    expect(a.startsWith("oee_dev_")).toBe(true);
    expect(looksLikeDeviceToken(a)).toBe(true);
    expect(looksLikeDeviceToken("oee_dev_short")).toBe(false);
    expect(looksLikeDeviceToken("Bearer x")).toBe(false);
  });

  it("hashes with SHA-256 hex, deterministically", () => {
    expect(hashDeviceToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const t = generateDeviceToken();
    expect(hashDeviceToken(t)).toBe(hashDeviceToken(t));
    expect(hashDeviceToken(t)).toHaveLength(64);
  });

  it("verifies only the matching token", () => {
    const { token, tokenHash } = issueDeviceCredentials();
    expect(verifyDeviceToken(token, tokenHash)).toBe(true);
    expect(verifyDeviceToken(generateDeviceToken(), tokenHash)).toBe(false);
    expect(verifyDeviceToken(token, "deadbeef")).toBe(false);
    expect(tokenHash).not.toContain(token.slice(8));
  });

  it("parses bearer headers", () => {
    expect(parseBearer("Bearer oee_dev_abc")).toBe("oee_dev_abc");
    expect(parseBearer("bearer   oee_dev_abc ")).toBe("oee_dev_abc");
    expect(parseBearer("Basic Zm9v")).toBeNull();
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("Bearer")).toBeNull();
  });

  it("makes readable serials", () => {
    const s = generateSerial();
    expect(s).toMatch(/^OEE-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(generateSerial("OEE-DEMO")).toMatch(/^OEE-DEMO-/);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit per window, per key", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    const t = 10_000;
    expect(rl.check("a", t).ok).toBe(true);
    expect(rl.check("a", t + 1).ok).toBe(true);
    expect(rl.check("a", t + 2)).toMatchObject({ ok: true, remaining: 0 });
    const blocked = rl.check("a", t + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(997);
    expect(rl.check("b", t + 3).ok).toBe(true);
    expect(rl.check("a", t + 1000).ok).toBe(true); // new window
  });
});
