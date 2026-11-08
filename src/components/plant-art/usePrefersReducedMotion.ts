"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => (typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches);
const getServerSnapshot = () => false;

/**
 * prefers-reduced-motion that is safe for SSR: the server and the hydration
 * pass both see `false`, then React re-renders with the real value. (motion's
 * own `useReducedMotion` reads the media query during the first client render,
 * which makes markup that depends on it mismatch.)
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
