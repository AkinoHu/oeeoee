import { chatWithCompanion } from "@/lib/companion/brain";
import { apiError, json, parseBody, rateLimited } from "@/lib/companion/http";
import { namedRateLimiter } from "@/lib/companion/rate-limit";
import { webChatSchema } from "@/lib/companion/schemas";
import { getUser } from "@/lib/session";

/**
 * POST /api/companion/chat: the console playground. Same brain as the pot,
 * authenticated by the signed-in session, channel "web".
 */
export async function POST(request: Request) {
  // JSON-only: cross-site forms can't send application/json without a CORS preflight.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "invalid_body", { message: "Expected application/json" });
  }
  const user = await getUser();
  if (!user) return apiError(401, "unauthorized");

  const limit = namedRateLimiter("companion-web-chat", { limit: 30, windowMs: 60_000 }).check(user.id);
  if (!limit.ok) return rateLimited(limit.retryAfterMs);

  const body = await parseBody(request, webChatSchema);
  if (!body.ok) return body.response;

  const result = await chatWithCompanion({
    userId: user.id,
    text: body.data.text,
    channel: "web",
    deviceId: body.data.deviceId,
    timeZone: body.data.timezone,
  });
  return json({ ok: true, ...result });
}
