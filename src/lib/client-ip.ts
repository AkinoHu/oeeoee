/**
 * Best-effort client IP for rate limiting behind Railway's edge proxy.
 *
 * Never trust the FIRST `X-Forwarded-For` hop: the client writes it and can
 * rotate it on every request to dodge a limit. Prefer `X-Real-IP` (set by the
 * proxy), then the LAST forwarded hop (appended by the proxy closest to us).
 *
 * If oeeoee.com is later proxied through Cloudflare (orange cloud), every
 * request reaches Railway from a Cloudflare edge, so limits become per edge
 * rather than per visitor — see docs/DEPLOY.md.
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
