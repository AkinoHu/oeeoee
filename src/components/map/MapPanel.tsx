"use client";

import { ArrowRight, ChevronRight, Sprout, Truck, X } from "lucide-react";
import Link from "next/link";
import type { Ref } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { StatusBadge, StatusDot } from "./StatusDot";
import type { MapMarket, MapRegion } from "./types";

interface MapPanelProps {
  region: MapRegion;
  /** Markets in the region, best status first. */
  markets: MapMarket[];
  selected: MapMarket | null;
  hoverCode: string | null;
  desktop: boolean;
  sheetHeight: number;
  headingRef: Ref<HTMLHeadingElement>;
  onHover: (code: string | null) => void;
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** Glass side panel (desktop) / bottom sheet (mobile) for the region and country stages. */
export function MapPanel({
  region,
  markets,
  selected,
  hoverCode,
  desktop,
  sheetHeight,
  headingRef,
  onHover,
  onSelect,
  onClose,
}: MapPanelProps) {
  const t = useT("landing");
  const others = selected ? markets.filter((m) => m.code !== selected.code) : markets;
  const countLabel = markets.length === 1 ? t("map.regionCountOne") : t("map.regionCount", { n: markets.length });

  return (
    <div
      className={cn(
        "glass pointer-events-auto absolute z-20 flex flex-col overflow-hidden shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]",
        desktop
          ? "top-[72px] right-5 bottom-5 w-[360px] rounded-3xl xl:w-[400px]"
          : "inset-x-0 bottom-0 rounded-t-3xl border-x-0 border-b-0",
      )}
      style={desktop ? undefined : { height: sheetHeight }}
    >
      {!desktop && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-fg/15" />}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("panel.close")}
        className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full text-muted transition hover:bg-fg/5 hover:text-fg"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {selected ? (
          <section className="relative p-5 pt-6 sm:p-6" aria-labelledby="map-panel-heading">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-leaf-300/10 blur-3xl"
            />
            <p className="eyebrow">
              {t("card.eyebrow")} · {region.name}
            </p>
            <h3
              id="map-panel-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 pr-8 text-3xl font-semibold tracking-tight text-balance outline-none"
            >
              {selected.name}
            </h3>
            <StatusBadge mode={selected.salesMode} label={t(`status.${selected.salesMode}`)} className="mt-3" />
            <p className="mt-4 text-sm leading-relaxed text-muted text-pretty">{t(`card.body.${selected.salesMode}`)}</p>
            {selected.eta && (
              <p className="mt-3 flex items-center gap-2 text-sm text-fg/80">
                <Truck className="size-4 text-leaf-300" aria-hidden />
                {t("card.eta", { min: selected.eta[0], max: selected.eta[1] })}
              </p>
            )}
            <ButtonLink
              href={`/c/${selected.code.toLowerCase()}`}
              size="lg"
              variant={selected.salesMode === "coming_soon" ? "secondary" : "primary"}
              className="mt-6 w-full"
            >
              {t(`card.cta.${selected.salesMode}`)}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </section>
        ) : (
          <header className="p-5 pt-6 sm:p-6">
            <p className="eyebrow">{t("panel.eyebrow")}</p>
            <h3
              id="map-panel-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 pr-8 text-3xl font-semibold tracking-tight outline-none"
            >
              {region.name}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {markets.length ? `${countLabel} · ${t("panel.pick")}` : t("panel.emptyBody")}
            </p>
          </header>
        )}

        {markets.length === 0 && (
          <div className="px-5 pb-6 sm:px-6">
            <div className="rounded-2xl border border-line bg-surface/60 p-4">
              <Sprout className="size-5 text-leaf-300" aria-hidden />
              <p className="mt-3 font-medium">{t("panel.emptyTitle", { region: region.name })}</p>
              <Link
                href="/partners"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-300 hover:text-leaf-200"
              >
                {t("panel.emptyCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className={cn("px-3 pb-4", selected && "border-t border-fg/5 pt-3")}>
            {selected && <p className="px-3 pt-1 pb-2 text-xs font-medium text-faint">{t("card.more", { region: region.name })}</p>}
            <ul className="space-y-1">
              {others.map((m) => (
                <li key={m.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(m.code)}
                    onMouseEnter={() => onHover(m.code)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(m.code)}
                    onBlur={() => onHover(null)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                      hoverCode === m.code ? "bg-fg/[0.06]" : "hover:bg-fg/[0.04]",
                    )}
                  >
                    <StatusDot mode={m.salesMode} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.name}</span>
                      <span className="block text-xs text-muted sm:hidden">{t(`statusShort.${m.salesMode}`)}</span>
                    </span>
                    <StatusBadge mode={m.salesMode} label={t(`statusShort.${m.salesMode}`)} className="hidden sm:inline-flex" />
                    <ChevronRight
                      className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-fg"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {markets.length > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-fg/5 px-5 py-3.5 text-xs sm:px-6">
          <span className="text-faint">{t("panel.notListed")}</span>
          <Link href="/partners" className="inline-flex items-center gap-1 font-medium text-leaf-300 hover:text-leaf-200">
            {t("panel.emptyCta")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
