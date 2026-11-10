"use client";

import { ArrowRight, LoaderCircle, LocateFixed } from "lucide-react";
import { useSyncExternalStore } from "react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import type { Expression } from "@/components/companion-face/types";
import { PotPreview } from "@/components/pot/PotPreview";
import { SpeechBubble } from "@/components/ui/speech-bubble";
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

interface CompanionGreeterProps {
  visitor: VisitorView | null;
  state: LocateState;
  /** Location came from the device (no need to offer "Use my location" again). */
  precise: boolean;
  /** "pot": the whole pot beside the bubble (wide screens). "face": just the face (phones). */
  variant: "pot" | "face";
  onExplore: () => void;
  onLocate: () => void;
  className?: string;
}

type DayPart = "morning" | "afternoon" | "evening" | "night";

const noopSubscribe = () => () => {};

/** Part of the visitor's day, known only in the browser (null on the server). */
function useDayPart(): DayPart | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const h = new Date().getHours();
      return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : h >= 18 && h < 23 ? "evening" : "night";
    },
    () => null,
  );
}

/**
 * The companion says hello and asks where you are: the location guess
 * ("Looks like you're in Japan?") in its own voice, with the way in.
 */
export function CompanionGreeter({ visitor, state, precise, variant, onExplore, onLocate, className }: CompanionGreeterProps) {
  const t = useT("landing");
  const part = useDayPart();
  const canExplore = visitor && (visitor.isMarket || visitor.regionName);

  let message: string;
  if (state === "locating") message = t("loc.locating");
  else if (state === "denied") message = t("loc.denied");
  else if (state === "unavailable") message = t("loc.unavailable");
  else if (visitor?.name) message = t(visitor.isMarket ? "loc.youAreIn" : "loc.youAreInSoon", { country: visitor.name });
  else message = t("loc.unknown");

  const expression: Expression =
    state === "locating" ? "curious" : state === "denied" || state === "unavailable" ? "concerned" : part === "night" ? "sleepy" : "happy";
  const showLocate = !precise && state !== "locating";

  const bubble = (
    <SpeechBubble
      role="status"
      tail={variant === "pot" ? "bottom-right" : "bottom-left"}
      className={cn("block py-3", variant === "pot" ? "max-w-[17.5rem]" : "min-w-0 flex-1")}
    >
      <p className="text-sm leading-snug font-bold text-pretty">
        {state === "idle" && part && <span className="text-leaf-300">{t(`greet.${part}`)} </span>}
        {message}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {state === "locating" && <LoaderCircle className="size-4 animate-spin text-clay" aria-hidden />}
        {state === "idle" && canExplore && (
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full bg-leaf-300 px-3.5 text-xs font-extrabold text-bg transition hover:bg-leaf-200"
          >
            {visitor.isMarket ? t("loc.explore") : t("loc.seeRegion", { region: visitor.regionName ?? "" })}
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        )}
        {showLocate && (
          <button
            type="button"
            onClick={onLocate}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong/80 px-3 text-xs font-bold text-muted transition hover:border-clay/50 hover:text-fg"
          >
            <LocateFixed className="size-3.5 text-clay" aria-hidden />
            {t("loc.useMine")}
          </button>
        )}
      </div>
    </SpeechBubble>
  );

  if (variant === "face") {
    return (
      <div className={cn("flex items-end gap-2.5", className)}>
        <CompanionFace expression={expression} size={56} className="shrink-0 drop-shadow-[0_6px_10px_rgb(74_55_28/0.25)]" />
        {bubble}
      </div>
    );
  }

  return (
    <div className={cn("flex items-end", className)}>
      <div className="relative z-10 -mr-3 mb-[7.5rem]">{bubble}</div>
      <div className="relative w-[186px] shrink-0">
        <div aria-hidden className="lamp-glow absolute -inset-x-12 -top-8 -bottom-2 -z-10 rounded-full" />
        <PotPreview size="M" finish="porcelain" plantId="pothos" expression={expression} />
      </div>
    </div>
  );
}
