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
}
