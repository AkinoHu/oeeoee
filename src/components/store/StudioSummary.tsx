"use client";

import { Bell, Check, ShoppingBag, Store } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/button";
import { getFinish, getPotModel, lt, plantPrice, type Country, type Plant, type PotFinishId, type PotSize } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import type { CartLine } from "@/lib/cart/types";
import { formatMoney } from "@/lib/money";
import { shippingFor } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { WaitlistForm } from "./WaitlistForm";

/** Price breakdown + add to cart (or the waitlist for markets that aren't open). */
export function StudioSummary({
  country,
  size,
  finish,
  plant,
  includePlant,
  onIncludePlantChange,
  defaultEmail,
}: {
  country: Country;
  size: PotSize;
  finish: PotFinishId;
  plant: Plant;
  includePlant: boolean;
  onIncludePlantChange: (include: boolean) => void;
  defaultEmail?: string | null;
}) {
  const t = useT("store");
  const locale = useLocale();
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (country.salesMode === "coming_soon") {
    return (
      <div className="rounded-2xl border border-sun/25 bg-sun/[0.05] p-5">
        <p className="flex items-center gap-2 font-medium text-sun">
          <Bell className="h-4 w-4" aria-hidden />
          {t("summary.comingSoon.title")}
        </p>
        <p className="mt-1.5 mb-4 text-sm text-pretty text-muted">
          {t("summary.comingSoon.body", { country: lt(country.name, locale) })}
        </p>
        <WaitlistForm countryCode={country.code} defaultEmail={defaultEmail} />
      </div>
    );
  }

  const pot = getPotModel(size);
  const finishInfo = getFinish(finish);
  if (!pot) return null;
  const money = (n: number) => formatMoney(n, country.currency, locale);
  const potUnit = pot.prices[country.currency] ?? 0;
  const plantUnit = plantPrice(country, plant.id);
  const sellable = plantUnit !== null;
  const withPlant = sellable && includePlant;
  const fits = plant.sizes.includes(size);
  const blocked = withPlant && !fits;
  const subtotal = potUnit + (withPlant ? (plantUnit ?? 0) : 0);
  const shipping = shippingFor(country, subtotal);
  const total = subtotal + shipping;
  const plantName = lt(plant.name, locale);

  function onAdd() {
    if (!pot || blocked) return;
    const line: CartLine = {
      potSku: pot.sku,
      finish,
      plantId: withPlant ? plant.id : null,
      previewPlantId: withPlant ? null : plant.id,
      quantity: 1,
    };
    if (add(country.code, line) === "added") {
      setAdded(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAdded(false), 2200);
    }
  }

  const addButton = (className?: string) => (
    <Button size="lg" className={cn("relative overflow-hidden", className)} onClick={onAdd} disabled={blocked}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={added ? "added" : "add"}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2"
        >
          {added ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingBag className="h-4 w-4" aria-hidden />}
          {added ? t("summary.added") : t("summary.addToCart")}
        </motion.span>
      </AnimatePresence>
    </Button>
  );

  return (
    <>
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt>
              <span className="font-medium">{lt(pot.name, locale)}</span>
              <span className="text-muted"> · {finishInfo ? lt(finishInfo.name, locale) : finish}</span>
            </dt>
            <dd className="font-medium tabular-nums">{money(potUnit)}</dd>
          </div>

          <div className="flex items-start justify-between gap-4">
            {sellable ? (
              <>
                <dt className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includePlant}
                    onClick={() => onIncludePlantChange(!includePlant)}
                    className={cn(
                      "relative h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors",
                      includePlant ? "border-leaf-300 bg-leaf-300" : "border-line-strong bg-surface-2",
                    )}
                  >
                    <span className="sr-only">{t("summary.includePlant", { plant: plantName })}</span>
                    <motion.span
                      className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full", includePlant ? "bg-bg" : "bg-muted")}
                      animate={{ left: includePlant ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 600, damping: 35 }}
                    />
                  </button>
                  <span className={cn(!includePlant && "text-muted")} aria-hidden>
                    {t("summary.includePlant", { plant: plantName })}
                  </span>
                </dt>
                <dd className={cn("tabular-nums", includePlant ? "font-medium" : "text-faint line-through")}>
                  {money(plantUnit ?? 0)}
                </dd>
              </>
            ) : (
              <>
                <dt className="flex items-start gap-2 text-muted">
                  <Store className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-pretty">
                    {country.salesMode === "full"
                      ? t("summary.plantNotSold", { plant: plantName })
                      : t("summary.plantLocal", { plant: plantName })}
                  </span>
                </dt>
                <dd className="shrink-0 text-xs text-faint">{t("summary.notIncluded")}</dd>
              </>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 text-muted">
            <dt>
              {t("summary.shipping")}
              {shipping > 0 && country.shipping.freeOver !== undefined && (
                <span className="block text-xs text-faint">
                  {t("shipping.freeOver", { amount: money(country.shipping.freeOver) })}
                </span>
              )}
            </dt>
            <dd className="tabular-nums">{shipping === 0 ? t("cart.shippingFree") : money(shipping)}</dd>
          </div>

          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-medium">{t("summary.total")}</dt>
            <dd className="text-xl font-semibold tracking-tight tabular-nums">{money(total)}</dd>
          </div>
        </dl>

        {blocked && <p className="mt-3 text-xs text-sun">{t("summary.fitBlocked")}</p>}
        {addButton("mt-4 hidden w-full lg:flex")}
        <p className="mt-3 text-center text-xs text-faint lg:mt-2.5">
          {t("shipping.eta", { min: country.shipping.etaDays[0], max: country.shipping.etaDays[1] })}
        </p>
        {country.salesMode === "pot_only" && (
          <a href="#local-plants" className="mt-1 block text-center text-xs text-leaf-300 hover:text-leaf-200">
            {t("summary.notifyPlants")}
          </a>
        )}
      </div>

      {/* Mobile: keep the total and the button within thumb reach. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center gap-4 border-t border-line bg-bg/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="min-w-0">
          <p className="text-xs text-muted">{t("summary.total")}</p>
          <p className="text-lg font-semibold tracking-tight tabular-nums">{money(total)}</p>
        </div>
        {addButton("ml-auto flex-1")}
      </div>
    </>
  );
}
