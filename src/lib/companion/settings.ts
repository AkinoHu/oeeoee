/**
 * Companion configuration vocabulary shared by the console UI, server actions,
 * the device API and the brain. Client-safe (no server imports).
 */

/** Models the companion can run on. Ids per the Claude API model table. */
export const COMPANION_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type CompanionModel = (typeof COMPANION_MODELS)[number];
export const DEFAULT_MODEL: CompanionModel = "claude-haiku-5-5";

export function isCompanionModel(value: unknown): value is CompanionModel {
  return typeof value === "string" && (COMPANION_MODELS as readonly string[]).includes(value);
}

export const COMPANION_LANGUAGES = ["auto", "en", "zh", "ja"] as const;
export type CompanionLanguage = (typeof COMPANION_LANGUAGES)[number];
export type ReplyLanguage = Exclude<CompanionLanguage, "auto">;

/** TTS voice presets understood by the device voice pipeline. */
export const VOICE_PRESETS = ["warm", "bright", "calm", "playful", "gentle"] as const;
export type VoicePreset = (typeof VOICE_PRESETS)[number];

export const MEMORY_KINDS = ["FACT", "PREFERENCE", "EVENT", "HEALTH", "WORK"] as const;
export type MemoryKindValue = (typeof MEMORY_KINDS)[number];

export const CHAT_CHANNELS = ["web", "device", "desktop", "mobile"] as const;
export type ChatChannel = (typeof CHAT_CHANNELS)[number];

export const POT_SIZES = ["S", "M", "L"] as const;

/** Pots one account may have, and how many of them may be demo pots. */
export const MAX_POTS_PER_USER = 20;
export const MAX_DEMO_POTS_PER_USER = 3;
/** Serial prefix that marks a simulated demo pot. */
export const DEMO_SERIAL_PREFIX = "OEE-DEMO";

/** How often a pot should report telemetry. */
export const TELEMETRY_INTERVAL_SECONDS = 300;

/** Stored in `Companion.reminders` (JSON). Times are "HH:MM" in `timezone`. */
export interface ReminderSettings {
  /** Nudge to stand up / stretch after this many minutes of sitting; 0 = off. */
  sedentaryMinutes: number;
  /** Nudge to drink water every N minutes; 0 = off. */
  hydrationMinutes: number;
  workStart: string;
  workEnd: string;
  quietStart: string;
  quietEnd: string;
  /** IANA time zone of the user, e.g. "Asia/Shanghai". */
  timezone: string | null;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  sedentaryMinutes: 50,
  hydrationMinutes: 90,
  workStart: "09:00",
  workEnd: "18:00",
  quietStart: "22:30",
  quietEnd: "07:00",
  timezone: null,
};

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Whether a time zone was ever chosen, including deliberately cleared
 * (`timezone: null` saved from the settings form). Only a never-set one may be
 * filled in automatically from the browser or the pot.
 */
export function timezoneWasSet(json: unknown): boolean {
  return Boolean(json && typeof json === "object" && !Array.isArray(json) && "timezone" in json);
}

/** Read the reminders JSON column defensively, filling defaults. */
export function readReminders(json: unknown): ReminderSettings {
  const src = json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
  const minutes = (v: unknown, d: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 24 * 60 ? Math.round(v) : d;
  const clock = (v: unknown, d: string) => (typeof v === "string" && CLOCK.test(v) ? v : d);
  return {
    sedentaryMinutes: minutes(src.sedentaryMinutes, DEFAULT_REMINDERS.sedentaryMinutes),
    hydrationMinutes: minutes(src.hydrationMinutes, DEFAULT_REMINDERS.hydrationMinutes),
    workStart: clock(src.workStart, DEFAULT_REMINDERS.workStart),
    workEnd: clock(src.workEnd, DEFAULT_REMINDERS.workEnd),
    quietStart: clock(src.quietStart, DEFAULT_REMINDERS.quietStart),
    quietEnd: clock(src.quietEnd, DEFAULT_REMINDERS.quietEnd),
    timezone: typeof src.timezone === "string" && src.timezone ? src.timezone : null,
  };
}
