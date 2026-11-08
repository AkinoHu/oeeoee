"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { getCountry, lt } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import type { CartLine } from "@/lib/cart/types";
import { useModal } from "./useModal";

/** Asks before swapping a cart for one country with an item for another. */
export function ReplaceCartDialog({
  pending,
  currentCountryCode,
  onConfirm,
  onCancel,
}: {
  pending: { countryCode: string; line: CartLine } | null;
  currentCountryCode: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT("store");
  const locale = useLocale();
  const panel = useRef<HTMLDivElement>(null);
  useModal(pending !== null, panel, onCancel);

  const next = getCountry(pending?.countryCode);
  const current = getCountry(currentCountryCode);

  return (
    <AnimatePresence>
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" key="replace">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="replace-cart-title"
            aria-describedby="replace-cart-body"
            tabIndex={-1}
            className="relative w-full max-w-sm rounded-3xl border border-line-strong bg-surface p-6 shadow-2xl outline-none"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-sun/12 text-sun">
              <ShoppingBag className="h-5 w-5" aria-hidden />
            </div>
            <h2 id="replace-cart-title" className="text-lg font-semibold tracking-tight">
              {t("cart.replace.title", { country: next ? lt(next.name, locale) : "" })}
            </h2>
            <p id="replace-cart-body" className="mt-2 text-sm text-pretty text-muted">
              {t("cart.replace.body", { current: current ? lt(current.name, locale) : "" })}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onCancel} data-autofocus>
                {t("cart.replace.cancel")}
              </Button>
              <Button onClick={onConfirm}>{t("cart.replace.confirm")}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
