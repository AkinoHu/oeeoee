/**
 * Plant "vital signs": pure assessment of a pot's latest sensor reading and the
 * auto-care controller the pot runs (water pump + grow light).
 *
 * Everything here is deterministic and side-effect free so it can run on the
 * server (device API, console) and in unit tests. Time-of-day logic takes an
 * IANA time zone because "daytime" and "quiet hours" are the user's local time.
 */
import type { Expression } from "@/components/companion-face/types";
import type { Level3, Plant } from "@/data/types";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

/** One sensor reading (a Prisma `Telemetry` row is assignable). */
export interface TelemetrySnapshot {
  recordedAt: Date;
  soilMoisture?: number | null;
  airTemp?: number | null;
  airHumidity?: number | null;
  lightLux?: number | null;
  waterLevel?: number | null;
  growLightOn?: boolean | null;
  pumpRanSec?: number | null;
}

export type VitalStatus = "thriving" | "ok" | "needs_attention" | "critical";
export type Severity = "info" | "warning" | "critical";
export type IssueCode =
  | "no_data"
  | "offline"
  | "dry"
  | "waterlogged"
  | "cold"
  | "hot"
  | "too_dark"
  | "tank_low"
  | "tank_empty";

export interface VitalIssue {
  code: IssueCode;
  severity: Severity;
  /** The measured value that triggered the issue (minutes for `offline`). */
  value?: number;
}

export const METRIC_KEYS = ["soilMoisture", "airTemp", "airHumidity", "lightLux", "waterLevel"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface MetricState {
  value: number | null;
  /** Comfortable range for this plant; null when there is no target (water tank). */
  target: [number, number] | null;
  level: "ok" | "low" | "high" | "unknown";
  /** Worst severity attached to this metric, or null when it is fine. */
  severity: Severity | null;
}

export interface VitalsAssessment {
  status: VitalStatus;
  /** Sorted worst-first. */
  issues: VitalIssue[];
  /** Face the pot should show for these vitals. */
  expression: Expression;
  metrics: Record<MetricKey, MetricState>;
  online: boolean;
  /** Within quiet hours (local time). */
  night: boolean;
  /** Within the grow-light schedule window (local time). */
  daytime: boolean;
  minutesSinceSeen: number | null;
}

/** Everything the controller needs to know about a plant. */
export interface CareProfile {
  soilMoisture: [number, number];
  lightHours: number;
  lux: [number, number];
  tempRange: [number, number];
  humidity: [number, number];
}

export type PlantLike = Pick<Plant, "care" | "tempRange" | "humidity">;

export interface QuietHours {
  /** "HH:MM" local time. */
  start: string;
  end: string;
}

export interface VitalsOptions {
  timeZone?: string | null;
  quietHours?: QuietHours | null;
  offlineAfterMinutes?: number;
}

export interface CareActions {
  /** Seconds to run the pump now (0 = don't water). */
  pumpSeconds: number;
  growLightOn: boolean;
}

export interface CareOptions {
  timeZone?: string | null;
  /** The grow light stays off inside them (default 22:30–07:00). */
  quietHours?: QuietHours | null;
  potSize?: string | null;
  /** Reservoir capacity (ml); a dose never exceeds the water left. Defaults to the smallest pot's. */
  reservoirMl?: number | null;
  /** When the pump last ran or was told to; watering pauses while the soil soaks up water. */
  lastWateredAt?: Date | null;
  /** Pump seconds run or commanded in the last 24 h, against `dailyPumpBudgetSec`. */
  pumpedLast24hSec?: number;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const OFFLINE_AFTER_MINUTES = 60;
const OFFLINE_CRITICAL_MINUTES = 24 * 60;
export const TANK_LOW = 20;
export const TANK_EMPTY = 5;
/** Lux the grow light adds at canopy height; subtracted to estimate ambient light. */
export const GROW_LIGHT_LUX = 2000;
/** Local hour the grow-light schedule is centred on. */
export const LIGHT_CENTER_HOUR = 13;
/** Minutes to let water soak in before the pump may run again. */
export const SOAK_MINUTES = 20;
/** Pump seconds per % of volumetric water content, by pot size. */
export const PUMP_SEC_PER_PCT: Record<string, number> = { S: 0.5, M: 0.8, L: 1.3 };
const PUMP_MIN_SEC = 2;
const PUMP_MAX_SEC = 30;
/** Flow of the pot's pump. */
export const PUMP_ML_PER_SEC = 6;
/** Smallest pot model's reservoir, assumed when the pot size is unknown. */
const FALLBACK_RESERVOIR_ML = 600;
const DAY_MS = 24 * 3600_000;

const HUMIDITY_RANGE: Record<Level3, [number, number]> = {
  low: [20, 60],
  medium: [35, 75],
  high: [50, 90],
};

const DEFAULT_PROFILE: CareProfile = {
  soilMoisture: [30, 60],
  lightHours: 8,
  lux: [800, 5000],
  tempRange: [15, 30],
  humidity: HUMIDITY_RANGE.medium,
};

export const DEFAULT_QUIET_HOURS: QuietHours = { start: "22:30", end: "07:00" };

const SEVERITY_RANK: Record<Severity, number> = { info: 1, warning: 2, critical: 3 };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Care targets for a plant, or a forgiving default when the plant is unknown. */
export function careProfile(plant?: PlantLike | null): CareProfile {
  if (!plant) return DEFAULT_PROFILE;
  return {
    soilMoisture: plant.care.soilMoisture,
    lightHours: plant.care.lightHours,
    lux: plant.care.lux,
    tempRange: plant.tempRange,
    humidity: HUMIDITY_RANGE[plant.humidity] ?? DEFAULT_PROFILE.humidity,
  };
}

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Local time of day as a fractional hour (0 ≤ h < 24) in the given IANA zone (UTC fallback). */
export function localHour(now: Date, timeZone?: string | null): number {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour + minute / 60;
}

/** "07:30" → 7.5. Returns null for malformed input. */
export function parseClock(value: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

/** Whether hour `h` falls in [start, end), wrapping past midnight when start > end. */
export function inWindow(h: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? h >= start && h < end : h >= start || h < end;
}

/**
 * Grow-light schedule in local hours: `lightHours` centred on early afternoon,
 * moved out of the user's quiet hours (default 22:30–07:00), or clipped to the
 * waking hours when it can't fit. `end` < `start` means it runs past midnight.
 */
export function lightWindow(lightHours: number, quietHours?: QuietHours | null): { start: number; end: number } {
  const hours = Math.min(18, Math.max(0, lightHours));
  let start = LIGHT_CENTER_HOUR - hours / 2;
  const q = quietHours ?? DEFAULT_QUIET_HOURS;
  const quietStart = parseClock(q.start) ?? parseClock(DEFAULT_QUIET_HOURS.start)!;
  const quietEnd = parseClock(q.end) ?? parseClock(DEFAULT_QUIET_HOURS.end)!;
  if (hours > 0 && quietStart !== quietEnd) {
    // Waking hours run from the end of quiet hours to their start.
    const awake = (quietStart - quietEnd + 24) % 24;
    if (hours >= awake) return { start: quietEnd, end: quietStart };
    // Where the centred window starts relative to waking up, in (-12, 12] h; slide it inside.
    const offset = ((((start - quietEnd + 12) % 24) + 24) % 24) - 12;
    start = quietEnd + Math.min(awake - hours, Math.max(0, offset));
  }
  start = ((start % 24) + 24) % 24;
  return { start, end: (start + hours) % 24 };
}

export function isQuietTime(now: Date, opts: Pick<VitalsOptions, "timeZone" | "quietHours"> = {}): boolean {
  const q = opts.quietHours ?? DEFAULT_QUIET_HOURS;
  const start = parseClock(q.start) ?? parseClock(DEFAULT_QUIET_HOURS.start)!;
  const end = parseClock(q.end) ?? parseClock(DEFAULT_QUIET_HOURS.end)!;
  return inWindow(localHour(now, opts.timeZone), start, end);
}

/**
 * Combine recent readings (any order) into one snapshot: the newest
 * non-null value of each field, stamped with the newest reading time.
 * Devices may send partial payloads (e.g. only the soil sensor).
 */
export function mergeSnapshots(rows: readonly TelemetrySnapshot[]): TelemetrySnapshot | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  const merged: TelemetrySnapshot = { recordedAt: sorted[0].recordedAt };
  const fields = [...METRIC_KEYS, "growLightOn"] as const;
  for (const field of fields) {
    const hit = sorted.find((r) => r[field] !== null && r[field] !== undefined);
    if (hit) (merged as unknown as Record<string, unknown>)[field] = hit[field];
  }
  // Pump activity only counts for the newest reading.
  merged.pumpRanSec = sorted[0].pumpRanSec ?? null;
  return merged;
}

const num = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function worse(a: Severity | null, b: Severity | null): Severity | null {
  if (!a) return b;
  if (!b) return a;
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function escalate(s: Severity): Severity {
  return s === "info" ? "warning" : "critical";
}

// ─────────────────────────────────────────────────────────────
// Assessment
// ─────────────────────────────────────────────────────────────

export function assessVitals(
  plant: PlantLike | null | undefined,
  latest: TelemetrySnapshot | null | undefined,
  now: Date,
  opts: VitalsOptions = {},
): VitalsAssessment {
  const profile = careProfile(plant);
  const night = isQuietTime(now, opts);
  const win = lightWindow(profile.lightHours, opts.quietHours);
  const daytime = inWindow(localHour(now, opts.timeZone), win.start, win.end);

  const metrics: Record<MetricKey, MetricState> = {
    soilMoisture: { value: null, target: profile.soilMoisture, level: "unknown", severity: null },
    airTemp: { value: null, target: profile.tempRange, level: "unknown", severity: null },
    airHumidity: { value: null, target: profile.humidity, level: "unknown", severity: null },
    lightLux: { value: null, target: profile.lux, level: "unknown", severity: null },
    waterLevel: { value: null, target: null, level: "unknown", severity: null },
  };

  if (!latest) {
    return {
      status: "ok",
      issues: [{ code: "no_data", severity: "info" }],
      expression: "curious",
      metrics,
      online: false,
      night,
      daytime,
      minutesSinceSeen: null,
    };
  }

  const issues: VitalIssue[] = [];
  const add = (issue: VitalIssue, metric?: MetricKey) => {
    issues.push(issue);
    if (metric) metrics[metric].severity = worse(metrics[metric].severity, issue.severity);
  };

  // Connectivity
  const minutesSinceSeen = Math.max(0, (now.getTime() - latest.recordedAt.getTime()) / 60000);
  const offlineAfter = opts.offlineAfterMinutes ?? OFFLINE_AFTER_MINUTES;
  const online = minutesSinceSeen <= offlineAfter;
  if (!online) {
    add({
      code: "offline",
      severity: minutesSinceSeen > OFFLINE_CRITICAL_MINUTES ? "critical" : "warning",
      value: Math.round(minutesSinceSeen),
    });
  }

  // Water tank
  const tank = num(latest.waterLevel);
  const tankEmpty = tank !== null && tank <= TANK_EMPTY;
  if (tank !== null) {
    metrics.waterLevel.value = tank;
    metrics.waterLevel.level = tank < TANK_LOW ? "low" : "ok";
    if (tankEmpty) add({ code: "tank_empty", severity: "critical", value: tank }, "waterLevel");
    else if (tank < TANK_LOW) add({ code: "tank_low", severity: "warning", value: tank }, "waterLevel");
  }

  // Soil moisture
  const soil = num(latest.soilMoisture);
  if (soil !== null) {
    const [min, max] = profile.soilMoisture;
    metrics.soilMoisture.value = soil;
    if (soil < min) {
      metrics.soilMoisture.level = "low";
      const deficit = min - soil;
      let severity: Severity = deficit <= 5 ? "info" : deficit <= 15 ? "warning" : "critical";
      // The pot can't fix dryness on its own when the tank is empty.
      if (tankEmpty) severity = escalate(severity);
      add({ code: "dry", severity, value: soil }, "soilMoisture");
    } else if (soil > max) {
      metrics.soilMoisture.level = "high";
      const excess = soil - max;
      // Up to +10 is normal right after watering.
      if (excess > 10) add({ code: "waterlogged", severity: excess > 25 ? "critical" : "warning", value: soil }, "soilMoisture");
    } else {
      metrics.soilMoisture.level = "ok";
    }
  }

  // Air temperature
  const temp = num(latest.airTemp);
  if (temp !== null) {
    const [min, max] = profile.tempRange;
    metrics.airTemp.value = temp;
    if (temp < min) {
      metrics.airTemp.level = "low";
      add({ code: "cold", severity: min - temp > 4 ? "critical" : "warning", value: temp }, "airTemp");
    } else if (temp > max) {
      metrics.airTemp.level = "high";
      add({ code: "hot", severity: temp - max > 4 ? "critical" : "warning", value: temp }, "airTemp");
    } else {
      metrics.airTemp.level = "ok";
    }
  }

  // Humidity: informational only (the pot can't change it).
  const rh = num(latest.airHumidity);
  if (rh !== null) {
    const [min, max] = profile.humidity;
    metrics.airHumidity.value = rh;
    metrics.airHumidity.level = rh < min ? "low" : rh > max ? "high" : "ok";
    if (metrics.airHumidity.level !== "ok") metrics.airHumidity.severity = "info";
  }

  // Light: only judged inside the light schedule; the grow light covers shortfalls.
  const lux = num(latest.lightLux);
  if (lux !== null) {
    metrics.lightLux.value = lux;
    const [min] = profile.lux;
    if (!daytime) {
      metrics.lightLux.level = "ok";
    } else if (latest.growLightOn) {
      metrics.lightLux.level = "ok";
    } else if (lux < min) {
      metrics.lightLux.level = "low";
      add({ code: "too_dark", severity: lux < min * 0.5 ? "warning" : "info", value: lux }, "lightLux");
    } else {
      metrics.lightLux.level = "ok";
    }
  }

  issues.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const worst = issues[0]?.severity ?? null;
  const status: VitalStatus =
    worst === "critical" ? "critical" : worst === "warning" ? "needs_attention" : worst === "info" ? "ok" : "thriving";

  return {
    status,
    issues,
    expression: pickExpression(issues, status, night, latest),
    metrics,
    online,
    night,
    daytime,
    minutesSinceSeen: Math.round(minutesSinceSeen),
  };
}

function pickExpression(issues: VitalIssue[], status: VitalStatus, night: boolean, latest: TelemetrySnapshot): Expression {
  const has = (code: IssueCode, severity?: Severity) =>
    issues.some((i) => i.code === code && (!severity || i.severity === severity));

  if (has("offline")) return "concerned";
  if (status === "critical") {
    if (has("dry", "critical")) return "thirsty";
    if (has("tank_empty")) return "concerned";
    return "sad";
  }
  if (night) return "sleepy";
  if (has("dry")) return "thirsty";
  if (status === "needs_attention") return "concerned";
  if ((latest.pumpRanSec ?? 0) > 0) return "love";
  return status === "thriving" ? "happy" : "neutral";
}

// ─────────────────────────────────────────────────────────────
// Auto-care controller
// ─────────────────────────────────────────────────────────────

/**
 * What the pot should do right now.
 * - Water when a fresh (≤ 1 h old) soil reading is below the plant's minimum,
 *   the tank level is known and not empty, and the last watering (reported or
 *   commanded) has had time to soak in. Dose scales with the deficit (to the
 *   middle of the target range) and the pot size, and never exceeds the water
 *   left in the tank or the pot's 24 h pump budget.
 * - Grow light follows a `lightHours` window centred on early afternoon but
 *   outside quiet hours, and stays off when ambient light already meets the
 *   plant's minimum lux.
 */
export function careActions(
  plant: PlantLike | null | undefined,
  telemetry: TelemetrySnapshot | null | undefined,
  now: Date,
  opts: CareOptions = {},
): CareActions {
  const profile = careProfile(plant);
  return {
    pumpSeconds: pumpDose(profile, telemetry, now, opts),
    growLightOn: growLight(profile, telemetry, now, opts),
  };
}

function pumpDose(profile: CareProfile, t: TelemetrySnapshot | null | undefined, now: Date, opts: CareOptions): number {
  const soil = num(t?.soilMoisture);
  if (!t || soil === null) return 0;
  // Never water on a stale reading (pot offline, or only old readings backfilled).
  if (now.getTime() - t.recordedAt.getTime() > OFFLINE_AFTER_MINUTES * 60000) return 0;
  const [min, max] = profile.soilMoisture;
  if (soil >= min) return 0;
  // Unknown tank level: the pump might run dry, so don't.
  const tank = num(t.waterLevel);
  if (tank === null || tank <= TANK_EMPTY) return 0;
  if (opts.lastWateredAt && now.getTime() - opts.lastWateredAt.getTime() < SOAK_MINUTES * 60000) return 0;
  const target = (min + max) / 2;
  const perPct = PUMP_SEC_PER_PCT[opts.potSize ?? "M"] ?? PUMP_SEC_PER_PCT.M;
  const wanted = Math.min(PUMP_MAX_SEC, Math.max(PUMP_MIN_SEC, Math.round((target - soil) * perPct)));
  // Never more than the water above the empty mark, nor past the day's budget.
  const reservoirMl = opts.reservoirMl ?? FALLBACK_RESERVOIR_ML;
  const waterSec = Math.floor((reservoirMl * (tank - TANK_EMPTY)) / 100 / PUMP_ML_PER_SEC);
  const budgetSec = dailyPumpBudgetSec(opts.potSize) - Math.max(0, opts.pumpedLast24hSec ?? 0);
  const seconds = Math.min(wanted, waterSec, budgetSec);
  return seconds >= PUMP_MIN_SEC ? seconds : 0;
}

/**
 * Pump seconds a pot may run in any 24 h: enough to take its soil from bone
 * dry to soaked once. Stops a stuck-dry soil sensor from emptying the tank
 * onto the desk.
 */
export function dailyPumpBudgetSec(potSize?: string | null): number {
  return Math.round(100 * (PUMP_SEC_PER_PCT[potSize ?? "M"] ?? PUMP_SEC_PER_PCT.M));
}

/**
 * Pump bookkeeping for `careActions`. The soak interval runs from the later of
 * the last reported watering and the last commanded dose (so a retried request
 * can't get a second dose), and a commanded dose the pot hasn't reported back
 * yet still counts toward the 24 h budget.
 */
export function pumpUsage(input: {
  now: Date;
  /** Newest reading with `pumpRanSec` > 0. */
  reportedAt: Date | null;
  /** Sum of reported `pumpRanSec` over the last 24 h. */
  reported24hSec: number;
  commandAt: Date | null;
  commandSec: number | null;
}): { lastWateredAt: Date | null; last24hSec: number } {
  const { now, reportedAt, commandAt } = input;
  const unreported = commandAt !== null && !(reportedAt && reportedAt >= commandAt) && now.getTime() - commandAt.getTime() < DAY_MS;
  const lastWateredAt = reportedAt && commandAt ? (reportedAt > commandAt ? reportedAt : commandAt) : (reportedAt ?? commandAt);
  return { lastWateredAt, last24hSec: input.reported24hSec + (unreported ? (input.commandSec ?? 0) : 0) };
}

function growLight(profile: CareProfile, t: TelemetrySnapshot | null | undefined, now: Date, opts: CareOptions): boolean {
  if (profile.lightHours <= 0) return false;
  const { start, end } = lightWindow(profile.lightHours, opts.quietHours);
  if (!inWindow(localHour(now, opts.timeZone), start, end)) return false;
  const lux = num(t?.lightLux);
  if (lux === null) return true; // no light sensor data: follow the schedule
  const currentlyOn = Boolean(t?.growLightOn);
  const ambient = Math.max(0, lux - (currentlyOn ? GROW_LIGHT_LUX : 0));
  const [minLux] = profile.lux;
  // Hysteresis: switch off only once ambient light is comfortably enough.
  return currentlyOn ? ambient < minLux * 1.2 : ambient < minLux;
}
