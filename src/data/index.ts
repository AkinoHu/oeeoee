/**
 * Catalog accessors. Import from "@/data" rather than the raw arrays so the
 * storage can later move to a CMS/DB without touching callers.
 */
import type { Locale } from "@/i18n/config";
import { COUNTRIES } from "./countries";
import { PLANTS } from "./plants";
import { POT_FINISHES, POT_MODELS } from "./products";
import { REGIONS } from "./regions";
import { PLANT_IDS } from "./types";
import type {
  Country,
  LocalizedText,
  Plant,
  PlantId,
  PotFinish,
  PotFinishId,
  PotModel,
  PotSize,
  Region,
  RegionId,
  SalesMode,
} from "./types";

export * from "./types";

export function lt(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en;
}

// Regions
export function listRegions(): Region[] {
  return REGIONS;
}
export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

// Countries
export function listCountries(): Country[] {
  return COUNTRIES;
}
export function getCountry(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper);
}
export function getCountryByNumeric(isoNumeric: string | number): Country | undefined {
  const id = String(isoNumeric).padStart(3, "0");
  return COUNTRIES.find((c) => c.isoNumeric === id);
}
export function countriesInRegion(region: RegionId): Country[] {
  return COUNTRIES.filter((c) => c.region === region);
}
export function countriesBySalesMode(mode: SalesMode): Country[] {
  return COUNTRIES.filter((c) => c.salesMode === mode);
}
/**
 * Shipping fee (minor units, country currency) for a cart subtotal: the flat
 * fee, waived once `freeOver` is reached.
 */
export function shippingFee(country: Country, subtotal: number): number {
  const { flatFee, freeOver } = country.shipping;
  if (freeOver !== undefined && subtotal >= freeOver) return 0;
  return flatFee;
}

// Plants
export function isPlantId(id: unknown): id is PlantId {
  return typeof id === "string" && (PLANT_IDS as readonly string[]).includes(id);
}
export function listPlants(): Plant[] {
  return PLANTS;
}
export function getPlant(id: string | null | undefined): Plant | undefined {
  if (!id) return undefined;
  return PLANTS.find((p) => p.id === id);
}
/** Plants relevant to a country: those we sell there plus local suggestions. */
export function plantsForCountry(country: Country): Plant[] {
  const ids = new Set([...Object.keys(country.plantOffers), ...country.localPlantIds]);
  return PLANTS.filter((p) => ids.has(p.id));
}
/** Price of a live plant in a country, or null if we don't sell it there. */
export function plantPrice(country: Country, plantId: string): number | null {
  if (country.salesMode !== "full") return null;
  return country.plantOffers[plantId] ?? null;
}

// Pots
export function listPotModels(): PotModel[] {
  return POT_MODELS;
}
export function getPotModel(size: PotSize | string): PotModel | undefined {
  return POT_MODELS.find((p) => p.size === size);
}
export function getPotBySku(sku: string): PotModel | undefined {
  return POT_MODELS.find((p) => p.sku === sku);
}
/** Price of a pot in a country's currency (minor units), or null for an unknown size. */
export function potPrice(country: Country, size: PotSize | string): number | null {
  return getPotModel(size)?.prices[country.currency] ?? null;
}
export function listFinishes(): PotFinish[] {
  return POT_FINISHES;
}
export function getFinish(id: PotFinishId | string): PotFinish | undefined {
  return POT_FINISHES.find((f) => f.id === id);
}
