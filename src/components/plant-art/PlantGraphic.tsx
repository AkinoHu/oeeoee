"use client";

import { memo, useId, useMemo } from "react";
import { n } from "./geometry";
import { ArtScopeProvider, Pivot, SheenGrad } from "./kit";
import { PLANT_ANCHOR, plantEntry } from "./registry";

export interface PlantGraphicProps {
  plantId: string;
  /** Where the stem base lands, in the parent SVG's units. Defaults to the shared anchor. */
  x?: number;
  y?: number;
  /** Uniform scale around the stem base. */
  scale?: number;
  /** Idle sway. Default true (always off for prefers-reduced-motion). */
  animated?: boolean;
  /** "potted" lets trailing plants (pothos, spider plant) hang over the pot rim. */
  variant?: "standalone" | "potted";
}

/** CSS-safe id prefix from React's useId. */
export function safeId(raw: string, prefix: string) {
  return `${prefix}${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * A plant illustration as an SVG `<g>`, for embedding inside another SVG
 * (e.g. the pot). Place it by its stem base with x/y/scale.
 */
export const PlantGraphic = memo(function PlantGraphic({
  plantId,
  x = PLANT_ANCHOR.x,
  y = PLANT_ANCHOR.y,
  scale = 1,
  animated = true,
  variant = "standalone",
}: PlantGraphicProps) {
  const uid = safeId(useId(), "pa");
  const entry = plantEntry(plantId);
  const scope = useMemo(() => ({ uid, animated, variant }), [uid, animated, variant]);
  const { Art } = entry;
  return (
    <ArtScopeProvider value={scope}>
      <g
        transform={`translate(${n(x)} ${n(y)})${scale !== 1 ? ` scale(${n(scale)})` : ""}`}
        data-plant={plantId}
      >
        <defs>
          <SheenGrad id={`${uid}-sheen`} />
        </defs>
        <Pivot motion={entry.sway} kind="sway">
          <Art />
        </Pivot>
      </g>
    </ArtScopeProvider>
  );
});
