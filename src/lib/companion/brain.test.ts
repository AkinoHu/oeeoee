import { describe, expect, it } from "vitest";
import { assessVitals, type PlantLike } from "@/lib/vitals";
import { simulateTelemetry } from "./demo";
import { detectIntent, detectLanguage, extractMemory, fallbackReply, refusalReply, vitalsLine } from "./fallback";
import { buildSystemPrompt, describeVitals, type BrainContext } from "./prompt";
import { bucketize, seriesStats } from "./series";
import { DEFAULT_REMINDERS } from "./settings";

const pothos: PlantLike = {
  care: { soilMoisture: [35, 60], lightHours: 8, lux: [800, 5000] },
  tempRange: [15, 30],
  humidity: "medium",
};
const NOW = new Date("2026-06-01T14:00:00Z");
const fresh = (over: Record<string, unknown> = {}) => ({
  recordedAt: new Date(NOW.getTime() - 3 * 60000),
  soilMoisture: 48,
  airTemp: 22,
  airHumidity: 55,
  lightLux: 2400,
  waterLevel: 70,
  growLightOn: false,
  pumpRanSec: 0,
  ...over,
});

function ctx(over: Partial<BrainContext> = {}, reading: Record<string, unknown> | null = {}): BrainContext {
  return {
    companion: { name: "Sprout", persona: "", language: "auto", temperature: 0.8 },
    plant: { name: "Golden Pothos", scientificName: "Epipremnum aureum", personality: "Easy-going and chatty." },
    device: { name: "Desk pot" },
    vitals: assessVitals(pothos, reading ? fresh(reading) : null, NOW, { timeZone: "UTC" }),
    memories: [],
    reminders: DEFAULT_REMINDERS,
    now: NOW,
    timeZone: "UTC",
    channel: "web",
    ...over,
  };
}

describe("language & intent detection", () => {
  it("detects the reply language from the text", () => {
    expect(detectLanguage("How are you?")).toBe("en");
    expect(detectLanguage("你今天感觉怎么样？")).toBe("zh");
    expect(detectLanguage("今日の調子はどう？")).toBe("ja");
  });

  it("maps phrases to intents in three languages", () => {
    expect(detectIntent("How are you feeling?")).toBe("feeling");
    expect(detectIntent("Remind me to stretch")).toBe("stretch");
    expect(detectIntent("Do you need water?")).toBe("plant");
    expect(detectIntent("Remember that I love jasmine tea")).toBe("remember");
    expect(detectIntent("I'm so tired today")).toBe("tired");
    expect(detectIntent("Help me focus on work")).toBe("work");
    expect(detectIntent("记住我喜欢茉莉花茶")).toBe("remember");
    expect(detectIntent("提醒我起来伸展一下")).toBe("stretch");
    expect(detectIntent("水はほしい？")).toBe("plant");
    expect(detectIntent("仕事に集中したい")).toBe("work");
    expect(detectIntent("I love you")).not.toBe("remember");
    expect(detectIntent("blue whales are big")).toBe("chat");
  });

  it("extracts memories with a sensible kind", () => {
    expect(extractMemory("Remember that I love jasmine tea")).toEqual({ kind: "PREFERENCE", content: "I love jasmine tea", importance: 3 });
    expect(extractMemory("My name is Mei")).toMatchObject({ kind: "FACT", importance: 5 });
    expect(extractMemory("remember my birthday is May 3")).toMatchObject({ kind: "EVENT", importance: 4 });
    expect(extractMemory("记住我喜欢茉莉花茶")).toMatchObject({ kind: "PREFERENCE", content: "我喜欢茉莉花茶" });
    expect(extractMemory("ジャスミンティーが大好きだって覚えておいて")?.content).toBe("ジャスミンティーが大好きだ");
  });
});

describe("fallback brain", () => {
  it("answers how-are-you from live vitals in first person", () => {
    const out = fallbackReply(ctx({}, { soilMoisture: 25 }), "How are you feeling?");
    expect(out.reply).toContain("Thanks for asking!");
    expect(out.reply).toContain("My soil is getting dry (25%)");
    expect(out.expression).toBe("thirsty");
    expect(out.memory).toBeNull();
  });

  it("is deterministic", () => {
    const c = ctx();
    expect(fallbackReply(c, "hello there")).toEqual(fallbackReply(c, "hello there"));
  });

  it("replies in the user's language, or the configured one", () => {
    expect(fallbackReply(ctx(), "你今天感觉怎么样？").reply).toContain("谢谢你关心我");
    expect(fallbackReply(ctx(), "今日の調子はどう？").reply).toContain("ありがとう");
    const ja = ctx({ companion: { name: "Sprout", persona: "", language: "ja", temperature: 0.5 } });
    expect(fallbackReply(ja, "How are you?").reply).toContain("ありがとう");
  });

  it("confirms reminders using the configured interval", () => {
    expect(fallbackReply(ctx(), "Remind me to stretch").reply).toContain("every 50 minutes");
    const off = ctx({ reminders: { ...DEFAULT_REMINDERS, sedentaryMinutes: 0 } });
    expect(fallbackReply(off, "Remind me to stretch").reply).toContain("Turn on stretch reminders");
    expect(fallbackReply(ctx(), "I should drink more").reply).toContain("every 90 minutes");
  });

  it("appends urgent vitals to unrelated intents", () => {
    const out = fallbackReply(ctx({}, { waterLevel: 0 }), "Help me focus on work");
    expect(out.expression).toBe("focused");
    expect(out.reply).toContain("water tank is empty");
    expect(fallbackReply(ctx(), "Help me focus on work").reply).not.toContain("tank");
  });

  it("captures memories and recalls the top one", () => {
    const saved = fallbackReply(ctx(), "Remember that I love jasmine tea");
    expect(saved.memory).toMatchObject({ kind: "PREFERENCE", content: "I love jasmine tea" });
    const recall = fallbackReply(
      ctx({ memories: [{ kind: "PREFERENCE", content: "Loves jasmine tea.", importance: 4 }] }),
      "blue whales are big",
    );
    expect(recall.reply).toContain("I remember: Loves jasmine tea.");
    expect(recall.reply).toContain("I'm feeling great");
  });

  it("handles missing pots, missing data and offline pots", () => {
    expect(fallbackReply(ctx({ device: null, vitals: null }), "how are you").reply).toContain("don't have a pot");
    expect(fallbackReply(ctx({}, null), "how are you").reply).toContain("first sensor reading");
    const offline = ctx({}, { recordedAt: new Date(NOW.getTime() - 3 * 3600000) });
    expect(fallbackReply(offline, "how are you").reply).toContain("offline for 3 hours");
  });

  it("sleeps at night and has a canned refusal", () => {
    const night = new Date("2026-06-01T23:30:00Z");
    const c = ctx({
      now: night,
      vitals: assessVitals(pothos, fresh({ recordedAt: night }), night, { timeZone: "UTC" }),
    });
    expect(fallbackReply(c, "I'm so tired").reply).toContain("It's late");
    expect(refusalReply(ctx(), "你好").reply).toContain("聊点别的");
  });

  it("describes the worst issue first", () => {
    const v = assessVitals(pothos, fresh({ soilMoisture: 20, waterLevel: 0 }), NOW, { timeZone: "UTC" });
    expect(vitalsLine(v, true, "en")).toContain("water tank is empty");
    expect(vitalsLine(v, true, "en")).toContain("20%");
  });
});

describe("system prompt", () => {
  it("includes identity, plant personality, vitals, memories and reminders", () => {
    const p = buildSystemPrompt(
      ctx(
        {
          companion: { name: "Mochi", persona: "Calls me captain.", language: "zh", temperature: 0.2 },
          memories: [{ kind: "PREFERENCE", content: "Prefers jasmine tea", importance: 4 }],
        },
        { soilMoisture: 30 },
      ),
    );
    expect(p).toContain("You are Mochi");
    expect(p).toContain("Golden Pothos");
    expect(p).toContain("Easy-going and chatty.");
    expect(p).toContain("Calls me captain.");
    expect(p).toContain("Always reply in Simplified Chinese");
    expect(p).toContain("steady and consistent");
    expect(p).toContain("My soil moisture is 30% (I like 35–60%): getting dry.");
    expect(p).toContain("[preference, importance 4] Prefers jasmine tea");
    expect(p).toContain("stretch every 50 minutes");
    expect(p).toContain("Monday, Jun 1, 14:00 (UTC)");
    expect(p).toContain("sleepy");
  });

  it("explains missing pots honestly", () => {
    expect(describeVitals({ device: null, vitals: null })[0]).toContain("No pot is connected");
  });
});

describe("demo simulation", () => {
  const readings = simulateTelemetry({
    plant: pothos,
    potSize: "M",
    reservoirMl: 1200,
    end: NOW,
    timeZone: "UTC",
    seed: 42,
  });

  it("produces 48 h of 10-minute readings ending now", () => {
    expect(readings).toHaveLength(289);
    expect(readings.at(-1)!.recordedAt.getTime()).toBe(NOW.getTime());
    expect(readings[0].recordedAt.getTime()).toBe(NOW.getTime() - 48 * 3600000);
  });

  it("follows a day/night light curve and waters when dry", () => {
    const noon = readings.filter((r) => r.recordedAt.getUTCHours() === 12);
    const night = readings.filter((r) => r.recordedAt.getUTCHours() === 2);
    const avg = (rs: typeof readings) => rs.reduce((s, r) => s + r.lightLux, 0) / rs.length;
    expect(avg(noon)).toBeGreaterThan(avg(night) + 1000);
    expect(readings.some((r) => r.pumpRanSec > 0)).toBe(true);
    expect(readings.every((r) => r.soilMoisture > 20 && r.soilMoisture < 75)).toBe(true);
  });

  it("drains the tank to a low level", () => {
    expect(readings[0].waterLevel).toBeGreaterThan(readings.at(-1)!.waterLevel);
    expect(readings.at(-1)!.waterLevel).toBeGreaterThan(10);
    expect(readings.at(-1)!.waterLevel).toBeLessThan(20);
  });

  it("is reproducible for a seed", () => {
    const again = simulateTelemetry({ plant: pothos, potSize: "M", reservoirMl: 1200, end: NOW, timeZone: "UTC", seed: 42 });
    expect(again).toEqual(readings);
  });
});

describe("series bucketing", () => {
  it("averages per bucket and leaves gaps as null", () => {
    const start = new Date(0);
    const end = new Date(4000);
    const rows = [
      { recordedAt: new Date(100), v: 1 },
      { recordedAt: new Date(900), v: 3 },
      { recordedAt: new Date(2500), v: 10 },
      { recordedAt: new Date(5000), v: 99 },
    ];
    expect(bucketize(rows, start, end, 4, (r) => r.v)).toEqual([2, null, 10, null]);
    expect(bucketize(rows, start, end, 4, (r) => r.v, "max")).toEqual([3, null, 10, null]);
    expect(seriesStats([null, 2, 5, null, 3])).toEqual({ min: 2, max: 5, latest: 3 });
    expect(seriesStats([null])).toBeNull();
  });
});
