/**
 * Plant recommendation engine. Owner: catalog agent.
 * The store UI calls recommendPlants() and renders reasons via the "recommend"
 * i18n namespace: t(`reason.${code}`).
 *
 * Scoring (0–100, additive, clamped; max ≈ 100):
 *   base                                         36
 *   pot size     ideal +10 · fits +8 · too big/small −30 · not chosen +5
 *                (ideal = the size the plant looks best in, see naturalSize)
 *   placement    ideal +10 · fits +7 · wrong spot −12   · not chosen +5
 *   light        spot ≥ need +8 (low-light plant in a bright spot +4)
 *                one level short −6 · bright plant in a dim spot −18
 *                (soft: the pot's grow light compensates)
 *                unknown spot: low/medium/bright plant +5/+5/+2, bedside +6/+4/0
 *                (bedside tables usually sit away from the window)
 *   experience   beginner +8/−4/−16 · some +5/+3/−4 · expert +2/+4/+6 ·
 *                unknown +5/+2/−3   (for difficulty 1/2/3)
 *   climate      matches the country's 1st / 2nd / other climate +8/+6/+4 · none −4
 *   market       sold here as a live plant +6 · local nursery favorite +4,
 *                plus +2 / +1 for the market's top-3 / top-6 favorites
 *                (localPlantIds is ordered most popular first)
 *   bedside      night-breathing (CAM) plant +6
 *   air          air-purifying plant +2
 * `petSafeOnly` is the only hard filter.
 *
 * Candidates are the country's plants (live offers ∪ local favorites), topped
 * up from the global catalog when fewer than 3 survive the filter. Sorted by
 * score desc, then sellable first, then English name. Reasons: up to 3 codes,
 * the user's explicit asks first (pet safe, bedside, dim spot), then
 * availability, ease, fit and climate.
 */
import { getCountry, listPlants, plantPrice, plantsForCountry } from "@/data";
import type { Country, LightLevel, Placement, Plant, PotSize } from "@/data/types";

export const REASON_CODES = [
  "sold_here",
  "local_favorite",
  "suits_climate",
  "fits_size",
  "fits_placement",
  "low_light_ok",
  "night_oxygen",
  "pet_safe",
  "easy_care",
  "air_purifying",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface RecommendInput {
  country: Country | string;
  size?: PotSize;
  placement?: Placement;
  /** Light available at the spot (the pot's grow light compensates, but less is better). */
  light?: LightLevel;
  petSafeOnly?: boolean;
  experience?: "beginner" | "some" | "expert";
}

export interface Recommendation {
  plant: Plant;
  /** 0–100, higher is better. */
  score: number;
  /** Most important first. */
  reasons: ReasonCode[];
  /** Can be bought as a live plant in this country right now. */
  sellable: boolean;
  /** Minor units in the country's currency when sellable, else null. */
  price: number | null;
}

/** Minimum list length; topped up from the global catalog when the local pool is smaller. */
const MIN_RESULTS = 3;
const MAX_REASONS = 3;

const BASE_SCORE = 36;
const LIGHT_RANK: Record<LightLevel, number> = { low: 0, medium: 1, bright: 2 };
type Experience = NonNullable<RecommendInput["experience"]>;
const EXPERIENCE_POINTS: Record<Experience | "unknown", [number, number, number]> = {
  beginner: [8, -4, -16],
  some: [5, 3, -4],
  expert: [2, 4, 6],
  unknown: [5, 2, -3],
};
const CLIMATE_POINTS = [8, 6, 4] as const;
/** Light points when the spot's light is unknown, indexed by the plant's need (low/medium/bright). */
const UNKNOWN_LIGHT = [5, 5, 2] as const;
const UNKNOWN_LIGHT_BEDSIDE = [6, 4, 0] as const;

type Fit = "ideal" | "ok" | "no";

/** The pot size a plant looks best in: big plants → L, small plants → S, all-rounders → M. */
function naturalSize(plant: Plant): PotSize {
  const hasS = plant.sizes.includes("S");
  const hasL = plant.sizes.includes("L");
  if (plant.sizes.length === 1) return plant.sizes[0];
  if (hasL && !hasS) return "L";
  if (hasS && !hasL) return "S";
  return "M";
}

function sizeFit(plant: Plant, size: PotSize): Fit {
  if (!plant.sizes.includes(size)) return "no";
  return naturalSize(plant) === size ? "ideal" : "ok";
}

function placementFit(plant: Plant, placement: Placement): Fit {
  if (!plant.placements.includes(placement)) return "no";
  return plant.placements.length === 1 ? "ideal" : "ok";
}

/** Index of the first country climate the plant handles (0 = dominant), or -1. */
function climateMatch(plant: Plant, country: Country): number {
  return country.climates.findIndex((c) => plant.climates.includes(c));
}

function scorePlant(plant: Plant, country: Country, input: RecommendInput): Recommendation {
  const price = plantPrice(country, plant.id);
  const sellable = price !== null;
  const localRank = country.localPlantIds.indexOf(plant.id);
  /** reason → importance (higher = shown first) */
  const why = new Map<ReasonCode, number>();
  let score = BASE_SCORE;

  // Pot size
  if (input.size) {
    const fit = sizeFit(plant, input.size);
    score += fit === "ideal" ? 10 : fit === "ok" ? 8 : -30;
    if (fit !== "no") why.set("fits_size", fit === "ideal" ? 48 : 40);
  } else {
    score += 5;
  }

  // Placement
  if (input.placement) {
    const fit = placementFit(plant, input.placement);
    score += fit === "ideal" ? 10 : fit === "ok" ? 7 : -12;
    if (fit !== "no") why.set("fits_placement", fit === "ideal" ? 50 : 44);
  } else {
    score += 5;
  }

  // Light at the spot vs what the plant needs
  const need = LIGHT_RANK[plant.light];
  if (input.light) {
    const deficit = need - LIGHT_RANK[input.light];
    if (deficit <= -2) score += 4;
    else if (deficit <= 0) score += 8;
    else if (deficit === 1) score -= 6;
    else score -= 18;
    if (plant.light === "low" && input.light === "low") why.set("low_light_ok", 88);
  } else {
    score += (input.placement === "bedside" ? UNKNOWN_LIGHT_BEDSIDE : UNKNOWN_LIGHT)[need];
    if (plant.light === "low") why.set("low_light_ok", 32);
  }

  // Experience vs difficulty
  score += EXPERIENCE_POINTS[input.experience ?? "unknown"][plant.difficulty - 1];
  if (plant.difficulty === 1 && input.experience !== "expert") {
    why.set("easy_care", input.experience === "beginner" ? 80 : input.experience === "some" ? 34 : 42);
  }

  // Climate overlap with the country
  const climate = climateMatch(plant, country);
  if (climate >= 0) {
    score += CLIMATE_POINTS[Math.min(climate, CLIMATE_POINTS.length - 1)];
    why.set("suits_climate", climate === 0 ? 52 : climate === 1 ? 46 : 30);
  } else {
    score -= 4;
  }

  // Availability
  if (sellable) {
    score += 6;
    why.set("sold_here", 85);
  }
  if (localRank >= 0) {
    score += 4 + (localRank < 3 ? 2 : localRank < 6 ? 1 : 0);
    if (!sellable) why.set("local_favorite", 60);
  }

  // Bedside companions that breathe at night
  if (input.placement === "bedside" && plant.nightOxygen) {
    score += 6;
    why.set("night_oxygen", 90);
  }

  if (plant.airPurifying) {
    score += 2;
    why.set("air_purifying", 25);
  }

  if (plant.petSafe) why.set("pet_safe", input.petSafeOnly ? 95 : 22);

  const reasons = [...why.entries()]
    .sort((a, b) => b[1] - a[1] || REASON_CODES.indexOf(a[0]) - REASON_CODES.indexOf(b[0]))
    .slice(0, MAX_REASONS)
    .map(([code]) => code);

  return {
    plant,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    sellable,
    price,
  };
}

/** Score desc, then sellable first, then English name — fully deterministic. */
function compare(a: Recommendation, b: Recommendation): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.sellable !== b.sellable) return a.sellable ? -1 : 1;
  const an = a.plant.name.en;
  const bn = b.plant.name.en;
  return an < bn ? -1 : an > bn ? 1 : 0;
}

/** Ranked plant suggestions for a country + spot. Never returns an empty list for a known country. */
export function recommendPlants(input: RecommendInput): Recommendation[] {
  const country = typeof input.country === "string" ? getCountry(input.country) : input.country;
  if (!country) return [];

  const allowed = (plant: Plant) => !input.petSafeOnly || plant.petSafe;
  const countryPlants = plantsForCountry(country);
  const pool = (countryPlants.length > 0 ? countryPlants : listPlants()).filter(allowed);
  const ranked = pool.map((plant) => scorePlant(plant, country, input)).sort(compare);

  if (ranked.length < MIN_RESULTS) {
    // Not enough local options (e.g. pet-safe only in a desert market):
    // top up with the best plants from the global catalog.
    const inPool = new Set(pool.map((p) => p.id));
    const extra = listPlants()
      .filter((plant) => allowed(plant) && !inPool.has(plant.id))
      .map((plant) => scorePlant(plant, country, input))
      .sort(compare)
      .slice(0, MIN_RESULTS - ranked.length);
    ranked.push(...extra);
    ranked.sort(compare);
  }

  return ranked;
}
