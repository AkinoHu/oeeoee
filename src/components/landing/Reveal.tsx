"use client";

import { motion, MotionConfig } from "motion/react";

/**
 * Fades + lifts its children in when scrolled into view (once).
 * With reduced motion the lift is dropped and only the fade remains.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li";
}) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <MotionConfig reducedMotion="user">
      <Tag
        className={className}
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -12% 0px" }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </Tag>
    </MotionConfig>
  );
}
