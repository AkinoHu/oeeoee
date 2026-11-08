"use client";

import type { CompanionFaceProps } from "./types";

/**
 * The companion's animated face (the pot's screen).
 * STUB — implemented by the pot-art agent. Keep the props contract stable.
 */
export function CompanionFace({ expression = "neutral", size = 160, className }: CompanionFaceProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size * 0.75 }}
      data-expression={expression}
      aria-label={`companion: ${expression}`}
    >
      <svg viewBox="0 0 160 120" width="100%" height="100%">
        <rect x="0" y="0" width="160" height="120" rx="24" fill="#0b1210" />
        <circle cx="55" cy="55" r="10" fill="#b6f36b" />
        <circle cx="105" cy="55" r="10" fill="#b6f36b" />
        <path d="M60 82 Q80 96 100 82" stroke="#b6f36b" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
