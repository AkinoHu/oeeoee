"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

const CLEARED_KEY = "oeeoee.cart.clearedFor";
const REMEMBER = 20;

function clearedCheckouts(): string[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(CLEARED_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Empties the cart once the browser has it loaded (used on the order success page).
 * Clears at most once per checkout: revisiting an old success page (history, bookmark)
 * must not wipe a cart the shopper has filled since.
 */
export function ClearCartOnMount({ checkoutId }: { checkoutId: string }) {
  const { hydrated, clear } = useCart();
  useEffect(() => {
    if (!hydrated) return;
    const seen = clearedCheckouts();
    if (seen.includes(checkoutId)) return;
    try {
      window.localStorage.setItem(CLEARED_KEY, JSON.stringify([checkoutId, ...seen].slice(0, REMEMBER)));
    } catch {
      // Storage blocked: the cart only lives in memory, so clearing it each time is fine.
    }
    clear();
  }, [hydrated, clear, checkoutId]);
  return null;
}
