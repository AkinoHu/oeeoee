"use client";

import { ArrowRight, LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type LocateState = "idle" | "locating" | "denied" | "unavailable";

export interface VisitorView {
  /** Localized country name; null when only the position is known. */
  name: string | null;
  /** Visitor is in one of our markets. */
  isMarket: boolean;
  /** Region to jump to for non-market countries. */
  regionName: string | null;
}

interface LocationChipProps {
  visitor: VisitorView | null;
  state: LocateState;
  /** Location came from the device (no need to offer "Use my location" again). */
  precise: boolean;
  /** Narrow screens: shorter copy, icon-only locate button. */
  compact?: boolean;
  onExplore: () => void;
  onLocate: () => void;
  className?: string;
}

/** "Looks like you're in Japan — Explore" + "Use my location". */
export function LocationChip({ visitor, state, precise, compact, onExplore, onLocate, className }: LocationChipProps) {
  const t = useT("landing");
  const canExplore = visitor && (visitor.isMarket || visitor.regionName);

  let message: React.ReactNode = null;
  if (state === "locating") message = t("loc.locating");
  else if (state === "denied") message = t("loc.denied");
  else if (state === "unavailable") message = t("loc.unavailable");
  else if (visitor?.name) message = t(compact ? "loc.youAreInShort" : "loc.youAreIn", { country: visitor.name });
  else if (visitor) message = t("loc.unknown");

  const showLocate = !precise && state !== "locating";

  return (
    <div className={cn("flex items-center gap-2", compact ? "flex-nowrap" : "flex-wrap", className)}>
      {message && (
        <div
          role="status"
          className="glass inline-flex h-10 min-w-0 items-center gap-2 rounded-full pr-1.5 pl-3 text-sm text-fg/90"
        >
          {state === "locating" ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-sky" aria-hidden />
          ) : (
            <span aria-hidden className="relative grid size-4 shrink-0 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-sky/40 [animation-duration:2s]" />
              <MapPin className="relative size-4 text-sky" />
            </span>
          )}
          <span className="min-w-0 truncate">
            {message}
            {state === "idle" && visitor?.name && !visitor.isMarket && !compact && (
              <span className="text-muted"> · {t("loc.notOpen")}</span>
            )}
          </span>
          {state === "idle" && canExplore ? (
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-sky/15 px-3 text-xs font-semibold text-sky transition hover:bg-sky/25"
            >
              {visitor.isMarket ? t("loc.explore") : t("loc.seeRegion", { region: visitor.regionName ?? "" })}
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          ) : (
            <span className="w-1.5" />
          )}
        </div>
      )}
      {showLocate && (
        <button
          type="button"
          onClick={onLocate}
          aria-label={compact && message ? t("loc.useMine") : undefined}
          title={compact && message ? t("loc.useMine") : undefined}
          className={cn(
            "glass inline-flex h-10 shrink-0 items-center gap-2 rounded-full text-sm text-fg/85 transition hover:border-sky/40 hover:text-fg",
            compact && message ? "w-10 justify-center" : "px-3.5",
          )}
        >
          <LocateFixed className="size-4 text-sky" aria-hidden />
          {!(compact && message) && t("loc.useMine")}
        </button>
      )}
    </div>
  );
}
