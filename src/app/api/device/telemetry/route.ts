import { authenticateDevice } from "@/lib/companion/device-auth";
import { json, parseBody } from "@/lib/companion/http";
import { companionClock, getOrCreateCompanion, potState } from "@/lib/companion/queries";
import { telemetryBodySchema, telemetryReadings } from "@/lib/companion/schemas";
import { readReminders, TELEMETRY_INTERVAL_SECONDS } from "@/lib/companion/settings";
import { prisma } from "@/lib/db";

const MAX_FUTURE_MS = 5 * 60_000;
const MAX_AGE_MS = 30 * 24 * 3600_000;

/**
 * POST /api/device/telemetry
 * Auth: `Authorization: Bearer <device token>`.
 * Body: one reading `{ soilMoisture, airTemp, … }` or a batch `{ readings: [...] }`,
 * optionally with `firmwareVersion` and `timezone`.
 * Responds with the care actions the pot should run now and the face to show.
 */
export async function POST(request: Request) {
  const auth = await authenticateDevice(request, "telemetry");
  if (!auth.ok) return auth.response;
  const { device } = auth;

  const body = await parseBody(request, telemetryBodySchema);
  if (!body.ok) return body.response;

  const now = new Date();
  let rejected = 0;
  const rows = telemetryReadings(body.data).flatMap((r) => {
    let recordedAt = r.recordedAt ?? now;
    if (recordedAt.getTime() > now.getTime() + MAX_FUTURE_MS || now.getTime() - recordedAt.getTime() > MAX_AGE_MS) {
      rejected += 1;
      return [];
    }
    if (recordedAt > now) recordedAt = now; // small clock skew
    return [
      {
        deviceId: device.id,
        recordedAt,
        soilMoisture: r.soilMoisture ?? null,
        airTemp: r.airTemp ?? null,
        airHumidity: r.airHumidity ?? null,
        lightLux: r.lightLux ?? null,
        waterLevel: r.waterLevel ?? null,
        growLightOn: r.growLightOn ?? null,
        pumpRanSec: r.pumpRanSec ?? null,
      },
    ];
  });

  await prisma.$transaction([
    prisma.telemetry.createMany({ data: rows }),
    prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: now, ...(body.data.firmwareVersion ? { firmwareVersion: body.data.firmwareVersion } : {}) },
    }),
  ]);

  const companion = await getOrCreateCompanion(device.userId);
  // Learn the owner's time zone from the pot if it was never set.
  if (body.data.timezone && !readReminders(companion.reminders).timezone) {
    await prisma.companion.update({
      where: { id: companion.id },
      data: { reminders: { ...readReminders(companion.reminders), timezone: body.data.timezone } },
    });
  }
  const clock = companionClock(companion, body.data.timezone);
  const state = await potState(device, now, clock.vitalsOptions);

  return json({
    ok: true,
    accepted: rows.length,
    rejected,
    actions: state.actions,
    expression: state.vitals.expression,
    status: state.vitals.status,
    issues: state.vitals.issues,
    nextReportSeconds: TELEMETRY_INTERVAL_SECONDS,
  });
}
