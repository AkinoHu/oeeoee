"use client";

import { getFinish } from "@/data";
import type { PotPreviewProps } from "./types";

/**
 * Illustrated smart pot with plant, face screen and rotating sensor ring.
 * STUB — implemented by the pot-art agent. Keep the props contract stable.
 * Fills its container width; aspect ratio ~ 3:4.
 */
export function PotPreview({ size, finish, plantId, className }: PotPreviewProps) {
  const f = getFinish(finish);
  return (
    <div className={className} data-size={size} data-plant={plantId ?? "none"}>
      <svg viewBox="0 0 300 400" width="100%">
        <ellipse cx="150" cy="150" rx="80" ry="90" fill="#3f7d3a" />
        <rect x="80" y="220" width="140" height="150" rx="20" fill={f?.color ?? "#ddd"} />
        <rect x="115" y="260" width="70" height="50" rx="10" fill="#0b1210" />
      </svg>
    </div>
  );
}
