/**
 * Request / form validation for the device API, the web chat endpoint and
 * the console's server actions. Client-safe.
 */
import { z } from "zod";
import { EXPRESSIONS } from "@/components/companion-face/types";
import { PLANT_IDS } from "@/data/types";
import { isValidTimeZone } from "@/lib/vitals";
import { COMPANION_LANGUAGES, COMPANION_MODELS, MEMORY_KINDS, POT_SIZES, VOICE_PRESETS } from "./settings";

// ── Shared pieces ────────────────────────────────────────────

const timeZone = z
  .string()
  .trim()
  .max(64)
  .refine((tz) => isValidTimeZone(tz), { message: "Unknown IANA time zone" });

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");

/** ISO-8601 string, or a Unix timestamp in seconds or milliseconds. */
const timestamp = z
  .union([z.iso.datetime({ offset: true }), z.number().int().positive()])
  .transform((v) => (typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v)));

// ── Device API ───────────────────────────────────────────────

export const telemetryReadingSchema = z
  .object({
    recordedAt: timestamp.optional(),
    soilMoisture: z.number().min(0).max(100).nullish(),
    airTemp: z.number().min(-40).max(85).nullish(),
    airHumidity: z.number().min(0).max(100).nullish(),
    lightLux: z.number().min(0).max(200_000).nullish(),
    waterLevel: z.number().min(0).max(100).nullish(),
    growLightOn: z.boolean().nullish(),
    pumpRanSec: z.number().int().min(0).max(3600).nullish(),
  })
  .refine(
    (r) =>
      [r.soilMoisture, r.airTemp, r.airHumidity, r.lightLux, r.waterLevel, r.growLightOn, r.pumpRanSec].some(
        (v) => v !== undefined && v !== null,
      ),
    { message: "A reading needs at least one sensor value" },
  );
export type TelemetryReadingInput = z.infer<typeof telemetryReadingSchema>;

const deviceMeta = {
  firmwareVersion: z.string().trim().min(1).max(32).optional(),
  /** IANA zone of the pot, used for the light schedule and quiet hours. */
  timezone: timeZone.optional(),
};

/** Either `{ readings: [...] }` (batch, ≤ 500) or a single reading object. */
export const telemetryBodySchema = z.union([
  z.object({ readings: z.array(telemetryReadingSchema).min(1).max(500), ...deviceMeta }),
  z.intersection(telemetryReadingSchema, z.object(deviceMeta)),
]);
export type TelemetryBody = z.infer<typeof telemetryBodySchema>;

/** Normalise either telemetry body shape. */
export function telemetryReadings(body: TelemetryBody): TelemetryReadingInput[] {
  return "readings" in body ? body.readings : [body];
}

export const deviceChatSchema = z.object({
  /** Transcript from the pot's on-device speech-to-text. */
  text: z.string().trim().min(1).max(2000),
  timezone: timeZone.optional(),
});

// ── Web ──────────────────────────────────────────────────────

export const webChatSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  deviceId: z.string().trim().min(1).max(64).optional(),
  timezone: timeZone.optional(),
});

// ── Console forms ────────────────────────────────────────────

export const companionSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    persona: z.string().trim().max(2000),
    language: z.enum(COMPANION_LANGUAGES),
    voice: z.enum(VOICE_PRESETS),
    model: z.enum(COMPANION_MODELS),
    temperature: z.coerce.number().min(0).max(1),
    maxTokens: z.coerce.number().int().min(64).max(2048),
    sedentaryMinutes: z.coerce.number().int().min(0).max(240),
    hydrationMinutes: z.coerce.number().int().min(0).max(480),
    workStart: clock,
    workEnd: clock,
    quietStart: clock,
    quietEnd: clock,
    timezone: z.union([z.literal(""), timeZone]),
  })
  .refine((v) => v.workStart !== v.workEnd, { path: ["workEnd"], message: "Work hours need a start and an end" });
export type CompanionSettingsInput = z.infer<typeof companionSettingsSchema>;

export const memorySchema = z.object({
  kind: z.enum(MEMORY_KINDS),
  content: z.string().trim().min(1).max(1000),
  importance: z.coerce.number().int().min(1).max(5),
});

export const deviceCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  plantId: z.union([z.literal(""), z.enum(PLANT_IDS)]),
  potSize: z.enum(POT_SIZES),
});

// ── Brain structured output ──────────────────────────────────

/**
 * What the model returns. Deliberately permissive: the SDK sends enums as
 * descriptions, and a slightly off value shouldn't discard a good reply, so
 * values are validated and clamped by `normalizeBrainOutput` after parsing.
 */
export const brainOutputSchema = z.object({
  reply: z.string().describe("What you say out loud: 1–3 short, natural spoken sentences."),
  expression: z.string().describe(`The face to show. One of: ${EXPRESSIONS.join(", ")}.`),
  memory: z
    .object({
      kind: z.string().describe(`One of: ${MEMORY_KINDS.join(", ")}.`),
      content: z.string().describe('Short third-person note, e.g. "Prefers jasmine tea".'),
      importance: z.number().describe("1 (trivia) to 5 (core)."),
    })
    .nullable()
    .describe("A new durable fact about your human worth remembering, or null."),
});
export type BrainOutput = z.infer<typeof brainOutputSchema>;

/** Flatten zod issues to `{ field: message }` for form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
