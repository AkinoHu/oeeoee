/** Minimal colour helpers for the pot illustration (hex in, hex out). */

export type RGB = readonly [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const v = parseInt(full.slice(0, 6), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix a → b by t (0..1). */
export function mix(a: string | RGB, b: string | RGB, t: number): string {
  const A = typeof a === "string" ? hexToRgb(a) : a;
  const B = typeof b === "string" ? hexToRgb(b) : b;
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Relative luminance (0..1), good enough to pick highlight strength. */
export function luminance(c: string | RGB): number {
  const [r, g, b] = typeof c === "string" ? hexToRgb(c) : c;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
