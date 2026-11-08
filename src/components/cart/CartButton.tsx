"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useCart } from "./CartProvider";

/** Header cart icon + count; opens the cart drawer. */
export function CartButton({ className }: { className?: string }) {
  const { count, hydrated, openCart, isOpen } = useCart();
  const t = useT("store");
  const shown = hydrated ? count : 0;

  return (
    <button
      type="button"
      onClick={openCart}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={shown ? `${t("cart.open")} (${shown === 1 ? t("cart.countOne") : t("cart.count", { n: shown })})` : t("cart.open")}
      className={cn(
        "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg",
        shown > 0 && "text-fg",
        className,
      )}
    >
      <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
      <AnimatePresence>
        {shown > 0 && (
          <motion.span
            key={shown}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 22 }}
            className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-leaf-300 px-1 text-[10px] font-bold text-bg tabular-nums"
            aria-hidden
          >
            {shown > 99 ? "99+" : shown}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
