"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** Empties the cart once the browser has it loaded (used on the order success page). */
export function ClearCartOnMount() {
  const { hydrated, clear } = useCart();
  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);
  return null;
}
