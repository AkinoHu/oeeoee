/**
 * Tiny vector toolkit for the plant illustrations.
 *
 * Every number that ends up in markup goes through `n()` (2 decimals) so the
 * server and the browser always print identical strings (no hydration drift
 * from last-bit differences in Math.sin/cos between engines).
 */

export type Pt = readonly [number, number];

/** Round to 2 decimals for stable, compact SVG output. */
export function n(v: number): number {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

export function pt(p: Pt): string {
  return `${n(p[0])} ${n(p[1])}`;
}

export const DEG = Math.PI / 180;

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Point on a cubic Bézier. */
export function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** Tangent (derivative) of a cubic Bézier. */
export function cubicTan(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return [
    a * (p1[0] - p0[0]) + b * (p2[0] - p1[0]) + c * (p3[0] - p2[0]),
    a * (p1[1] - p0[1]) + b * (p2[1] - p1[1]) + c * (p3[1] - p2[1]),
  ];
}

/** Angle in degrees of a direction vector (SVG coords, y down). */
export function angleOf(v: Pt): number {
  return Math.atan2(v[1], v[0]) / DEG;
}

/**
 * SVG `rotate()` that makes a shape drawn pointing "up" (towards -y) point
 * along `dirDeg` (atan2 angle in degrees).
 */
export function rotFor(dirDeg: number): number {
  return dirDeg + 90;
}

/** A unit direction from an "up = 0°, clockwise positive" angle. */
export function dirFromUp(deg: number): Pt {
  return [Math.sin(deg * DEG), -Math.cos(deg * DEG)];
}

/** Smooth closed/open path through points (Catmull-Rom → cubic Bézier). */
export function smoothThrough(points: Pt[], startWithMove = true): string {
  if (points.length < 2) return "";
  let d = startWithMove ? `M${pt(points[0])}` : `L${pt(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

/**
 * A tapered ribbon (blade, stem, strap leaf) around a cubic centre line.
 * `halfWidth(t)` gives the half width along the curve (t: 0 base → 1 tip).
 */
export function ribbon(
  p0: Pt,
  p1: Pt,
  p2: Pt,
  p3: Pt,
  halfWidth: (t: number) => number,
  steps = 14,
): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = cubic(p0, p1, p2, p3, t);
    const tan = cubicTan(p0, p1, p2, p3, t);
    const len = Math.hypot(tan[0], tan[1]) || 1;
    const nx = -tan[1] / len;
    const ny = tan[0] / len;
    const w = halfWidth(t);
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  }
  right.reverse();
  return `${smoothThrough(left)} ${smoothThrough(right, false)} Z`;
}

/** Linear taper: w0 at the base to w1 at the tip. */
export const taper = (w0: number, w1: number) => (t: number) => lerp(w0, w1, t) / 2;

/** Blade profile: grows quickly from the base, holds, then narrows to a point. */
export const blade =
  (width: number, { hold = 0.55, base = 0.7 }: { hold?: number; base?: number } = {}) =>
  (t: number) => {
    const grow = lerp(base, 1, smoothstep(0, 0.18, t));
    const point = 1 - smoothstep(hold, 1, t);
    return (width / 2) * grow * Math.pow(point, 0.75);
  };

export interface LeafShape {
  /** Full outline. */
  d: string;
  /** Right half (for the folded-leaf shading). */
  half: string;
  /** Left half (for sheen). */
  halfL: string;
  /** Midrib line. */
  rib: string;
  /** Half-width at a fraction (0 base → 1 tip) of the length — approximate. */
  widthAt: (f: number) => number;
}

export interface LeafOpts {
  /** Position of the widest point along the leaf (0..1). */
  p?: number;
  base?: "wedge" | "round" | "heart";
  tip?: "acute" | "acuminate" | "round";
  /** Midrib bend (positive bends to the right). */
  bend?: number;
}

/**
 * A symmetric leaf pointing up (towards -y) with its petiole attachment at
 * the origin. Returns outline + shading helpers.
 */
export function leafShape(L: number, W: number, opts: LeafOpts = {}): LeafShape {
  const { p = 0.45, base = "wedge", tip = "acute", bend = 0 } = opts;
  const hw = W / 2;
  const yw = -L * p;
  const rest = L - L * p;
  let start: Pt = [0, 0];
  let c1: Pt;
  let c2: Pt;
  if (base === "heart") {
    start = [0, -L * 0.1];
    c1 = [hw * 0.55, L * 0.14];
    c2 = [hw * 1.1, -L * p * 0.2];
  } else if (base === "round") {
    c1 = [hw * 0.72, L * 0.03];
    c2 = [hw, -L * p * 0.42];
  } else {
    c1 = [hw * 0.22, -L * 0.05];
    c2 = [hw, -L * p * 0.55];
  }
  let c3: Pt;
  let c4: Pt;
  if (tip === "round") {
    c3 = [hw, yw - rest * 0.55];
    c4 = [hw * 0.55, -L];
  } else if (tip === "acuminate") {
    c3 = [hw * 0.98, yw - rest * 0.42];
    c4 = [hw * 0.14, -L * 0.84];
  } else {
    c3 = [hw, yw - rest * 0.5];
    c4 = [hw * 0.32, -L * 0.94];
  }
  const P1: Pt = [hw, yw];
  const T: Pt = [bend, -L];
  const m = (q: Pt): Pt => [-q[0], q[1]];
  const sh = (q: Pt, f: number): Pt => [q[0] + bend * f, q[1]];
  // Bend: shift upper control points sideways proportionally to height.
  const R = { c1, c2: sh(c2, p * 0.5), P1: sh(P1, p * 0.6), c3: sh(c3, 0.8), c4: sh(c4, 0.95) };
  const Lf = {
    c1: m(c1),
    c2: sh(m(c2), p * 0.5),
    P1: sh(m(P1), p * 0.6),
    c3: sh(m(c3), 0.8),
    c4: sh(m(c4), 0.95),
  };
  const ribCtrl: Pt = [bend * 0.55, -L * 0.5];
  const d =
    `M${pt(start)} C${pt(R.c1)} ${pt(R.c2)} ${pt(R.P1)} C${pt(R.c3)} ${pt(R.c4)} ${pt(T)} ` +
    `C${pt(Lf.c4)} ${pt(Lf.c3)} ${pt(Lf.P1)} C${pt(Lf.c2)} ${pt(Lf.c1)} ${pt(start)}Z`;
  const half =
    `M${pt(start)} C${pt(R.c1)} ${pt(R.c2)} ${pt(R.P1)} C${pt(R.c3)} ${pt(R.c4)} ${pt(T)} ` +
    `Q${pt(ribCtrl)} ${pt(start)}Z`;
  const halfL =
    `M${pt(start)} C${pt(Lf.c1)} ${pt(Lf.c2)} ${pt(Lf.P1)} C${pt(Lf.c3)} ${pt(Lf.c4)} ${pt(T)} ` +
    `Q${pt(ribCtrl)} ${pt(start)}Z`;
  const rib = `M${pt(start)} Q${pt(ribCtrl)} ${pt([T[0], T[1] + L * 0.04])}`;
  const widthAt = (f: number) => {
    if (f <= p) return hw * Math.sin((Math.PI / 2) * Math.min(1, (f / p) * (base === "wedge" ? 0.9 : 1.15)));
    return hw * Math.cos((Math.PI / 2) * ((f - p) / (1 - p)));
  };
  return { d, half, halfL, rib, widthAt };
}

/** SVG transform for placing a shape drawn at the origin. */
export function place(x: number, y: number, rot = 0, s = 1): string {
  const parts = [`translate(${n(x)} ${n(y)})`];
  if (rot) parts.push(`rotate(${n(rot)})`);
  if (s !== 1) parts.push(`scale(${n(s)})`);
  return parts.join(" ");
}

/** Deterministic pseudo-random sequence (mulberry32) — never use Math.random in render. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
