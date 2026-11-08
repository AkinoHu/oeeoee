import { describe, expect, it } from "vitest";
import {
  assessVitals,
  careActions,
  careProfile,
  dailyPumpBudgetSec,
  inWindow,
  lightWindow,
  localHour,
  mergeSnapshots,
  parseClock,
  pumpUsage,
  type PlantLike,
  type TelemetrySnapshot,
} from "./vitals";

const pothos: PlantLike = {
  care: { soilMoisture: [35, 60], lightHours: 8, lux: [800, 5000] },
  tempRange: [15, 30],
  humidity: "medium",
};

// 2026-06-01 14:00 in UTC — afternoon, inside the 9:00–17:00 light window.
const AFTERNOON = new Date("2026-06-01T14:00:00Z");
const MIDNIGHT = new Date("2026-06-01T00:30:00Z");

function reading(over: Partial<TelemetrySnapshot> = {}, at: Date = AFTERNOON): TelemetrySnapshot {
  return {
    recordedAt: new Date(at.getTime() - 5 * 60000),
    soilMoisture: 48,
    airTemp: 22,
    airHumidity: 55,
    lightLux: 2400,
    waterLevel: 70,
    growLightOn: false,
    pumpRanSec: 0,
    ...over,
  };
}

const opts = { timeZone: "UTC" };

describe("helpers", () => {
  it("parses clocks and handles wrap-around windows", () => {
    expect(parseClock("07:30")).toBe(7.5);
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("nope")).toBeNull();
    expect(inWindow(23, 22, 7)).toBe(true);
    expect(inWindow(3, 22, 7)).toBe(true);
    expect(inWindow(12, 22, 7)).toBe(false);
    expect(inWindow(10, 9, 17)).toBe(true);
    expect(inWindow(17, 9, 17)).toBe(false);
  });

  it("centres the light window on early afternoon", () => {
    expect(lightWindow(8)).toEqual({ start: 9, end: 17 });
    expect(lightWindow(12)).toEqual({ start: 7, end: 19 });
    const noQuiet = { start: "00:00", end: "00:00" };
    expect(lightWindow(40, noQuiet)).toEqual({ start: 4, end: 22 }); // clamped to 18h
  });

  it("keeps the light window out of quiet hours", () => {
    // 14 h centred on 13:00 is 06:00–20:00, inside the default 22:30–07:00 quiet hours: shift it.
    expect(lightWindow(14)).toEqual({ start: 7, end: 21 });
    // 16 h can't fit in the 15.5 waking hours: clip to them.
    expect(lightWindow(16)).toEqual({ start: 7, end: 22.5 });
    expect(lightWindow(14, { start: "21:00", end: "09:00" })).toEqual({ start: 9, end: 21 });
    // Night shift: asleep 08:00–16:00, so the light runs 16:00–24:00.
    expect(lightWindow(8, { start: "08:00", end: "16:00" })).toEqual({ start: 16, end: 0 });
  });

  it("computes local hours in a time zone and falls back to UTC", () => {
    expect(localHour(AFTERNOON, "UTC")).toBe(14);
    expect(localHour(AFTERNOON, "Asia/Shanghai")).toBe(22);
    expect(localHour(AFTERNOON, "Not/AZone")).toBe(14);
  });

  it("uses a default profile for unknown plants", () => {
    expect(careProfile(undefined).soilMoisture).toEqual([30, 60]);
    expect(careProfile(pothos).humidity).toEqual([35, 75]);
  });

  it("merges partial readings newest-first per field", () => {
    const t0 = new Date("2026-06-01T10:00:00Z");
    const t1 = new Date("2026-06-01T10:10:00Z");
    const merged = mergeSnapshots([
      { recordedAt: t0, soilMoisture: 40, airTemp: 20, pumpRanSec: 12 },
      { recordedAt: t1, soilMoisture: 45, airTemp: null },
    ]);
    expect(merged).toMatchObject({ recordedAt: t1, soilMoisture: 45, airTemp: 20, pumpRanSec: null });
    expect(mergeSnapshots([])).toBeNull();
  });
});

describe("assessVitals", () => {
  it("is thriving and happy when everything is in range", () => {
    const a = assessVitals(pothos, reading(), AFTERNOON, opts);
    expect(a.status).toBe("thriving");
    expect(a.issues).toEqual([]);
    expect(a.expression).toBe("happy");
    expect(a.online).toBe(true);
    expect(a.metrics.soilMoisture.level).toBe("ok");
  });

  it("reports no data for a pot that has never reported", () => {
    const a = assessVitals(pothos, null, AFTERNOON, opts);
    expect(a.issues.map((i) => i.code)).toEqual(["no_data"]);
    expect(a.status).toBe("ok");
    expect(a.expression).toBe("curious");
  });

  it("grades dryness by deficit and looks thirsty", () => {
    expect(assessVitals(pothos, reading({ soilMoisture: 32 }), AFTERNOON, opts).issues[0]).toMatchObject({
      code: "dry",
      severity: "info",
    });
    const warn = assessVitals(pothos, reading({ soilMoisture: 25 }), AFTERNOON, opts);
    expect(warn.issues[0]).toMatchObject({ code: "dry", severity: "warning" });
    expect(warn.status).toBe("needs_attention");
    expect(warn.expression).toBe("thirsty");
    const crit = assessVitals(pothos, reading({ soilMoisture: 12 }), AFTERNOON, opts);
    expect(crit.status).toBe("critical");
    expect(crit.expression).toBe("thirsty");
  });

  it("escalates dryness when the tank is empty", () => {
    const a = assessVitals(pothos, reading({ soilMoisture: 32, waterLevel: 2 }), AFTERNOON, opts);
    const codes = a.issues.map((i) => `${i.code}:${i.severity}`);
    expect(codes).toContain("tank_empty:critical");
    expect(codes).toContain("dry:warning");
    expect(a.status).toBe("critical");
  });

  it("tolerates a little excess water after watering but flags waterlogging", () => {
    expect(assessVitals(pothos, reading({ soilMoisture: 68 }), AFTERNOON, opts).issues).toEqual([]);
    expect(assessVitals(pothos, reading({ soilMoisture: 75 }), AFTERNOON, opts).issues[0]).toMatchObject({
      code: "waterlogged",
      severity: "warning",
    });
    expect(assessVitals(pothos, reading({ soilMoisture: 95 }), AFTERNOON, opts).status).toBe("critical");
  });

  it("flags cold and hot air", () => {
    expect(assessVitals(pothos, reading({ airTemp: 13 }), AFTERNOON, opts).issues[0]).toMatchObject({ code: "cold", severity: "warning" });
    expect(assessVitals(pothos, reading({ airTemp: 8 }), AFTERNOON, opts).issues[0]).toMatchObject({ code: "cold", severity: "critical" });
    const hot = assessVitals(pothos, reading({ airTemp: 36 }), AFTERNOON, opts);
    expect(hot.issues[0]).toMatchObject({ code: "hot", severity: "critical" });
    expect(hot.expression).toBe("sad");
  });

  it("flags low and empty tanks", () => {
    expect(assessVitals(pothos, reading({ waterLevel: 15 }), AFTERNOON, opts).issues[0]).toMatchObject({ code: "tank_low", severity: "warning" });
    const empty = assessVitals(pothos, reading({ waterLevel: 0 }), AFTERNOON, opts);
    expect(empty.issues[0]).toMatchObject({ code: "tank_empty", severity: "critical" });
    expect(empty.expression).toBe("concerned");
  });

  it("only judges light during the day and when the grow light is off", () => {
    expect(assessVitals(pothos, reading({ lightLux: 200 }), AFTERNOON, opts).issues[0]).toMatchObject({ code: "too_dark", severity: "warning" });
    expect(assessVitals(pothos, reading({ lightLux: 600 }), AFTERNOON, opts).issues[0]).toMatchObject({ code: "too_dark", severity: "info" });
    expect(assessVitals(pothos, reading({ lightLux: 200, growLightOn: true }), AFTERNOON, opts).issues).toEqual([]);
    expect(assessVitals(pothos, reading({ lightLux: 0 }, MIDNIGHT), MIDNIGHT, opts).issues).toEqual([]);
  });

  it("goes offline after an hour of silence", () => {
    const stale = reading({ recordedAt: new Date(AFTERNOON.getTime() - 61 * 60000) });
    const a = assessVitals(pothos, stale, AFTERNOON, opts);
    expect(a.online).toBe(false);
    expect(a.issues[0]).toMatchObject({ code: "offline", severity: "warning", value: 61 });
    expect(a.expression).toBe("concerned");
    const dayOld = reading({ recordedAt: new Date(AFTERNOON.getTime() - 25 * 3600000) });
    expect(assessVitals(pothos, dayOld, AFTERNOON, opts).status).toBe("critical");
  });

  it("sleeps during quiet hours unless something is critical", () => {
    const night = assessVitals(pothos, reading({}, MIDNIGHT), MIDNIGHT, opts);
    expect(night.night).toBe(true);
    expect(night.expression).toBe("sleepy");
    const custom = assessVitals(pothos, reading(), AFTERNOON, { ...opts, quietHours: { start: "13:00", end: "15:00" } });
    expect(custom.expression).toBe("sleepy");
    const crit = assessVitals(pothos, reading({ soilMoisture: 5 }, MIDNIGHT), MIDNIGHT, opts);
    expect(crit.expression).toBe("thirsty");
  });

  it("shows love right after a watering", () => {
    expect(assessVitals(pothos, reading({ pumpRanSec: 8 }), AFTERNOON, opts).expression).toBe("love");
  });

  it("works with an unknown plant", () => {
    expect(assessVitals(undefined, reading(), AFTERNOON, opts).status).toBe("thriving");
  });
});

describe("careActions", () => {
  it("does nothing when soil is fine and the light is enough", () => {
    expect(careActions(pothos, reading(), AFTERNOON, opts)).toEqual({ pumpSeconds: 0, growLightOn: false });
  });

  it("waters proportionally to the deficit and pot size", () => {
    const m = careActions(pothos, reading({ soilMoisture: 30 }), AFTERNOON, { ...opts, potSize: "M" });
    expect(m.pumpSeconds).toBe(Math.round((47.5 - 30) * 0.8)); // 14
    const l = careActions(pothos, reading({ soilMoisture: 30 }), AFTERNOON, { ...opts, potSize: "L" });
    expect(l.pumpSeconds).toBeGreaterThan(m.pumpSeconds);
    const huge = careActions(pothos, reading({ soilMoisture: 0 }), AFTERNOON, { ...opts, potSize: "L" });
    expect(huge.pumpSeconds).toBe(30);
    const tiny = careActions(pothos, reading({ soilMoisture: 34.5 }), AFTERNOON, { ...opts, potSize: "S" });
    expect(tiny.pumpSeconds).toBeGreaterThanOrEqual(2);
  });

  it("never waters from an empty tank or without soil data", () => {
    expect(careActions(pothos, reading({ soilMoisture: 10, waterLevel: 3 }), AFTERNOON, opts).pumpSeconds).toBe(0);
    expect(careActions(pothos, reading({ soilMoisture: null }), AFTERNOON, opts).pumpSeconds).toBe(0);
    expect(careActions(pothos, null, AFTERNOON, opts).pumpSeconds).toBe(0);
  });

  it("never waters without a tank reading", () => {
    // The pump could be running dry.
    expect(careActions(pothos, reading({ soilMoisture: 20, waterLevel: null }), AFTERNOON, opts).pumpSeconds).toBe(0);
  });

  it("never doses more than the water left in the tank", () => {
    const s = { ...opts, potSize: "S", reservoirMl: 600 };
    // 8% of 600 ml with a 5% floor = 18 ml = 3 s at 6 ml/s (it wanted 14 s).
    expect(careActions(pothos, reading({ soilMoisture: 20, waterLevel: 8 }), AFTERNOON, s).pumpSeconds).toBe(3);
    // 6% leaves 6 ml: less than the shortest useful dose.
    expect(careActions(pothos, reading({ soilMoisture: 20, waterLevel: 6 }), AFTERNOON, s).pumpSeconds).toBe(0);
    expect(careActions(pothos, reading({ soilMoisture: 20, waterLevel: 80 }), AFTERNOON, s).pumpSeconds).toBe(14);
  });

  it("stops at the pot's 24 h pump budget", () => {
    const m = { ...opts, potSize: "M", reservoirMl: 1200 };
    const dry = reading({ soilMoisture: 30 }); // wants 14 s
    expect(dailyPumpBudgetSec("M")).toBe(80);
    expect(dailyPumpBudgetSec("S")).toBeLessThan(dailyPumpBudgetSec("L"));
    expect(careActions(pothos, dry, AFTERNOON, { ...m, pumpedLast24hSec: 75 }).pumpSeconds).toBe(5);
    expect(careActions(pothos, dry, AFTERNOON, { ...m, pumpedLast24hSec: 79 }).pumpSeconds).toBe(0);
    expect(careActions(pothos, dry, AFTERNOON, { ...m, pumpedLast24hSec: 500 }).pumpSeconds).toBe(0);
  });

  it("counts a commanded dose until the pot reports it, and soaks from the command", () => {
    const at = (min: number) => new Date(AFTERNOON.getTime() - min * 60000);
    // Told to pump 5 min ago, not reported yet: soak from the command, and it counts.
    expect(pumpUsage({ now: AFTERNOON, reportedAt: at(300), reported24hSec: 20, commandAt: at(5), commandSec: 14 })).toEqual({
      lastWateredAt: at(5),
      last24hSec: 34,
    });
    // Reported back since: already in the reported sum, don't count it twice.
    expect(pumpUsage({ now: AFTERNOON, reportedAt: at(1), reported24hSec: 34, commandAt: at(5), commandSec: 14 })).toEqual({
      lastWateredAt: at(1),
      last24hSec: 34,
    });
    // A command older than 24 h no longer counts.
    expect(pumpUsage({ now: AFTERNOON, reportedAt: null, reported24hSec: 0, commandAt: at(25 * 60), commandSec: 14 }).last24hSec).toBe(0);
    expect(pumpUsage({ now: AFTERNOON, reportedAt: null, reported24hSec: 0, commandAt: null, commandSec: null })).toEqual({
      lastWateredAt: null,
      last24hSec: 0,
    });
  });

  it("keeps the grow light off in quiet hours", () => {
    const sun: PlantLike = { ...pothos, care: { ...pothos.care, lightHours: 14 } };
    const at = (iso: string) => new Date(`2026-06-01T${iso}:00Z`);
    // 06:30 is inside the default quiet hours (until 07:00): stay dark.
    expect(careActions(sun, reading({ lightLux: 0 }, at("06:30")), at("06:30"), opts).growLightOn).toBe(false);
    // The window moved later instead: 20:30 is still lit.
    expect(careActions(sun, reading({ lightLux: 0 }, at("20:30")), at("20:30"), opts).growLightOn).toBe(true);
    const lateRiser = { ...opts, quietHours: { start: "23:00", end: "10:00" } };
    expect(careActions(pothos, reading({ lightLux: 0 }, at("09:30")), at("09:30"), lateRiser).growLightOn).toBe(false);
  });

  it("never waters on a stale reading", () => {
    // Only backfilled / old readings (the pot is offline): the soil may have changed since.
    const hoursAgo = (h: number) => new Date(AFTERNOON.getTime() - h * 3600_000);
    expect(careActions(pothos, { ...reading({ soilMoisture: 20 }), recordedAt: hoursAgo(3) }, AFTERNOON, opts).pumpSeconds).toBe(0);
    expect(careActions(pothos, { ...reading({ soilMoisture: 20 }), recordedAt: hoursAgo(0.5) }, AFTERNOON, opts).pumpSeconds).toBeGreaterThan(0);
  });

  it("waits for the soil to soak after a recent watering", () => {
    const recent = new Date(AFTERNOON.getTime() - 5 * 60000);
    expect(careActions(pothos, reading({ soilMoisture: 20 }), AFTERNOON, { ...opts, lastWateredAt: recent }).pumpSeconds).toBe(0);
    const old = new Date(AFTERNOON.getTime() - 30 * 60000);
    expect(careActions(pothos, reading({ soilMoisture: 20 }), AFTERNOON, { ...opts, lastWateredAt: old }).pumpSeconds).toBeGreaterThan(0);
  });

  it("turns the grow light on when it is dark inside the schedule", () => {
    expect(careActions(pothos, reading({ lightLux: 300 }), AFTERNOON, opts).growLightOn).toBe(true);
    expect(careActions(pothos, reading({ lightLux: null }), AFTERNOON, opts).growLightOn).toBe(true);
  });

  it("keeps the grow light off outside the schedule", () => {
    expect(careActions(pothos, reading({ lightLux: 0 }, MIDNIGHT), MIDNIGHT, opts).growLightOn).toBe(false);
    const evening = new Date("2026-06-01T18:00:00Z");
    expect(careActions(pothos, reading({ lightLux: 0 }, evening), evening, opts).growLightOn).toBe(false);
    // Same instant is 10:00 in New York (inside the window).
    expect(careActions(pothos, reading({ lightLux: 0 }), AFTERNOON, { timeZone: "America/New_York" }).growLightOn).toBe(true);
  });

  it("subtracts its own light and uses hysteresis while on", () => {
    // 2600 lux with the light on ≈ 600 ambient → still too dark, stay on.
    expect(careActions(pothos, reading({ lightLux: 2600, growLightOn: true }), AFTERNOON, opts).growLightOn).toBe(true);
    // 2900 lux with light on ≈ 900 ambient: above min but below 1.2×min → stay on.
    expect(careActions(pothos, reading({ lightLux: 2900, growLightOn: true }), AFTERNOON, opts).growLightOn).toBe(true);
    // 3200 lux with light on ≈ 1200 ambient ≥ 960 → switch off.
    expect(careActions(pothos, reading({ lightLux: 3200, growLightOn: true }), AFTERNOON, opts).growLightOn).toBe(false);
  });

  it("never lights a plant that needs no extra light hours", () => {
    const noLight: PlantLike = { ...pothos, care: { ...pothos.care, lightHours: 0 } };
    expect(careActions(noLight, reading({ lightLux: 0 }), AFTERNOON, opts).growLightOn).toBe(false);
  });
});
