"use client";

import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Tween a flat record of numbers towards `target` whenever it changes.
 * Re-renders only while a transition runs. The first render returns the
 * target as-is, so server and client markup match.
 */
export function useTween<T extends Record<string, number>>(target: T, { duration = 0.8, instant = false } = {}): T {
  const [value, setValue] = useState<T>(target);
  const current = useRef<T>(target);
  const key = Object.keys(target)
    .map((k) => `${k}:${target[k]}`)
    .join("|");
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  });

  useEffect(() => {
    const to = targetRef.current;
    const from = current.current;
    const same = Object.keys(to).every((k) => Math.abs((from[k] ?? to[k]) - to[k]) < 1e-6);
    if (same) return;
    if (instant) {
      current.current = to;
      const raf = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(raf);
    }
    const controls = animate(0, 1, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (t) => {
        const next = {} as Record<string, number>;
        for (const k of Object.keys(to)) next[k] = (from[k] ?? to[k]) + (to[k] - (from[k] ?? to[k])) * t;
        current.current = next as T;
        setValue(next as T);
      },
    });
    return () => controls.stop();
  }, [key, duration, instant]);

  return value;
}
