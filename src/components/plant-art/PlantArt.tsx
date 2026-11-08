"use client";

/**
 * Stylised SVG illustration of a plant (no pot), one per PlantId.
 * STUB — implemented by the pot-art agent.
 */
export interface PlantArtProps {
  plantId: string;
  /** Pixel width; height follows the art's aspect. Omit to fill container. */
  width?: number;
  className?: string;
  /** Gentle idle sway animation. Default true. */
  animated?: boolean;
}

export function PlantArt({ plantId, width, className }: PlantArtProps) {
  return (
    <svg viewBox="0 0 200 220" width={width ?? "100%"} className={className} data-plant={plantId}>
      <ellipse cx="100" cy="110" rx="70" ry="90" fill="#3f7d3a" />
    </svg>
  );
}
