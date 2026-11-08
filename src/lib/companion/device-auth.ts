import "server-only";
import type { Device } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hashDeviceToken, looksLikeDeviceToken, parseBearer, verifyDeviceToken } from "./device-token";
import { apiError, clientIp, rateLimited } from "./http";
import { namedRateLimiter } from "./rate-limit";

const MINUTE = 60_000;

/** Per-device budgets (per process). A pot normally reports every 5 minutes. */
const LIMITS = {
  telemetry: { limit: 60, windowMs: MINUTE },
  config: { limit: 30, windowMs: MINUTE },
  chat: { limit: 20, windowMs: MINUTE },
} as const;

export type DeviceScope = keyof typeof LIMITS;

/**
 * Authenticate a pot from `Authorization: Bearer <token>` and apply its rate
 * limit. Failed attempts are rate-limited per IP.
 */
export async function authenticateDevice(
  request: Request,
  scope: DeviceScope,
): Promise<{ ok: true; device: Device } | { ok: false; response: Response }> {
  const ip = clientIp(request);
  const failures = namedRateLimiter("device-auth-failures", { limit: 20, windowMs: MINUTE });
  const unauthorized = () => {
    const r = failures.check(ip);
    return { ok: false as const, response: r.ok ? apiError(401, "unauthorized", {}, { "WWW-Authenticate": "Bearer" }) : rateLimited(r.retryAfterMs) };
  };

  const token = parseBearer(request.headers.get("authorization"));
  if (!token || !looksLikeDeviceToken(token)) return unauthorized();

  const tokenHash = hashDeviceToken(token);
  const device = await prisma.device.findUnique({ where: { tokenHash } });
  if (!device || !verifyDeviceToken(token, device.tokenHash)) return unauthorized();

  const limit = namedRateLimiter(`device-${scope}`, LIMITS[scope]).check(device.id);
  if (!limit.ok) return { ok: false, response: rateLimited(limit.retryAfterMs) };
  return { ok: true, device };
}
