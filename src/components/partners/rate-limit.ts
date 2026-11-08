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

/**
 * Client IP for rate limiting. Prefers X-Real-IP, which Railway's edge sets to
 * the caller's address, then the last X-Forwarded-For hop (added by the nearest
 * proxy). Never the first hop: that is whatever the client sent, so keying on
 * it let anyone dodge the limit with a fresh value per request.
 */
export function clientIp(headers: Pick<Headers, "get">): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.at(-1) ?? "unknown";
}
