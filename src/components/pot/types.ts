import type { Expression } from "@/components/companion-face/types";
import type { PotFinishId, PotSize } from "@/data/types";

export interface PotPreviewProps {
  size: PotSize;
  finish: PotFinishId;
  /** Plant growing in the pot; null shows an empty pot with soil. */
  plantId: string | null;
  expression?: Expression;
  /** Slowly rotate the camera / grow-light ring. Default true. */
  ringRotating?: boolean;
  /** Show the grow light glowing. Default true. */
  lightOn?: boolean;
  /** Show small callout labels (camera, light, sensors, screen, reservoir). */
  annotated?: boolean;
  className?: string;
  /** Animate the face's mouth as if speaking. Default false. */
  talking?: boolean;
  /**
   * Idle life (plant sway, face blinking, ring motion, water ripple). Default true.
   * Set false for static thumbnails. Always off for prefers-reduced-motion.
   */
  animated?: boolean;
}
