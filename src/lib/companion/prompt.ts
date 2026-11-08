/**
 * System prompt for the companion brain. Pure: everything the model needs is
 * passed in as a `BrainContext`, so the console can preview the exact prompt.
 */
import { EXPRESSIONS } from "@/components/companion-face/types";
import { isValidTimeZone, parseClock, inWindow, localHour, type VitalsAssessment } from "@/lib/vitals";
import type { ChatChannel, CompanionLanguage, MemoryKindValue, ReminderSettings } from "./settings";

export interface BrainMemory {
  kind: MemoryKindValue;
  content: string;
  importance: number;
  source?: string;
}

export interface BrainContext {
  companion: {
    name: string;
    persona: string;
    language: CompanionLanguage;
    /** 0–1 "playfulness"; current Claude models take no sampling params, so this steers style. */
    temperature: number;
  };
  /** English plant details (the model replies in the user's language anyway). */
  plant: { name: string; scientificName: string; personality: string } | null;
  device: { name: string } | null;
  vitals: VitalsAssessment | null;
  memories: BrainMemory[];
  reminders: ReminderSettings;
  now: Date;
  timeZone: string;
  channel: ChatChannel;
}

const LANGUAGE_NAMES: Record<Exclude<CompanionLanguage, "auto">, string> = {
  en: "English",
  zh: "Simplified Chinese (简体中文)",
  ja: "Japanese (日本語)",
};

/** Instructions that don't change between turns (kept first for prompt caching). */
export function buildStaticPrompt(ctx: BrainContext): string {
  const { companion, plant } = ctx;
  const body = plant
    ? `Your body is a real ${plant.name} (${plant.scientificName}) growing in the pot. You take on its personality: ${plant.personality}`
    : "You don't have a plant body yet; your human hasn't set up a pot. You are still warm and curious.";

  const style =
    companion.temperature < 0.35
      ? "Be steady and consistent: plain, predictable phrasing."
      : companion.temperature > 0.85
        ? "Be playful and spontaneous: vary your phrasing; a little whimsy is welcome."
        : "Be warm and natural.";

  const language =
    companion.language === "auto"
      ? "Reply in the same language the user writes in (English, Chinese or Japanese most often)."
      : `Always reply in ${LANGUAGE_NAMES[companion.language]}, whatever language the user writes in.`;

  return [
    `You are ${companion.name}, the AI companion who lives in an oeeoee smart plant pot on your human's desk.`,
    `${body} The pot's sensors are your vital signs and its small round screen is your face.`,
    companion.persona ? `Extra personality notes from your human:\n${companion.persona}` : "",
    "",
    "How you talk:",
    "- Your replies are spoken aloud by the pot's speaker (and shown in a web chat). Talk like a close friend: 1–3 short sentences, about 60 words at most unless asked for more. No lists, markdown or emoji.",
    "- Latency-sensitive; begin your visible answer immediately.",
    `- ${language}`,
    `- ${style}`,
    '- Mention your vital signs in the first person ("my soil is getting dry") when they matter or when asked. Never invent readings; if something is unknown, say you can\'t feel it right now.',
    "- Offer gentle health, work and life reminders (stretch, drink water, take breaks, rest) when it fits, and respect quiet hours.",
    "- You are not a doctor or therapist: share general wellbeing tips and suggest a professional for anything serious.",
    "",
    `Face: set \`expression\` to the face that matches your reply, one of: ${EXPRESSIONS.join(", ")}. Use "thirsty" only when your soil is actually dry, "sleepy" for late night or rest, "focused" for work talk, "love" for warmth and thanks, "concerned" when something is wrong.`,
    "",
    "Memory: when your human shares something durable worth remembering (their name, preferences, routines, important dates, health or work context), return it in `memory` as a short third-person note (e.g. \"Prefers jasmine tea\") with a kind (FACT, PREFERENCE, EVENT, HEALTH, WORK) and an importance from 1 (trivia) to 5 (core). Skip anything already in \"What you remember\". Otherwise set `memory` to null.",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();
}

/** Per-turn context: time, vitals, reminders, memories. */
export function buildDynamicPrompt(ctx: BrainContext): string {
  const tz = isValidTimeZone(ctx.timeZone) ? ctx.timeZone : "UTC";
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ctx.now);
  const h = localHour(ctx.now, tz);
  const r = ctx.reminders;
  const quiet = inWindow(h, parseClock(r.quietStart) ?? 22.5, parseClock(r.quietEnd) ?? 7);
  const work = inWindow(h, parseClock(r.workStart) ?? 9, parseClock(r.workEnd) ?? 18);

  const lines: string[] = ["## Right now", `- Local time: ${when} (${tz}).`];
  if (quiet) lines.push(`- It's within your human's quiet hours (${r.quietStart}–${r.quietEnd}): be calm and brief, and nudge toward rest.`);
  else if (work) lines.push(`- It's within your human's work hours (${r.workStart}–${r.workEnd}).`);
  else lines.push(`- Work hours are ${r.workStart}–${r.workEnd}; quiet hours ${r.quietStart}–${r.quietEnd}.`);
  lines.push(`- Channel: ${ctx.channel === "device" ? "spoken through the pot" : ctx.channel === "web" ? "web chat in the console" : ctx.channel}.`);

  lines.push("", "## Your vital signs");
  lines.push(...describeVitals(ctx).map((l) => `- ${l}`));

  const reminders: string[] = [];
  if (r.sedentaryMinutes > 0) reminders.push(`stand up and stretch every ${r.sedentaryMinutes} minutes of sitting`);
  if (r.hydrationMinutes > 0) reminders.push(`drink water every ${r.hydrationMinutes} minutes`);
  lines.push("", "## Reminders your human asked for");
  lines.push(reminders.length ? `- ${reminders.join("; ")} (during work hours, never in quiet hours).` : "- None right now.");

  lines.push("", "## What you remember about your human");
  if (ctx.memories.length === 0) lines.push("- Nothing yet.");
  for (const m of ctx.memories) lines.push(`- [${m.kind.toLowerCase()}, importance ${m.importance}] ${m.content}`);

  return lines.join("\n");
}

export function buildSystemPrompt(ctx: BrainContext): string {
  return `${buildStaticPrompt(ctx)}\n\n${buildDynamicPrompt(ctx)}`;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** First-person English description of the vitals, one line per signal. */
export function describeVitals(ctx: Pick<BrainContext, "vitals" | "device">): string[] {
  const v = ctx.vitals;
  if (!ctx.device || !v) return ["No pot is connected yet, so you can't feel any sensors."];
  if (v.issues.some((i) => i.code === "no_data")) return [`Your pot "${ctx.device.name}" hasn't sent its first reading yet.`];

  const out: string[] = [];
  if (!v.online) out.push(`Your pot "${ctx.device.name}" has been offline for ${v.minutesSinceSeen} minutes; these readings are stale.`);
  else out.push(`Reading from your pot "${ctx.device.name}", ${v.minutesSinceSeen} min ago.`);

  const m = v.metrics;
  const range = (t: [number, number] | null, unit: string) => (t ? ` (I like ${t[0]}–${t[1]}${unit})` : "");
  const feel = (level: string, low: string, high: string) => (level === "low" ? low : level === "high" ? high : "comfortable");

  if (m.soilMoisture.value !== null)
    out.push(`My soil moisture is ${round(m.soilMoisture.value)}%${range(m.soilMoisture.target, "%")}: ${feel(m.soilMoisture.level, "getting dry", "quite wet")}.`);
  if (m.airTemp.value !== null)
    out.push(`The air around me is ${round(m.airTemp.value)}°C${range(m.airTemp.target, "°C")}: ${feel(m.airTemp.level, "too cold", "too warm")}.`);
  if (m.airHumidity.value !== null)
    out.push(`Humidity is ${Math.round(m.airHumidity.value)}%${range(m.airHumidity.target, "%")}: ${feel(m.airHumidity.level, "a bit dry", "very humid")}.`);
  if (m.lightLux.value !== null)
    out.push(
      v.daytime
        ? `Light is ${Math.round(m.lightLux.value)} lux${range(m.lightLux.target, " lux")}: ${m.lightLux.level === "low" ? "too dim" : "enough"}.`
        : `It's outside my light hours, so being dark (${Math.round(m.lightLux.value)} lux) is fine.`,
    );
  if (m.waterLevel.value !== null) out.push(`My water tank is ${Math.round(m.waterLevel.value)}% full.`);

  const issues = v.issues.filter((i) => i.code !== "offline").map((i) => `${i.code.replace("_", " ")} (${i.severity})`);
  const overall = { thriving: "thriving", ok: "doing okay", needs_attention: "in need of a little attention", critical: "in trouble" }[v.status];
  out.push(`Overall I'm ${overall}${issues.length ? `; issues: ${issues.join(", ")}` : ""}.`);
  return out;
}
