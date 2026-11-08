"use client";

import { Check, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { lt, plantPrice, type Country, type Plant, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PlantTraits } from "./PlantTraits";
import { shortPersonality } from "./studio";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Horizontal strip of the market's plants; picking one swaps it into the pot instantly. */
export function PlantSwitcher({
  country,
  plants,
  value,
  size,
  onChange,
}: {
  country: Country;
  plants: Plant[];
  value: string;
  size: PotSize;
  onChange: (plantId: string) => void;
}) {
  const t = useT("store");
  const locale = useLocale();
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: plants.length <= 2 });

  function onScroll() {
    const el = strip.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }

  // Keep the selected card in view when it changes (e.g. from the quiz) — horizontally only.
  useEffect(() => {
    const el = strip.current;
    const card = el?.querySelector<HTMLElement>(`[data-plant-id="${CSS.escape(value)}"]`);
    if (!el || !card) return;
    const left = card.offsetLeft - el.clientWidth / 2 + card.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: scrollBehavior() });
  }, [value]);

  function scrollBy(dir: 1 | -1) {
    const el = strip.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: scrollBehavior() });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = plants.findIndex((p) => p.id === value);
    const next = plants[(i + (e.key === "ArrowRight" ? 1 : -1) + plants.length) % plants.length];
    if (!next) return;
    e.preventDefault();
    onChange(next.id);
    strip.current?.querySelector<HTMLElement>(`[data-plant-id="${CSS.escape(next.id)}"]`)?.focus();
  }

  // Arrows float over the art area of the edge cards (never over text) and hide at the ends.
  const arrow =
    "absolute top-12 z-10 hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface/90 text-muted shadow-lg backdrop-blur transition-opacity hover:text-fg sm:flex";

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(arrow, "-left-4", edges.start && "pointer-events-none opacity-0")}
        onClick={() => scrollBy(-1)}
        aria-label={t("studio.plant.prev")}
        tabIndex={edges.start ? -1 : 0}
        aria-hidden={edges.start}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={cn(arrow, "-right-4", edges.end && "pointer-events-none opacity-0")}
        onClick={() => scrollBy(1)}
        aria-label={t("studio.plant.next")}
        tabIndex={edges.end ? -1 : 0}
        aria-hidden={edges.end}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <div
        ref={strip}
        role="radiogroup"
        aria-label={t("studio.step.plant")}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {plants.map((plant) => {
          const selected = plant.id === value;
          const price = plantPrice(country, plant.id);
          const fits = plant.sizes.includes(size);
          return (
            <button
              key={plant.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-plant-id={plant.id}
              onClick={() => onChange(plant.id)}
              className={cn(
                "group relative flex w-48 shrink-0 cursor-pointer snap-start flex-col rounded-2xl border p-2.5 text-left transition-[border-color,background-color,transform] duration-200 sm:w-52",
                selected ? "border-leaf-300/60 bg-leaf-300/[0.05]" : "border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong",
              )}
            >
              <span
                className="relative flex h-28 items-end justify-center overflow-hidden rounded-xl bg-surface-2"
                style={{ background: `radial-gradient(circle at 50% 85%, ${plant.color}38, transparent 72%), var(--color-surface-2)` }}
              >
                <motion.span
                  className="block"
                  animate={selected ? { scale: 1.06, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <PlantArt plantId={plant.id} width={84} animated={selected} />
                </motion.span>
                {selected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-leaf-300 text-bg"
                  >
                    <Check className="h-3 w-3" aria-hidden />
                  </motion.span>
                )}
                {!fits && (
                  <span className="absolute top-2 left-2 rounded-full bg-bg/80 px-1.5 py-0.5 text-[10px] font-medium text-sun">
                    {t("studio.plant.needsSize", { sizes: plant.sizes.join("/") })}
                  </span>
                )}
              </span>
              <span className="mt-2.5 px-1 font-medium">{lt(plant.name, locale)}</span>
              <span className="mt-0.5 line-clamp-2 min-h-8 px-1 text-xs leading-4 text-muted">
                {shortPersonality(lt(plant.personality, locale))}
              </span>
              <PlantTraits plant={plant} compact className="mt-2 px-0.5" />
              <span className="mt-auto flex items-center gap-1.5 px-1 pt-2.5 text-sm">
                {price !== null ? (
                  <span className="font-semibold text-leaf-200 tabular-nums">+ {formatMoney(price, country.currency, locale)}</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Store className="h-3.5 w-3.5" aria-hidden />
                    {country.salesMode === "coming_soon" ? t("studio.plant.growsHere") : t("studio.plant.local")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
