"use client";

import { LoaderCircle, Lock, Minus, Plus, ShoppingBag, Trash, Truck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { PotPreview } from "@/components/pot/PotPreview";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCountry, getFinish, getPlant, getPotBySku, lt, type PotFinishId } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { MAX_LINE_QTY, MAX_LINES, MIN_LINE_QTY, lineKey, shownPlantId, type CartLine } from "@/lib/cart/types";
import { formatMoney } from "@/lib/money";
import { priceCart } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { useCart } from "./CartProvider";
import { useModal } from "./useModal";

export function CartDrawer() {
  const { cart, isOpen, closeCart, checkout, startCheckout, count } = useCart();
  const t = useT("store");
  const locale = useLocale();
  const panel = useRef<HTMLDivElement>(null);
  useModal(isOpen, panel, closeCart);

  const country = getCountry(cart.countryCode);
  const priced = country && cart.lines.length ? priceCart(country, cart.lines, locale) : null;
  const quote = priced?.ok ? priced.quote : null;
  const badLine = priced && !priced.ok ? priced.lineIndex : undefined;
  const money = (n: number) => (country ? formatMoney(n, country.currency, locale) : "");
  const loading = checkout.phase === "loading";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50" key="cart">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl outline-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 id="cart-title" className="text-lg font-semibold tracking-tight">
                  {t("cart.title")}
                  {count > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted">
                      {count === 1 ? t("cart.countOne") : t("cart.count", { n: count })}
                    </span>
                  )}
                </h2>
                {country && cart.lines.length > 0 && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <Truck className="h-3.5 w-3.5" aria-hidden />
                    {t("cart.shipsTo", { country: lt(country.name, locale) })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="-mr-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
                aria-label={t("cart.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {cart.lines.length === 0 || !country ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface-2">
                  <ShoppingBag className="h-7 w-7 text-muted" aria-hidden />
                </div>
                <p className="font-medium">{t("cart.empty.title")}</p>
                <p className="mt-1.5 text-sm text-pretty text-muted">{t("cart.empty.body")}</p>
                <Link href="/#explore" onClick={closeCart} className={buttonVariants({ variant: "secondary", className: "mt-6" })}>
                  {t("cart.empty.cta")}
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5">
                  {cart.lines.map((line, i) => {
                    const pricedLine = quote?.lines.find((l) => l.key === lineKey(line));
                    return (
                      <CartLineRow
                        key={lineKey(line)}
                        line={line}
                        invalid={badLine === i}
                        lineTotal={pricedLine ? money(pricedLine.lineTotal) : null}
                        disabled={loading}
                      />
                    );
                  })}
                </ul>

                <footer className="border-t border-line bg-surface-2/50 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {quote && (
                    <>
                      {quote.freeShippingRemaining !== null && country.shipping.freeOver ? (
                        <div className="mb-4">
                          <p className="text-xs text-muted">
                            {t("cart.freeShippingHint", { amount: money(quote.freeShippingRemaining) })}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                            <motion.div
                              className="h-full rounded-full bg-leaf-400"
                              initial={false}
                              animate={{ width: `${Math.min(100, (quote.subtotal / country.shipping.freeOver) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : quote.shipping === 0 && country.shipping.flatFee > 0 ? (
                        <p className="mb-4 text-xs text-leaf-200">{t("cart.freeShippingUnlocked")}</p>
                      ) : null}
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted">
                          <dt>{t("cart.subtotal")}</dt>
                          <dd className="tabular-nums">{money(quote.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between text-muted">
                          <dt>{t("cart.shipping")}</dt>
                          <dd className="tabular-nums">{quote.shipping === 0 ? t("cart.shippingFree") : money(quote.shipping)}</dd>
                        </div>
                        <div className="flex justify-between pt-1.5 text-base font-semibold">
                          <dt>{t("cart.total")}</dt>
                          <dd className="tabular-nums">{money(quote.total)}</dd>
                        </div>
                      </dl>
                      <p className="mt-1 text-xs text-faint">
                        {t("cart.eta", { min: country.shipping.etaDays[0], max: country.shipping.etaDays[1] })}
                      </p>
                    </>
                  )}

                  {priced && !priced.ok && (
                    <p role="alert" className="mb-3 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">
                      {t("cart.error.invalid")}
                    </p>
                  )}
                  <AnimatePresence initial={false}>
                    {checkout.phase === "error" && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "mt-3 overflow-hidden rounded-xl border px-3 py-2 text-sm",
                          checkout.code === "stripe_not_configured"
                            ? "border-sun/30 bg-sun/10 text-sun"
                            : "border-rose/30 bg-rose/10 text-rose",
                        )}
                      >
                        {checkoutErrorMessage(checkout.code, t)}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    size="lg"
                    className="mt-4 w-full"
                    disabled={!quote || loading}
                    onClick={() => startCheckout()}
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                    {loading ? (checkout.resuming ? t("cart.resuming") : t("cart.checkingOut")) : t("cart.checkout")}
                  </Button>
                  <p className="mt-2.5 text-center text-xs text-faint">{t("cart.secure")}</p>
                </footer>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function checkoutErrorMessage(code: string, t: ReturnType<typeof useT<"store">>) {
  switch (code) {
    case "stripe_not_configured":
      return t("cart.error.stripe_not_configured");
    case "network":
      return t("cart.error.network");
    case "market_not_open":
      return t("cart.error.market_not_open");
    case "cart_full":
      return t("cart.error.full", { lines: MAX_LINES, qty: MAX_LINE_QTY });
    case "invalid_request":
    case "unknown_country":
    case "unknown_pot":
    case "unknown_finish":
    case "unknown_plant":
    case "plant_not_sellable":
    case "plant_size_mismatch":
    case "price_unavailable":
    case "invalid_quantity":
    case "too_many_lines":
    case "empty_cart":
      return t("cart.error.invalid");
    default:
      return t("cart.error.generic");
  }
}

function CartLineRow({
  line,
  invalid,
  lineTotal,
  disabled,
}: {
  line: CartLine;
  invalid: boolean;
  lineTotal: string | null;
  disabled: boolean;
}) {
  const { setQuantity, remove } = useCart();
  const t = useT("store");
  const locale = useLocale();
  const key = lineKey(line);
  const pot = getPotBySku(line.potSku);
  const finish = getFinish(line.finish);
  const plant = getPlant(line.plantId);
  const preview = getPlant(line.previewPlantId);
  const shown = shownPlantId(line);

  return (
    <motion.li layout className="flex gap-4 py-4">
      <div className="relative flex h-24 w-20 shrink-0 items-end justify-center overflow-hidden rounded-xl border border-line bg-[radial-gradient(circle_at_50%_30%,rgb(var(--glow)/0.14),transparent_70%)] px-1.5 pb-1">
        {pot && (
          <PotPreview
            size={pot.size}
            finish={(finish?.id ?? "porcelain") as PotFinishId}
            plantId={shown}
            ringRotating={false}
            lightOn={false}
            className="w-full"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{pot ? lt(pot.name, locale) : line.potSku}</p>
            <p className="text-sm text-muted">
              {finish ? lt(finish.name, locale) : line.finish}
              {pot && <span className="text-faint"> · {pot.size}</span>}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium tabular-nums">{lineTotal}</p>
        </div>
        {plant ? (
          <p className="mt-1 text-sm text-leaf-200">{t("cart.line.livePlant", { plant: lt(plant.name, locale) })}</p>
        ) : preview ? (
          <p className="mt-1 text-xs text-muted">{t("cart.line.companion", { plant: lt(preview.name, locale) })}</p>
        ) : null}
        {invalid && <p className="mt-1 text-xs text-rose">{t("cart.invalidLine")}</p>}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center rounded-xl border border-line bg-surface-2" role="group" aria-label={t("cart.line.quantity")}>
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-l-xl text-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setQuantity(key, line.quantity - 1)}
              disabled={disabled || line.quantity <= MIN_LINE_QTY}
              aria-label={t("cart.line.decrease")}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">
              {line.quantity}
            </span>
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-r-xl text-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setQuantity(key, line.quantity + 1)}
              disabled={disabled || line.quantity >= MAX_LINE_QTY}
              aria-label={t("cart.line.increase")}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => remove(key)}
            disabled={disabled}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-rose disabled:opacity-40"
          >
            <Trash className="h-3.5 w-3.5" aria-hidden />
            {t("cart.line.remove")}
          </button>
        </div>
      </div>
    </motion.li>
  );
}
