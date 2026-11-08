/** Small JSON helpers for the device / companion route handlers. */
import type { z } from "zod";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, { ...init, headers: { ...NO_STORE, ...init.headers } });
}

export type ApiError = "unauthorized" | "rate_limited" | "invalid_json" | "invalid_body" | "not_found" | "server_error";

export function apiError(status: number, error: ApiError, extra: Record<string, unknown> = {}, headers?: HeadersInit): Response {
  return json({ ok: false, error, ...extra }, { status, headers });
}

export function rateLimited(retryAfterMs: number): Response {
  return apiError(429, "rate_limited", { retryAfterSeconds: Math.ceil(retryAfterMs / 1000) }, {
    "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
  });
}

/** Parse a JSON body against a schema, or return a ready 400 response. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError(400, "invalid_json") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(400, "invalid_body", {
        issues: parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
      }),
    };
  }
  return { ok: true, data: parsed.data };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
