/**
 * Tiny in-memory sliding-window rate limiter. Per-process only: good enough to
 * blunt form spam on a single instance; swap for Redis/Upstash when scaling out.
 */
export interface RateLimiter {
  /** Records a hit for `key` and reports whether it is allowed. */
  hit(key: string, now?: number): { ok: boolean; retryAfterMs: number };
  reset(): void;
}

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, times] of hits) {
      if (times.every((t) => t <= now - windowMs)) hits.delete(key);
    }
  }

  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterMs: recent[0] + windowMs - now };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > maxKeys) prune(now);
      return { ok: true, retryAfterMs: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

export { clientIp } from "@/lib/client-ip";
