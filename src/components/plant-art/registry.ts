import type { ComponentType } from "react";
import type { PlantId } from "@/data/types";
import type { MotionSpec } from "./kit";
import { Aglaonema, Calathea, FiddleLeafFig, GenericPlant, Monstera, PeaceLily, Pothos, ZZPlant } from "./plants/foliage";
import { Basil, Mint, Phalaenopsis } from "./plants/herbs";
import { Aloe, Cactus, Echeveria, JadePlant } from "./plants/succulents";
import { LuckyBamboo, MoneyTree, SnakePlant, SpiderPlant } from "./plants/upright";

/**
 * Anchor contract: every illustration shares this viewBox, with the stem base
 * (soil level) at PLANT_ANCHOR. Scale/translate around the anchor to plant any
 * species in any pot.
 */
export const PLANT_VIEWBOX = { width: 200, height: 240 } as const;
export const PLANT_ANCHOR = { x: 100, y: 228 } as const;

/** Rough extents in viewBox units, measured from the anchor. */
export interface PlantMeta {
  /** How far the foliage reaches above the anchor. */
  height: number;
  /** Half of the foliage width. */
  halfWidth: number;
  /** Height above the anchor of the visual centre of the canopy. */
  canopy: number;
}

interface Entry {
  Art: ComponentType;
  meta: PlantMeta;
  /** Whole-plant idle sway. */
  sway: MotionSpec;
}

const E = (Art: ComponentType, height: number, halfWidth: number, canopy: number, sway: MotionSpec): Entry => ({
  Art,
  meta: { height, halfWidth, canopy },
  sway,
});

const REGISTRY: Record<PlantId, Entry> = {
  pothos: E(Pothos, 150, 95, 66, { amp: 1, dur: 7.5, delay: -1 }),
  "snake-plant": E(SnakePlant, 208, 50, 108, { amp: 0.4, dur: 9, delay: -3 }),
  "zz-plant": E(ZZPlant, 196, 92, 108, { amp: 0.8, dur: 8, delay: -2 }),
  "peace-lily": E(PeaceLily, 196, 92, 100, { amp: 1, dur: 7.8, delay: -4 }),
  monstera: E(Monstera, 192, 95, 104, { amp: 0.8, dur: 8.6, delay: -2 }),
  "fiddle-leaf-fig": E(FiddleLeafFig, 212, 76, 124, { amp: 0.7, dur: 9.4, delay: -5 }),
  "lucky-bamboo": E(LuckyBamboo, 214, 62, 118, { amp: 0.4, dur: 9, delay: -1 }),
  "money-tree": E(MoneyTree, 220, 92, 150, { amp: 0.7, dur: 8.8, delay: -3 }),
  "jade-plant": E(JadePlant, 148, 84, 84, { amp: 0.4, dur: 9, delay: -2 }),
  aloe: E(Aloe, 132, 90, 64, { amp: 0.3, dur: 10, delay: -6 }),
  echeveria: E(Echeveria, 92, 84, 42, { amp: 0.25, dur: 10, delay: -4 }),
  "spider-plant": E(SpiderPlant, 128, 98, 62, { amp: 1.1, dur: 7, delay: -2 }),
  calathea: E(Calathea, 186, 92, 100, { amp: 0.9, dur: 8.2, delay: -5 }),
  phalaenopsis: E(Phalaenopsis, 192, 96, 104, { amp: 0.5, dur: 8.5, delay: -1 }),
  basil: E(Basil, 160, 72, 88, { amp: 1.1, dur: 6.8, delay: -3 }),
  mint: E(Mint, 136, 80, 72, { amp: 1.1, dur: 6.4, delay: -2 }),
  aglaonema: E(Aglaonema, 160, 88, 78, { amp: 0.8, dur: 8, delay: -4 }),
  cactus: E(Cactus, 126, 66, 60, { amp: 0.15, dur: 11, delay: -3 }),
};

const FALLBACK: Entry = E(GenericPlant, 160, 74, 84, { amp: 1, dur: 7.6, delay: -2 });

export function plantEntry(plantId: string | null | undefined): Entry {
  if (plantId && plantId in REGISTRY) return REGISTRY[plantId as PlantId];
  return FALLBACK;
}

/** Size information for laying a plant out (e.g. in a pot). Unknown ids get the generic plant's. */
export function getPlantMeta(plantId: string | null | undefined): PlantMeta {
  return plantEntry(plantId).meta;
}

export function hasPlantArt(plantId: string | null | undefined): boolean {
  return !!plantId && plantId in REGISTRY;
}
