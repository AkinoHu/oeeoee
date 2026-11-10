"use client";

import type { RegionId, SalesMode } from "@/data/types";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";
import type { MapRegion } from "./types";

export interface RegionStat {
  count: number;
  best: SalesMode | null;
}

interface RegionChipsProps {
  regions: MapRegion[];
  stats: Map<RegionId, RegionStat>;
  activeRegion: RegionId | null;
  pulse: boolean;
  chipRef: (id: RegionId) => (el: HTMLButtonElement | null) => void;
  onHover: (id: RegionId | null) => void;
  onSelect: (id: RegionId) => void;
}

/** "Choose your region" chips. Hover / focus lights the region up on the map. */
export function RegionChips({ regions, stats, activeRegion, pulse, chipRef, onHover, onSelect }: RegionChipsProps) {
  const t = useT("landing");
  return (
    <div
      role="group"
      aria-labelledby="region-chips-label"
      className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:justify-center lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {regions.map((r, i) => {
        const stat = stats.get(r.id) ?? { count: 0, best: null };
        const active = activeRegion === r.id;
        const label = stat.count
          ? stat.count === 1
            ? t("map.regionCountOne")
            : t("map.regionCount", { n: stat.count })
          : t("map.regionSoon");
        return (
          <button
            key={r.id}
            ref={chipRef(r.id)}
            type="button"
            onClick={() => onSelect(r.id)}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(r.id)}
            onBlur={() => onHover(null)}
            aria-label={`${r.name} · ${label}`}
            style={pulse ? { animationDelay: `${i * 60}ms` } : undefined}
            className={cn(
              "glass group inline-flex h-10 shrink-0 snap-start items-center gap-2 rounded-full px-3.5 text-sm whitespace-nowrap transition-[background,border-color,box-shadow,color] duration-200",
              active
                ? "border-leaf-300/50 bg-leaf-300/12 text-fg shadow-[0_0_24px_-6px_rgb(var(--accent)/0.6)]"
                : stat.count
                  ? "text-fg/90 hover:border-leaf-300/40 hover:text-fg"
                  : "text-fg/65 hover:border-fg/20 hover:text-fg",
              pulse && "animate-[region-chip-pulse_1.1s_ease-out_both]",
            )}
          >
            <StatusDot mode={stat.best} />
            <span className="font-medium">{r.name}</span>
            {stat.count > 0 && (
              <span className="-mr-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-fg/[0.08] px-1.5 font-bold tabular-nums text-[11px] text-muted ">
                {stat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
