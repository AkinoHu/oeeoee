import type { Expression } from "./types";

/**
 * Parametric description of every expression. The face is drawn in a
 * 160×120 screen; eyes are glowing pills shaped by "lids" (masks), so any
 * expression can morph smoothly into any other by tweening these numbers.
 */

export const FACE_W = 160;
export const FACE_H = 120;
export const EYE_Y = 52;
export const EYE_L_X = 55;
export const EYE_R_X = 105;

export interface EyeSpec {
  dx: number;
  dy: number;
  w: number;
  h: number;
  r: number;
  /** Top-lid coverage 0..1 of the eye height. */
  lid: number;
  /** Top-lid tilt in degrees; positive lowers the outer corner (sad/droopy), negative the inner (determined). */
  lidAng: number;
  /** Bottom "smile" lid coverage 0..1 (happy ^ ^ eyes). */
  low: number;
}

export type P = readonly [number, number];

/** Closed mouth path: corners l/r, upper curve controls u1/u2, lower curve controls d1/d2 (r → l). */
export interface MouthSpec {
  l: P;
  r: P;
  u1: P;
  u2: P;
  d1: P;
  d2: P;
}

export type Extra = "none" | "sparkles" | "zzz" | "drop" | "sweat" | "tear" | "question" | "hearts";

export interface BrowSpec {
  /** Opacity per side. */
  oL: number;
  oR: number;
  /** Positive raises the inner ends (worried), negative lowers them (determined). */
  tilt: number;
  /** Extra lift above the eye, per side. */
  liftL: number;
  liftR: number;
}

export interface FaceSpec {
  L: EyeSpec;
  R: EyeSpec;
  /** Head tilt in degrees. */
  tilt: number;
  glint: number;
  mouth: MouthSpec;
  brows: BrowSpec;
  hearts: boolean;
  blush: number;
  extra: Extra;
  /** Idle behaviours allowed in this mood. */
  blink: boolean;
  look: boolean;
}

const eye = (o: Partial<EyeSpec> = {}): EyeSpec => ({
  dx: 0,
  dy: 0,
  w: 26,
  h: 34,
  r: 13,
  lid: 0,
  lidAng: 0,
  low: 0,
  ...o,
});

/** A closed-line mouth (zero area) — renders as a rounded stroke. */
const line = (l: P, u1: P, u2: P, r: P): MouthSpec => ({ l, r, u1, u2, d1: u2, d2: u1 });
const open = (l: P, u1: P, u2: P, r: P, d1: P, d2: P): MouthSpec => ({ l, r, u1, u2, d1, d2 });

const NO_BROWS: BrowSpec = { oL: 0, oR: 0, tilt: 0, liftL: 0, liftR: 0 };

const base: Omit<FaceSpec, "L" | "R" | "mouth"> = {
  tilt: 0,
  glint: 1,
  brows: NO_BROWS,
  hearts: false,
  blush: 0,
  extra: "none",
  blink: true,
  look: false,
};

export const FACES: Record<Expression, FaceSpec> = {
  neutral: {
    ...base,
    L: eye(),
    R: eye(),
    mouth: line([72, 84], [75.5, 88.5], [84.5, 88.5], [88, 84]),
    look: true,
  },
  happy: {
    ...base,
    L: eye({ w: 30, h: 30, r: 15, low: 0.52, dy: -2 }),
    R: eye({ w: 30, h: 30, r: 15, low: 0.52, dy: -2 }),
    glint: 0,
    blush: 0.5,
    mouth: open([67, 81], [73, 84.5], [87, 84.5], [93, 81], [88, 95], [72, 95]),
  },
  excited: {
    ...base,
    L: eye({ w: 32, h: 42, r: 16, dy: -4 }),
    R: eye({ w: 32, h: 42, r: 16, dy: -4 }),
    blush: 0.35,
    extra: "sparkles",
    mouth: open([65, 80], [72, 81], [88, 81], [95, 80], [90, 100], [70, 100]),
  },
  curious: {
    ...base,
    L: eye({ w: 23, h: 29, r: 11.5, dx: 3, dy: 2 }),
    R: eye({ w: 29, h: 40, r: 14.5, dx: 3, dy: -2 }),
    tilt: 7,
    brows: { oL: 0, oR: 1, tilt: 0, liftL: 0, liftR: 5 },
    extra: "question",
    mouth: open([83, 86], [84.5, 80.5], [91.5, 80.5], [93, 86], [91.5, 91.5], [84.5, 91.5]),
    look: true,
  },
  focused: {
    ...base,
    L: eye({ w: 29, h: 26, r: 10, lid: 0.2, lidAng: -4 }),
    R: eye({ w: 29, h: 26, r: 10, lid: 0.2, lidAng: -4 }),
    glint: 0.6,
    brows: { oL: 0.9, oR: 0.9, tilt: -1.2, liftL: 1, liftR: 1 },
    mouth: line([72, 86], [77, 86], [83, 86], [88, 86]),
  },
  sleepy: {
    ...base,
    L: eye({ w: 28, h: 30, r: 14, lid: 0.8, dy: 5 }),
    R: eye({ w: 28, h: 30, r: 14, lid: 0.8, dy: 5 }),
    glint: 0,
    extra: "zzz",
    blink: false,
    mouth: open([75.5, 88], [76.5, 85], [83.5, 85], [84.5, 88], [83.5, 92.5], [76.5, 92.5]),
  },
  thirsty: {
    ...base,
    L: eye({ w: 27, h: 30, r: 13, lid: 0.46, lidAng: 12, dy: 4 }),
    R: eye({ w: 27, h: 30, r: 13, lid: 0.46, lidAng: 12, dy: 4 }),
    glint: 0.7,
    extra: "drop",
    mouth: open([72, 88], [75, 86], [85, 86], [88, 88], [85.5, 96], [74.5, 96]),
  },
  concerned: {
    ...base,
    L: eye({ w: 25, h: 31, r: 12, lid: 0.12, lidAng: 16, dx: -3 }),
    R: eye({ w: 25, h: 31, r: 12, lid: 0.12, lidAng: 16, dx: -3 }),
    brows: { oL: 1, oR: 1, tilt: 5, liftL: 1, liftR: 1 },
    extra: "sweat",
    mouth: line([70, 87], [75, 82], [85, 92], [90, 87]),
  },
  sad: {
    ...base,
    L: eye({ w: 26, h: 28, r: 13, lid: 0.3, lidAng: 22, dy: 6 }),
    R: eye({ w: 26, h: 28, r: 13, lid: 0.3, lidAng: 22, dy: 6 }),
    glint: 0.85,
    brows: { oL: 1, oR: 1, tilt: 6, liftL: 2, liftR: 2 },
    extra: "tear",
    mouth: line([70, 92], [74, 84], [86, 84], [90, 92]),
  },
  love: {
    ...base,
    L: eye({ w: 10, h: 10, r: 5 }),
    R: eye({ w: 10, h: 10, r: 5 }),
    hearts: true,
    glint: 0,
    blush: 0.6,
    extra: "hearts",
    blink: false,
    mouth: line([70, 83], [74, 90.5], [86, 90.5], [90, 83]),
  },
};
