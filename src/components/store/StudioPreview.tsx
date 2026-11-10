"use client";

import { Check, Link2, ScanEye } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import type { Expression } from "@/components/companion-face/types";
import { PotPreview } from "@/components/pot/PotPreview";
import { getFinish, getPlant, getPotModel, lt, type PotFinishId, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** The big, sticky pot preview at the heart of the studio. */
export function StudioPreview({
  size,
  finish,
  plantId,
  expression,
}: {
  size: PotSize;
  finish: PotFinishId;
  plantId: string;
  expression: Expression;
}) {
  const t = useT("store");
  const locale = useLocale();
  const [annotated, setAnnotated] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pot = getPotModel(size);
  const plant = getPlant(plantId);
  const finishInfo = getFinish(finish);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const tool =
    "flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-bg/60 px-3 text-xs font-medium text-muted backdrop-blur transition-colors hover:border-line-strong hover:text-fg";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_38%,rgb(var(--glow)/0.16),transparent_70%)]" />
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-60" />
      <div
        className="pointer-events-none absolute inset-x-[18%] bottom-[11%] h-10 rounded-[100%] blur-2xl"
        style={{ background: finishInfo ? `${finishInfo.color}26` : undefined }}
      />

      <div className="relative flex items-center justify-between gap-2 p-4">
        <p className="glass rounded-full px-3 py-1 text-xs font-medium">
          {pot ? lt(pot.name, locale) : size}
          <span className="ml-1.5 text-faint">{size}</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={cn(tool, annotated && "border-leaf-300/40 text-leaf-200")}
            onClick={() => setAnnotated((a) => !a)}
            aria-pressed={annotated}
          >
            <ScanEye className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t("studio.preview.features")}</span>
          </button>
          <button type="button" className={tool} onClick={share} aria-label={t("studio.preview.share")}>
            {copied ? <Check className="h-3.5 w-3.5 text-leaf-300" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
            <span className="hidden sm:inline">{copied ? t("studio.preview.copied") : t("studio.preview.share")}</span>
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[min(78vw,400px)] px-6 pb-2 lg:max-w-[420px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={plantId}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.03, y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <PotPreview
              size={size}
              finish={finish}
              plantId={plantId}
              expression={expression}
              ringRotating
              lightOn
              annotated={annotated}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-line/70 bg-bg/30 px-5 py-3.5 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: plant?.color }} aria-hidden />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={plantId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              {plant ? lt(plant.name, locale) : ""}
            </motion.span>
          </AnimatePresence>
          {finishInfo && <span className="font-normal text-muted">· {lt(finishInfo.name, locale)}</span>}
        </p>
        {pot && (
          <p className="font-bold tabular-nums text-xs text-muted">
            {t("studio.size.dims", { d: pot.dims.diameterCm, h: pot.dims.heightCm })}
          </p>
        )}
      </div>
    </div>
  );
}
