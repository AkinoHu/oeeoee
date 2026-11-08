"use client";

import { Droplet, Droplets, PawPrint, Sun, SunDim } from "lucide-react";
import type { Plant } from "@/data";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const chip = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap";

/** Light / water / pet-safety chips for a plant. `compact` uses short labels and an icon-only pet chip. */
export function PlantTraits({ plant, compact = false, className }: { plant: Plant; compact?: boolean; className?: string }) {
  const t = useT("store");
  const LightIcon = plant.light === "bright" ? Sun : SunDim;
  const WaterIcon = plant.water === "low" ? Droplet : Droplets;
  return (
    <ul className={cn("flex flex-wrap gap-1", className)}>
      <li className={cn(chip, compact && "px-1.5", "border-sun/20 bg-sun/8 text-sun/90")}>
        <LightIcon className="h-3 w-3" aria-hidden />
        {compact ? (
          <>
            <span aria-hidden>{t(`chip.lightShort.${plant.light}`)}</span>
            <span className="sr-only">{t(`chip.light.${plant.light}`)}</span>
          </>
        ) : (
          t(`chip.light.${plant.light}`)
        )}
      </li>
      <li className={cn(chip, compact && "px-1.5", "border-sky/20 bg-sky/8 text-sky/90")}>
        <WaterIcon className="h-3 w-3" aria-hidden />
        {compact ? (
          <>
            <span aria-hidden>{t(`chip.waterShort.${plant.water}`)}</span>
            <span className="sr-only">{t(`chip.water.${plant.water}`)}</span>
          </>
        ) : (
          t(`chip.water.${plant.water}`)
        )}
      </li>
      <li
        className={cn(
          chip,
          compact && "px-1.5",
          plant.petSafe ? "border-leaf-300/25 bg-leaf-300/10 text-leaf-200" : "border-line bg-surface-2 text-faint",
        )}
        title={compact ? (plant.petSafe ? t("chip.petSafe") : t("chip.notPetSafe")) : undefined}
      >
        <PawPrint className="h-3 w-3" aria-hidden />
        {compact ? (
          <>
            <span aria-hidden>{plant.petSafe ? "✓" : "✕"}</span>
            <span className="sr-only">{plant.petSafe ? t("chip.petSafe") : t("chip.notPetSafe")}</span>
          </>
        ) : plant.petSafe ? (
          t("chip.petSafe")
        ) : (
          t("chip.notPetSafe")
        )}
      </li>
    </ul>
  );
}
