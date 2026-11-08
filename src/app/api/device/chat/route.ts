import { chatWithCompanion } from "@/lib/companion/brain";
import { authenticateDevice } from "@/lib/companion/device-auth";
import { json, parseBody } from "@/lib/companion/http";
import { deviceChatSchema } from "@/lib/companion/schemas";

/**
 * POST /api/device/chat
 * Auth: `Authorization: Bearer <device token>`.
 * Body: `{ text }`: the user's words after on-device speech-to-text.
 * Responds `{ reply, expression }` for the pot to speak and show.
 */
export async function POST(request: Request) {
  const auth = await authenticateDevice(request, "chat");
  if (!auth.ok) return auth.response;
  const { device } = auth;

  const body = await parseBody(request, deviceChatSchema);
  if (!body.ok) return body.response;

  const result = await chatWithCompanion({
    userId: device.userId,
    text: body.data.text,
    channel: "device",
    deviceId: device.id,
    timeZone: body.data.timezone,
  });

  return json({
    ok: true,
    reply: result.reply,
    expression: result.expression,
    fallback: result.fallback,
    fallbackReason: result.fallbackReason,
    memorySaved: Boolean(result.memory),
  });
}
