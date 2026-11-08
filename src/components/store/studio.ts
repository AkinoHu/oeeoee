/**
 * Pot-studio state helpers shared by the server page (defaults from the URL)
 * and the client studio. Pure.
 */
import { getFinish, getPlant, listFinishes, plantPrice, plantsForCountry, listPlants, type Country, type Placement, type Plant, type PotFinishId, type PotSize } from "@/data";
import { recommendPlants } from "@/lib/recommend";

export const POT_SIZES: PotSize[] = ["S", "M", "L"];
export const DEFAULT_FINISH: PotFinishId = "porcelain";

export interface StudioState {
  size: PotSize;
  finish: PotFinishId;
  plantId: string;
}

/** Plants to offer in a market's studio, best recommendation first. */
export function studioPlants(country: Country): Plant[] {
  const ranked = recommendPlants({ country }).map((r) => r.plant);
  if (ranked.length) return ranked;
  const local = plantsForCountry(country);
  return local.length ? local : listPlants();
}

export function isPotSize(v: unknown): v is PotSize {
  return v === "S" || v === "M" || v === "L";
}

/** The size closest to `wanted` that the plant fits (ties go to the bigger pot). */
export function nearestFittingSize(plant: Plant, wanted: PotSize): PotSize {
  if (plant.sizes.includes(wanted)) return wanted;
  const w = POT_SIZES.indexOf(wanted);
  const fits = POT_SIZES.filter((s) => plant.sizes.includes(s));
  if (!fits.length) return wanted;
  return fits.reduce((best, s) => {
    const d = Math.abs(POT_SIZES.indexOf(s) - w);
    const bd = Math.abs(POT_SIZES.indexOf(best) - w);
    return d < bd || (d === bd && POT_SIZES.indexOf(s) > POT_SIZES.indexOf(best)) ? s : best;
  });
}

/** Pot size the quiz suggests for a spot: desk → S, bedside → S/M, living room → L. */
export function suggestedSize(plant: Plant, placement: Placement): PotSize {
  const prefs: PotSize[] = placement === "living_room" ? ["L", "M", "S"] : ["S", "M", "L"];
  return prefs.find((s) => plant.sizes.includes(s)) ?? plant.sizes[0] ?? "M";
}

/**
 * Resolve the studio from (untrusted) query params, falling back to the top recommendation.
 * Any catalog plant is accepted: the quiz can suggest one from outside the market's list
 * (e.g. pet-safe top-ups), and shared links / Stripe's cancel_url must bring it back.
 */
export function resolveStudio(
  country: Country,
  query: { size?: string | null; finish?: string | null; plant?: string | null },
): StudioState {
  const plants = studioPlants(country);
  const fromQuery = query.plant ? (plants.find((p) => p.id === query.plant) ?? getPlant(query.plant)) : undefined;
  const plant = fromQuery ?? plants[0] ?? getPlant("pothos") ?? listPlants()[0];
  const size = isPotSize(query.size) ? query.size : nearestFittingSize(plant, "M");
  const finish = (query.finish && getFinish(query.finish)?.id) || listFinishes()[0]?.id || DEFAULT_FINISH;
  return { size, finish, plantId: plant.id };
}

export function isSellable(country: Country, plantId: string): boolean {
  return plantPrice(country, plantId) !== null;
}

/** First clause of a personality line, for compact cards ("Calm and stoic"). */
export function shortPersonality(text: string): string {
  const first = text.split(/[;；。，,.]/)[0]?.trim() ?? "";
  return first.length >= 4 ? first : text;
}
