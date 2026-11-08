"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import type { Expression } from "@/components/companion-face/types";
import { getPotModel, lt, type Plant, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { PlantTraits } from "./PlantTraits";
import { nearestFittingSize } from "./studio";

/** "Your companion becomes…" — the selected plant's personality, plus a soft size-fit nudge. */
export function CompanionCard({
  plant,
  size,
  expression,
  onSwitchSize,
}: {
  plant: Plant;
  size: PotSize;
  expression: Expression;
  onSwitchSize: (size: PotSize) => void;
}) {
  const t = useT("store");
  const locale = useLocale();
  const fits = plant.sizes.includes(size);
  const better = nearestFittingSize(plant, size);
  const betterPot = getPotModel(better);

  return (
    <div className="mt-3 space-y-2">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={plant.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3.5 sm:p-4"
        >
          <CompanionFace expression={expression} talking={expression === "excited"} size={76} className="shrink-0" />
          <div className="min-w-0">
            <p className="eyebrow !text-[10px]">{t("studio.companion.eyebrow")}</p>
            <p className="mt-1 text-sm text-pretty text-fg/90">&ldquo;{lt(plant.personality, locale)}&rdquo;</p>
            <p className="mt-1 text-xs text-faint">
              {lt(plant.name, locale)} · <i>{plant.scientificName}</i>
            </p>
            <PlantTraits plant={plant} className="mt-2" />
          </div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!fits && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-sun/25 bg-sun/[0.07] px-4 py-3 text-sm">
              <TriangleExclamationPoint className="h-4 w-4 shrink-0 text-sun" aria-hidden />
              <p className="min-w-0 flex-1 text-sun/90">
                {t("studio.fit.warning", { plant: lt(plant.name, locale), sizes: plant.sizes.join(" / ") })}
              </p>
              <button
                type="button"
                onClick={() => onSwitchSize(better)}
                className="cursor-pointer rounded-lg border border-sun/30 px-2.5 py-1 text-xs font-medium text-sun hover:bg-sun/10"
              >
                {t("studio.fit.switch", { size: betterPot ? `${lt(betterPot.name, locale)} (${better})` : better })}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
