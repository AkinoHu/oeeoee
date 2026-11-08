/**
 * Tiny in-memory fixed-window rate limiter. Per-process only — good enough to
 * stop a misbehaving pot from flooding the API on a single instance. Swap for
 * Redis/Upstash when running more than one replica.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Milliseconds until the window resets. */
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
  reset(): void;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = 0;

  return {
    check(key, now = Date.now()) {
      // Drop expired windows occasionally so the map can't grow without bound.
      if (now - lastSweep > windowMs) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
        lastSweep = now;
      }
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      const ok = entry.count <= limit;
      return { ok, remaining: Math.max(0, limit - entry.count), retryAfterMs: ok ? 0 : entry.resetAt - now };
    },
    reset() {
      hits.clear();
    },
  };
}

const globalLimiters = globalThis as unknown as { __oeeRateLimiters?: Map<string, RateLimiter> };

/** Named limiter that survives dev hot reloads. */
export function namedRateLimiter(name: string, config: { limit: number; windowMs: number }): RateLimiter {
  globalLimiters.__oeeRateLimiters ??= new Map();
  let limiter = globalLimiters.__oeeRateLimiters.get(name);
  if (!limiter) {
    limiter = createRateLimiter(config);
    globalLimiters.__oeeRateLimiters.set(name, limiter);
  }
  return limiter;
}
