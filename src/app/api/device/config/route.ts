import { getPlant, lt } from "@/data";
import { authenticateDevice } from "@/lib/companion/device-auth";
import { formatClock } from "@/lib/companion/format";
import { json } from "@/lib/companion/http";
import { companionClock, getOrCreateCompanion } from "@/lib/companion/queries";
import { TELEMETRY_INTERVAL_SECONDS } from "@/lib/companion/settings";
import { prisma } from "@/lib/db";
import { isLocale } from "@/i18n/config";
import { careProfile, lightWindow } from "@/lib/vitals";

/**
 * GET /api/device/config
 * Auth: `Authorization: Bearer <device token>`.
 * Everything the pot's firmware needs: plant care targets and light schedule,
 * the companion's name / language / voice, and reminder settings.
 */
export async function GET(request: Request) {
  const auth = await authenticateDevice(request, "config");
  if (!auth.ok) return auth.response;
  const { device } = auth;

  const now = new Date();
  const [companion] = await Promise.all([
    getOrCreateCompanion(device.userId),
    prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: now } }),
  ]);
  const { reminders, timeZone } = companionClock(companion);
  const plant = getPlant(device.plantId);
  const profile = careProfile(plant);
  const window = lightWindow(profile.lightHours);
  const nameLocale = isLocale(companion.language) ? companion.language : "en";

  return json({
    ok: true,
    serverTime: now.toISOString(),
    telemetryIntervalSeconds: TELEMETRY_INTERVAL_SECONDS,
    device: {
      id: device.id,
      serial: device.serial,
      name: device.name,
      plantId: device.plantId,
      potSize: device.potSize,
      firmwareVersion: device.firmwareVersion,
    },
    plant: plant ? { id: plant.id, name: lt(plant.name, nameLocale), scientificName: plant.scientificName } : null,
    care: {
      soilMoisture: profile.soilMoisture,
      lux: profile.lux,
      lightHours: profile.lightHours,
      tempRange: profile.tempRange,
      humidity: profile.humidity,
      lightSchedule: { start: formatClock(window.start), end: formatClock(window.end), timezone: timeZone },
    },
    companion: { name: companion.name, language: companion.language, voice: companion.voice },
    reminders: { ...reminders, timezone: timeZone },
  });
}
