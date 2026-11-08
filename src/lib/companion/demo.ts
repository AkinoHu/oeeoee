/**
 * Simulated pot telemetry for the "Create a demo pot" button, so the console is
 * explorable without hardware. The simulation runs the real auto-care
 * controller (`careActions`) step by step, so watering events and grow-light
 * switching in the demo are exactly what a real pot would do. Pure and seeded.
 */
import {
  careActions,
  careProfile,
  GROW_LIGHT_LUX,
  localHour,
  PUMP_SEC_PER_PCT,
  type PlantLike,
  type TelemetrySnapshot,
} from "@/lib/vitals";

export interface SimulationOptions {
  plant: PlantLike | null | undefined;
  potSize?: string | null;
  /** Reservoir capacity in ml (from the pot model). */
  reservoirMl?: number;
  /** Timestamp of the newest reading. */
  end: Date;
  hours?: number;
  intervalMinutes?: number;
  timeZone?: string | null;
  seed?: number;
  /** Desired water-tank level at the end of the run, %. */
  endTankLevel?: number;
}

export interface SimulatedReading {
  recordedAt: Date;
  soilMoisture: number;
  airTemp: number;
  airHumidity: number;
  lightLux: number;
  waterLevel: number;
  growLightOn: boolean;
  pumpRanSec: number;
}

/** Small, fast, seedable PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PUMP_ML_PER_SEC = 6;
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function run(opts: SimulationOptions, startTank: number): { readings: SimulatedReading[]; used: number } {
  const hours = opts.hours ?? 48;
  const interval = opts.intervalMinutes ?? 10;
  const steps = Math.floor((hours * 60) / interval);
  const reservoir = opts.reservoirMl ?? 1200;
  const perPct = PUMP_SEC_PER_PCT[opts.potSize ?? "M"] ?? PUMP_SEC_PER_PCT.M;
  const profile = careProfile(opts.plant);
  const rand = mulberry32(opts.seed ?? 7);
  const noise = (amp: number) => (rand() * 2 - 1) * amp;

  const [soilMin, soilMax] = profile.soilMoisture;
  let soil = soilMin + (soilMax - soilMin) * 0.45;
  let tank = startTank;
  let used = 0;
  let growLightOn = false;
  let lastWateredAt: Date | null = null;
  let cloud = 0.8;
  const dayPeak = new Map<number, number>();
  const readings: SimulatedReading[] = [];
  let prev: TelemetrySnapshot | null = null;

  for (let i = steps; i >= 0; i--) {
    const at = new Date(opts.end.getTime() - i * interval * 60000);
    const h = localHour(at, opts.timeZone);
    const day = Math.floor(at.getTime() / 86400000);
    if (!dayPeak.has(day)) dayPeak.set(day, 1800 + rand() * 2600);

    // Weather: slowly drifting cloud cover; sun between ~6:30 and ~18:30.
    cloud = clamp(cloud + noise(0.08), 0.45, 1);
    const sun = h > 6.5 && h < 18.5 ? Math.sin((Math.PI * (h - 6.5)) / 12) : 0;
    const evening = h >= 18.5 && h < 23 ? 140 : 0; // room lights
    const ambient = Math.max(0, dayPeak.get(day)! * Math.pow(sun, 1.4) * cloud + evening + noise(15));

    const airTemp = 21 + 3.6 * Math.sin((2 * Math.PI * (h - 9)) / 24) + 1.2 * sun * cloud + noise(0.25);
    const airHumidity = clamp(58 - (airTemp - 21) * 2.3 + noise(1.5), 25, 90);

    // Auto-care decides from the previous reading, like the real pot.
    const actions = careActions(opts.plant, prev, at, {
      timeZone: opts.timeZone,
      potSize: opts.potSize,
      lastWateredAt,
    });
    growLightOn = actions.growLightOn;
    let pumpRanSec = 0;
    if (actions.pumpSeconds > 0) {
      pumpRanSec = actions.pumpSeconds;
      soil += (actions.pumpSeconds / perPct) * (0.92 + rand() * 0.12);
      const pct = ((actions.pumpSeconds * PUMP_ML_PER_SEC) / reservoir) * 100;
      tank -= pct;
      used += pct;
      lastWateredAt = at;
    }

    // Evaporation + transpiration: faster when warm and bright.
    const perHour = 0.34 + 0.05 * (airTemp - 20) + ambient / 18000;
    soil = clamp(soil - (perHour * interval) / 60 + noise(0.05), 0, 100);

    const reading: SimulatedReading = {
      recordedAt: at,
      soilMoisture: round1(clamp(soil + noise(0.3), 0, 100)),
      airTemp: round1(airTemp),
      airHumidity: round1(airHumidity),
      lightLux: Math.round(ambient + (growLightOn ? GROW_LIGHT_LUX : 0)),
      waterLevel: round1(clamp(tank, 0, 100)),
      growLightOn,
      pumpRanSec,
    };
    readings.push(reading);
    prev = reading;
  }
  return { readings, used };
}

/** ~48 h of readings ending at `end`, with the tank drained to about `endTankLevel`. */
export function simulateTelemetry(opts: SimulationOptions): SimulatedReading[] {
  // First pass measures how much water the run uses, so the tank can start at
  // a level that ends near the target (low enough to trigger a refill alert).
  const probe = run(opts, 100);
  const startTank = clamp((opts.endTankLevel ?? 17) + probe.used, 20, 98);
  return run(opts, startTank).readings;
}
