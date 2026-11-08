/**
 * Plant recommendation engine. CONTRACT ONLY — implemented by the catalog agent.
 * The store UI calls recommendPlants() and renders reasons via the "recommend"
 * i18n namespace: t(`reason.${code}`).
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

/** Ranked plant suggestions for a country + spot. Never returns an empty list for a known country. */
export function recommendPlants(input: RecommendInput): Recommendation[] {
  const country = typeof input.country === "string" ? getCountry(input.country) : input.country;
  if (!country) return [];
  const pool = plantsForCountry(country);
  const plants = pool.length > 0 ? pool : listPlants();
  // Placeholder ranking — replaced by the catalog agent.
  return plants.map((plant) => {
    const price = plantPrice(country, plant.id);
    return { plant, score: 50, reasons: price !== null ? ["sold_here"] : ["local_favorite"], sellable: price !== null, price };
  });
}
