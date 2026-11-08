/** Facial expressions the AI companion can show on the pot's screen. */
export const EXPRESSIONS = [
  "neutral",
  "happy",
  "excited",
  "curious",
  "focused",
  "sleepy",
  "thirsty",
  "concerned",
  "sad",
  "love",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export function isExpression(value: unknown): value is Expression {
  return typeof value === "string" && (EXPRESSIONS as readonly string[]).includes(value);
}

export interface CompanionFaceProps {
  expression?: Expression;
  /** Animate the mouth as if speaking. */
  talking?: boolean;
  /** Rendered width in px (the face keeps a ~4:3 screen aspect). Defaults to 160. */
  size?: number;
  className?: string;
}
