"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { listFinishes, listPotModels, lt, type Country, type PotFinishId, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function StepHeading({ index, title, aside }: { index: number; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h3 className="flex items-baseline gap-2.5 text-sm font-medium">
        <span className="font-bold tabular-nums text-xs text-leaf-300">{String(index).padStart(2, "0")}</span>
        {title}
      </h3>
      {aside}
    </div>
  );
}

/** Arrow-key navigation for a radiogroup of buttons. */
function onRadioKeys(e: React.KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  if (!keys.includes(e.key)) return;
  const radios = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const i = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  e.preventDefault();
  const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
  const next = radios[(i + dir + radios.length) % radios.length];
  next.focus();
  next.click();
}

export function SizePicker({
  country,
  value,
  onChange,
  fits,
  showPrices,
}: {
  country: Country;
  value: PotSize;
  onChange: (size: PotSize) => void;
  /** Sizes the selected plant fits. */
  fits: PotSize[];
  showPrices: boolean;
}) {
  const t = useT("store");
  const locale = useLocale();
  return (
    <div role="radiogroup" aria-label={t("studio.step.size")} className="grid grid-cols-3 gap-2 sm:gap-3" onKeyDown={onRadioKeys}>
      {listPotModels().map((pot) => {
        const selected = pot.size === value;
        const price = pot.prices[country.currency];
        return (
          <button
            key={pot.size}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(pot.size)}
            className={cn(
              "group relative flex cursor-pointer flex-col rounded-2xl border p-3 text-left transition-[border-color,background-color] sm:p-4",
              selected ? "border-leaf-300/60 bg-leaf-300/[0.06]" : "border-line bg-surface hover:border-line-strong",
            )}
          >
            {selected && (
              <motion.span
                layoutId="size-ring"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-leaf-300/50"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="flex items-center justify-between">
              <span className={cn("text-2xl font-semibold tracking-tight", selected ? "text-leaf-200" : "text-fg")}>{pot.size}</span>
              {!fits.includes(pot.size) && (
                <span className="h-1.5 w-1.5 rounded-full bg-sun" title={t("studio.size.noFit")} aria-label={t("studio.size.noFit")} />
              )}
            </span>
            <span className="mt-0.5 truncate text-xs font-medium text-fg/90 sm:text-sm">{lt(pot.name, locale)}</span>
            <span className="mt-2 space-y-0.5 font-bold tabular-nums text-[10px] leading-4 text-muted sm:text-[11px]">
              <span className="block">{t("studio.size.dims", { d: pot.dims.diameterCm, h: pot.dims.heightCm })}</span>
              <span className="block">{t("studio.size.reservoir", { l: (pot.reservoirMl / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) })}</span>
              <span className="block">{t("studio.size.screen", { inch: pot.screenInch })}</span>
            </span>
            {showPrices && price !== undefined && (
              <span className="mt-2.5 text-sm font-semibold tabular-nums">{formatMoney(price, country.currency, locale)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function FinishPicker({ value, onChange }: { value: PotFinishId; onChange: (finish: PotFinishId) => void }) {
  const t = useT("store");
  const locale = useLocale();
  return (
    <div role="radiogroup" aria-label={t("studio.step.finish")} className="flex flex-wrap gap-2" onKeyDown={onRadioKeys}>
      {listFinishes().map((f) => {
        const selected = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(f.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm transition-colors sm:gap-2.5 sm:pr-4",
              selected ? "border-leaf-300/60 bg-leaf-300/[0.06] text-fg" : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            <span
              className="relative flex h-6 w-6 items-center justify-center rounded-full shadow-inner sm:h-7 sm:w-7"
              style={{ background: `linear-gradient(145deg, ${f.color} 40%, ${f.shade})` }}
              aria-hidden
            >
              {selected && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-4 w-4 items-center justify-center rounded-full bg-bg/70">
                  <Check className="h-2.5 w-2.5 text-leaf-200" />
                </motion.span>
              )}
            </span>
            {lt(f.name, locale)}
          </button>
        );
      })}
    </div>
  );
}
