/**
 * Catalog contract shared by every feature. Changing a type here affects all
 * agents — coordinate first (docs/TASKS.md).
 */
import type { Locale } from "@/i18n/config";

export type LocalizedText = Record<Locale, string>;

/** Stripe-style lower-case ISO 4217 codes we price in. */
export type CurrencyCode = "cny" | "usd" | "jpy" | "eur" | "gbp" | "krw" | "sgd" | "aud" | "cad";

// ── Geography ────────────────────────────────────────────────

export type RegionId =
  | "east-asia"
  | "southeast-asia"
  | "south-asia"
  | "oceania"
  | "north-america"
  | "latin-america"
  | "europe"
  | "middle-east"
  | "africa";

export interface Region {
  id: RegionId;
  name: LocalizedText;
  /** [longitude, latitude] the map flies to when the region is selected. */
  center: [number, number];
  /** Map zoom factor relative to the full world view (1 = whole world). */
  zoom: number;
}

/**
 * full        – we sell pot + live plants and ship them (China mainland first)
 * pot_only    – we sell the pot; plants are shown as "grows well here" suggestions
 *               until a local partner nursery is live
 * coming_soon – not open yet; show waitlist
 */
export type SalesMode = "full" | "pot_only" | "coming_soon";

export type ClimateZone =
  | "tropical"
  | "subtropical"
  | "temperate"
  | "oceanic"
  | "mediterranean"
  | "continental"
  | "arid"
  | "polar";

export interface Country {
  /** ISO 3166-1 alpha-2, upper-case: "CN". Used in URLs as lower-case: /c/cn */
  code: string;
  /** ISO 3166-1 numeric as a 3-digit string: "156". Matches world-atlas feature ids. */
  isoNumeric: string;
  name: LocalizedText;
  region: RegionId;
  salesMode: SalesMode;
  currency: CurrencyCode;
  /** Dominant climate zones, most common first. */
  climates: ClimateZone[];
  hemisphere: "north" | "south";
  /** [longitude, latitude] label / zoom anchor. */
  center: [number, number];
  /**
   * Plants we sell in this country with their price in minor units of `currency`.
   * Only populated when salesMode === "full".
   */
  plantOffers: Record<string, number>;
  /** Plants that are commonly available from local nurseries and thrive here (display only). */
  localPlantIds: string[];
  /** Local plant partner programme status. */
  partnerStatus: "live" | "recruiting" | "planned";
  shipping: {
    /** Flat shipping fee in minor units. */
    flatFee: number;
    /** Free shipping when the subtotal reaches this amount (minor units). */
    freeOver?: number;
    etaDays: [number, number];
  };
}

// ── Plants ───────────────────────────────────────────────────

export type LightLevel = "low" | "medium" | "bright";
export type Level3 = "low" | "medium" | "high";
export type PotSize = "S" | "M" | "L";
export type Placement = "desk" | "bedside" | "living_room";

/**
 * The fixed plant roster. Plant art (src/components/plant-art) has one
 * illustration per id. Adding a plant = add the id here + data + art.
 */
export const PLANT_IDS = [
  "pothos",
  "snake-plant",
  "zz-plant",
  "peace-lily",
  "monstera",
  "fiddle-leaf-fig",
  "lucky-bamboo",
  "money-tree",
  "jade-plant",
  "aloe",
  "echeveria",
  "spider-plant",
  "calathea",
  "phalaenopsis",
  "basil",
  "mint",
  "aglaonema",
  "cactus",
] as const;
export type PlantId = (typeof PLANT_IDS)[number];

export interface Plant {
  id: PlantId;
  name: LocalizedText;
  scientificName: string;
  /** One-line description for cards. */
  blurb: LocalizedText;
  /** The "personality" the AI companion adopts when living in this plant. */
  personality: LocalizedText;
  light: LightLevel;
  water: Level3;
  humidity: Level3;
  /** Comfortable air temperature range, °C. */
  tempRange: [number, number];
  /** Pot sizes this plant fits. */
  sizes: PotSize[];
  placements: Placement[];
  difficulty: 1 | 2 | 3;
  petSafe: boolean;
  airPurifying: boolean;
  /** CAM plant: opens its stomata and takes in CO₂ at night — a nice bedside companion. */
  nightOxygen: boolean;
  growth: "slow" | "medium" | "fast";
  /** Climates where the plant is common / easy to source and grow. */
  climates: ClimateZone[];
  /** Targets the pot's auto-care system uses. */
  care: {
    soilMoisture: [number, number]; // % VWC
    lightHours: number; // grow-light hours per day
    lux: [number, number];
  };
  /** Accent colour used by illustrations / UI chips. */
  color: string;
}

// ── Products ────────────────────────────────────────────────

export interface PotModel {
  size: PotSize;
  sku: string; // "POT-S"
  name: LocalizedText;
  tagline: LocalizedText;
  dims: { diameterCm: number; heightCm: number };
  reservoirMl: number;
  screenInch: number;
  /** Price in minor units, per currency. */
  prices: Record<CurrencyCode, number>;
}

export type PotFinishId = "porcelain" | "sage" | "graphite";

export interface PotFinish {
  id: PotFinishId;
  name: LocalizedText;
  /** Main body colour. */
  color: string;
  /** Rim / shadow colour. */
  shade: string;
}
