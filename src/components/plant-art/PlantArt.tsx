"use client";

import { getPlant, lt } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { PlantGraphic } from "./PlantGraphic";
import { PLANT_VIEWBOX } from "./registry";

export { PlantGraphic, type PlantGraphicProps } from "./PlantGraphic";
export { PLANT_ANCHOR, PLANT_VIEWBOX, getPlantMeta, hasPlantArt, type PlantMeta } from "./registry";

/**
 * Stylised SVG illustration of a plant (no pot), one per PlantId.
 * Every illustration shares one viewBox (200×240) with the stem base at the
 * bottom centre (PLANT_ANCHOR), so they line up and can be planted in a pot.
 */
export interface PlantArtProps {
  plantId: string;
  /** Pixel width; height follows the art's aspect. Omit to fill container. */
  width?: number;
  className?: string;
  /** Gentle idle sway animation. Default true. */
  animated?: boolean;
}

const ASPECT = PLANT_VIEWBOX.height / PLANT_VIEWBOX.width;

export function PlantArt({ plantId, width, className, animated = true }: PlantArtProps) {
  const t = useT("pot");
  const locale = useLocale();
  const plant = getPlant(plantId);
  const name = plant ? lt(plant.name, locale) : humanize(plantId);
  return (
    <svg
      viewBox={`0 0 ${PLANT_VIEWBOX.width} ${PLANT_VIEWBOX.height}`}
      width={width}
      height={width ? Math.round(width * ASPECT) : undefined}
      className={cn("block select-none", !width && "h-auto w-full", className)}
      style={width ? undefined : { aspectRatio: `${PLANT_VIEWBOX.width} / ${PLANT_VIEWBOX.height}` }}
      role="img"
      aria-label={t("aria.plant", { plant: name })}
      data-plant={plantId}
    >
      <PlantGraphic plantId={plantId} animated={animated} />
    </svg>
  );
}

function humanize(id: string) {
  const s = id.replace(/[-_]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : id;
}
