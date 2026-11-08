"use client";

import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { CompanionFaceGraphic } from "./CompanionFaceGraphic";
import { FACE_H, FACE_W } from "./expressions";
import type { CompanionFaceProps } from "./types";

export { CompanionFaceGraphic, type CompanionFaceGraphicProps } from "./CompanionFaceGraphic";

/**
 * The companion's animated face (the pot's screen): a dark rounded screen with
 * glowing leaf-green eyes. Expressions morph smoothly; it blinks, glances and
 * breathes on its own, and `talking` animates the mouth.
 */
export function CompanionFace({ expression = "neutral", talking = false, size = 160, className }: CompanionFaceProps) {
  const t = useT("pot");
  return (
    <svg
      viewBox={`0 0 ${FACE_W} ${FACE_H}`}
      width={size}
      height={Math.round((size * FACE_H) / FACE_W)}
      className={cn("block select-none", className)}
      role="img"
      aria-label={t("aria.face", { expression: t(`expression.${expression}`) })}
      data-expression={expression}
    >
      <CompanionFaceGraphic expression={expression} talking={talking} />
    </svg>
  );
}
