/**
 * Device credentials. A pot authenticates with `Authorization: Bearer <token>`.
 * Only the SHA-256 hash of the token is stored (`Device.tokenHash`); the raw
 * token is shown to the owner once, at creation or rotation.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const TOKEN_PREFIX = "oee_dev_";
const TOKEN_PATTERN = /^oee_dev_[A-Za-z0-9_-]{43}$/;
/** Crockford-ish base32 without look-alikes (0/O, 1/I/L). */
const SERIAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** New random bearer token: `oee_dev_` + 32 random bytes (base64url). */
export function generateDeviceToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function looksLikeDeviceToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** Constant-time comparison of a presented token against a stored hash. */
export function verifyDeviceToken(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashDeviceToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Extract the token from an `Authorization: Bearer …` header. */
export function parseBearer(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  return m ? m[1] : null;
}

/** Human-friendly serial, e.g. "OEE-7K2M-Q9XA" (or "OEE-DEMO-Q9XA"). */
export function generateSerial(prefix = "OEE"): string {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => SERIAL_ALPHABET[b % SERIAL_ALPHABET.length]);
  return `${prefix}-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** A fresh credential pair; persist `tokenHash`, show `token` once. */
export function issueDeviceCredentials() {
  const token = generateDeviceToken();
  return { token, tokenHash: hashDeviceToken(token) };
}
