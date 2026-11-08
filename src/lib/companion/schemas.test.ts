import { describe, expect, it } from "vitest";
import {
  brainOutputSchema,
  companionSettingsSchema,
  deviceChatSchema,
  deviceCreateSchema,
  memorySchema,
  telemetryBodySchema,
  telemetryReadings,
  webChatSchema,
} from "./schemas";
import { readReminders, DEFAULT_REMINDERS, timezoneWasSet } from "./settings";

describe("telemetry body", () => {
  it("accepts a single reading with metadata", () => {
    const r = telemetryBodySchema.parse({ soilMoisture: 41.5, airTemp: 22, firmwareVersion: "0.3.1", timezone: "Asia/Tokyo" });
    expect(telemetryReadings(r)).toHaveLength(1);
    expect(r.firmwareVersion).toBe("0.3.1");
  });

  it("accepts a batch and parses timestamps (ISO, seconds, ms)", () => {
    const r = telemetryBodySchema.parse({
      readings: [
        { recordedAt: "2026-06-01T10:00:00Z", soilMoisture: 40 },
        { recordedAt: 1780308000, waterLevel: 60 },
        { recordedAt: 1780308000000, growLightOn: true },
      ],
    });
    const rows = telemetryReadings(r);
    expect(rows).toHaveLength(3);
    expect(rows[0].recordedAt?.toISOString()).toBe("2026-06-01T10:00:00.000Z");
    expect(rows[1].recordedAt?.getTime()).toBe(1780308000000);
    expect(rows[2].recordedAt?.getTime()).toBe(1780308000000);
  });

  it("rejects empty, out-of-range or malformed readings", () => {
    expect(telemetryBodySchema.safeParse({}).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ readings: [] }).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ soilMoisture: 140 }).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ soilMoisture: "40" }).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ airTemp: 20, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ readings: [{ recordedAt: "yesterday", soilMoisture: 3 }] }).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ readings: Array.from({ length: 501 }, () => ({ airTemp: 20 })) }).success).toBe(false);
  });

  it("rejects numeric timestamps outside the range a Date can hold", () => {
    // Number.MAX_SAFE_INTEGER ms is past the Date range (±8.64e15 ms): Invalid Date reached the DB and 500'd.
    expect(telemetryBodySchema.safeParse({ soilMoisture: 40, recordedAt: Number.MAX_SAFE_INTEGER }).success).toBe(false);
    expect(telemetryBodySchema.safeParse({ readings: [{ soilMoisture: 40, recordedAt: 8.64e15 + 1 }] }).success).toBe(false);
  });

  it("requires recordedAt on every reading of a multi-reading batch", () => {
    // Without timestamps every row was stamped "now", so the "latest" reading was picked arbitrarily.
    expect(telemetryBodySchema.safeParse({ readings: [{ soilMoisture: 12 }, { soilMoisture: 48 }] }).success).toBe(false);
    expect(
      telemetryBodySchema.safeParse({ readings: [{ recordedAt: 1780308000, soilMoisture: 12 }, { soilMoisture: 48 }] }).success,
    ).toBe(false);
    // A one-reading batch may still omit it (it means "now").
    expect(telemetryBodySchema.safeParse({ readings: [{ soilMoisture: 48 }] }).success).toBe(true);
  });
});

describe("chat bodies", () => {
  it("trims and bounds text", () => {
    expect(deviceChatSchema.parse({ text: "  hi  " }).text).toBe("hi");
    expect(deviceChatSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(deviceChatSchema.safeParse({ text: "x".repeat(2001) }).success).toBe(false);
    expect(webChatSchema.parse({ text: "hello", deviceId: "abc" })).toEqual({ text: "hello", deviceId: "abc" });
  });
});

describe("console forms", () => {
  const valid = {
    name: "Sprout",
    persona: "",
    language: "auto",
    voice: "warm",
    model: "claude-haiku-5-5",
    temperature: "0.8",
    maxTokens: "400",
    sedentaryMinutes: "50",
    hydrationMinutes: "0",
    workStart: "09:00",
    workEnd: "18:00",
    quietStart: "22:30",
    quietEnd: "07:00",
    timezone: "Europe/Berlin",
  };

  it("coerces form data for companion settings", () => {
    const s = companionSettingsSchema.parse(valid);
    expect(s.temperature).toBe(0.8);
    expect(s.maxTokens).toBe(400);
    expect(s.hydrationMinutes).toBe(0);
    expect(companionSettingsSchema.parse({ ...valid, timezone: "" }).timezone).toBe("");
  });

  it("rejects unknown models, bad clocks and out-of-range values", () => {
    expect(companionSettingsSchema.safeParse({ ...valid, model: "gpt-x" }).success).toBe(false);
    expect(companionSettingsSchema.safeParse({ ...valid, workStart: "9am" }).success).toBe(false);
    expect(companionSettingsSchema.safeParse({ ...valid, temperature: "1.5" }).success).toBe(false);
    expect(companionSettingsSchema.safeParse({ ...valid, workEnd: "09:00" }).success).toBe(false);
    expect(companionSettingsSchema.safeParse({ ...valid, name: " " }).success).toBe(false);
  });

  it("validates memories and devices", () => {
    expect(memorySchema.parse({ kind: "PREFERENCE", content: " Tea ", importance: "4" })).toEqual({
      kind: "PREFERENCE",
      content: "Tea",
      importance: 4,
    });
    expect(memorySchema.safeParse({ kind: "SECRET", content: "x", importance: 3 }).success).toBe(false);
    expect(memorySchema.safeParse({ kind: "FACT", content: "x", importance: 6 }).success).toBe(false);
    expect(deviceCreateSchema.parse({ name: "Desk", plantId: "", potSize: "M" }).plantId).toBe("");
    expect(deviceCreateSchema.safeParse({ name: "Desk", plantId: "rose", potSize: "M" }).success).toBe(false);
    expect(deviceCreateSchema.safeParse({ name: "Desk", plantId: "pothos", potSize: "XL" }).success).toBe(false);
  });

  it("validates the brain's structured output", () => {
    expect(brainOutputSchema.safeParse({ reply: "Hi", expression: "happy", memory: null }).success).toBe(true);
    expect(brainOutputSchema.safeParse({ reply: "Hi", memory: null }).success).toBe(false);
    expect(
      brainOutputSchema.safeParse({ reply: "Hi", expression: "love", memory: { kind: "FACT", content: "x", importance: 3 } }).success,
    ).toBe(true);
  });
});

describe("reminder settings", () => {
  it("fills defaults and ignores garbage", () => {
    expect(readReminders(null)).toEqual(DEFAULT_REMINDERS);
    expect(readReminders({ sedentaryMinutes: 30, workStart: "8am", timezone: "Asia/Shanghai" })).toMatchObject({
      sedentaryMinutes: 30,
      workStart: "09:00",
      timezone: "Asia/Shanghai",
    });
    expect(readReminders([1, 2]).hydrationMinutes).toBe(90);
  });

  it("tells a never-set time zone from one the user cleared", () => {
    // Only a never-set zone may be auto-filled from the browser or the pot.
    expect(timezoneWasSet(null)).toBe(false);
    expect(timezoneWasSet({ sedentaryMinutes: 30 })).toBe(false);
    expect(timezoneWasSet({ ...DEFAULT_REMINDERS, timezone: null })).toBe(true);
    expect(timezoneWasSet({ timezone: "Asia/Tokyo" })).toBe(true);
  });
});
