import "server-only";
import { cache } from "react";
import { getPlant } from "@/data";
import { Prisma, type Device } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  assessVitals,
  careActions,
  isValidTimeZone,
  mergeSnapshots,
  METRIC_KEYS,
  type CareActions,
  type MetricKey,
  type TelemetrySnapshot,
  type VitalsAssessment,
  type VitalsOptions,
} from "@/lib/vitals";
import { bucketize } from "./series";
import { readReminders, type ReminderSettings } from "./settings";

/**
 * The user's companion, created with defaults on first use. Wrapped in React
 * `cache` so the console layout and page share one lookup per request.
 */
export const getOrCreateCompanion = cache(async function getOrCreateCompanion(userId: string) {
  const existing = await prisma.companion.findUnique({ where: { userId } });
  if (existing) return existing;
  try {
    return await prisma.companion.create({ data: { userId } });
  } catch (error) {
    // On a user's first visit the console layout and page both get here at once;
    // Prisma upserts aren't atomic, so the request that loses the race re-reads.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.companion.findUniqueOrThrow({ where: { userId } });
    }
    throw error;
  }
});

export type CompanionRecord = Awaited<ReturnType<typeof getOrCreateCompanion>>;

/** Time zone + quiet hours used for every time-of-day decision. */
export function companionClock(companion: Pick<CompanionRecord, "reminders">, override?: string | null) {
  const reminders: ReminderSettings = readReminders(companion.reminders);
  const timeZone = isValidTimeZone(override) ? override : isValidTimeZone(reminders.timezone) ? reminders.timezone : "UTC";
  const vitalsOptions: VitalsOptions = {
    timeZone,
    quietHours: { start: reminders.quietStart, end: reminders.quietEnd },
  };
  return { reminders, timeZone, vitalsOptions };
}

/**
 * Latest state of a pot: newest non-null value per sensor across the readings
 * from the last two hours of activity.
 */
export async function latestSnapshot(deviceId: string): Promise<TelemetrySnapshot | null> {
  const rows = await prisma.telemetry.findMany({
    where: { deviceId },
    orderBy: { recordedAt: "desc" },
    take: 24,
  });
  if (rows.length === 0) return null;
  const newest = rows[0].recordedAt.getTime();
  return mergeSnapshots(rows.filter((r) => newest - r.recordedAt.getTime() <= 2 * 3600_000));
}

export async function lastWateredAt(deviceId: string): Promise<Date | null> {
  const row = await prisma.telemetry.findFirst({
    where: { deviceId, pumpRanSec: { gt: 0 } },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  return row?.recordedAt ?? null;
}

export interface PotState {
  device: Device;
  snapshot: TelemetrySnapshot | null;
  vitals: VitalsAssessment;
  actions: CareActions;
}

export async function potState(device: Device, now: Date, opts: VitalsOptions): Promise<PotState> {
  const [snapshot, watered] = await Promise.all([latestSnapshot(device.id), lastWateredAt(device.id)]);
  const plant = getPlant(device.plantId);
  return {
    device,
    snapshot,
    vitals: assessVitals(plant, snapshot, now, opts),
    actions: careActions(plant, snapshot, now, { timeZone: opts.timeZone, potSize: device.potSize, lastWateredAt: watered }),
  };
}

export type MetricSeries = Record<MetricKey, (number | null)[]>;

export interface PotSummary extends PotState {
  /** 24 h, 48 half-hour buckets per metric. */
  series: MetricSeries;
}

/** All of a user's pots with vitals and a 24 h sparkline series, most recently seen first. */
export async function loadPots(userId: string, now: Date, opts: VitalsOptions): Promise<PotSummary[]> {
  const devices = await prisma.device.findMany({
    where: { userId },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  const start = new Date(now.getTime() - 24 * 3600_000);
  return Promise.all(
    devices.map(async (device) => {
      const [state, rows] = await Promise.all([
        potState(device, now, opts),
        prisma.telemetry.findMany({
          where: { deviceId: device.id, recordedAt: { gte: start, lte: now } },
          orderBy: { recordedAt: "asc" },
        }),
      ]);
      const series = Object.fromEntries(
        METRIC_KEYS.map((key) => [key, bucketize(rows, start, now, 48, (r) => r[key])]),
      ) as MetricSeries;
      return { ...state, series };
    }),
  );
}

/** The pot the companion "lives in" for chat: an explicit one, else the most recently active. */
export async function primaryDevice(userId: string, deviceId?: string | null): Promise<Device | null> {
  if (deviceId) {
    const device = await prisma.device.findFirst({ where: { id: deviceId, userId } });
    if (device) return device;
  }
  return prisma.device.findFirst({
    where: { userId },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
}
