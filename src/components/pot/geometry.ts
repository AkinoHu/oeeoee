import type { PotSize } from "@/data/types";

/**
 * Layout of the pot illustration in a 300×400 viewBox. Everything is derived
 * from a handful of numbers so S/M/L (and the transitions between them) stay
 * consistent.
 */

export const VB_W = 300;
export const VB_H = 400;
export const CX = 150;
export const GROUND = 378;
export const PLINTH = 7;
/** Ellipse ratio for every horizontal circle (camera slightly above). */
export const ELL = 0.2;
/** Angle where the ring carriage parks (front-left), radians. */
export const PARK = Math.PI * 0.74;

/**
 * Body proportions follow the catalog dims (S 12×24, M 16×30, L 24×42 cm):
 * the small pot is slender, the large one broad, and the whole product grows.
 */
export const POT_SIZES: Record<PotSize, { w: number; h: number; plant: number }> = {
  S: { w: 100, h: 122, plant: 0.72 },
  M: { w: 124, h: 136, plant: 0.84 },
  L: { w: 152, h: 148, plant: 0.94 },
};

export interface PotParams {
  w: number;
  h: number;
  plantScale: number;
  ringY: number;
  ringR: number;
}

export const r2 = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};

export function potLayout(p: PotParams) {
  const u = p.w / 122;
  const a = p.w / 2;
  const b = p.w * 0.45;
  const B = GROUND - PLINTH;
  const T = B - p.h;
  const k = p.w * 0.12;
  const ryT = a * ELL;
  const ryB = b * ELL;
  const rimW = p.w * 0.045;
  const openA = a - rimW;
  const openY = T + 0.6;
  const soilY = openY + 4 * u;
  const widthAt = (y: number) => a + (b - a) * ((y - T) / (B - T));

  // Body front face: tapered cylinder with softly rounded bottom corners.
  const ca = Math.cos(0.62);
  const sa = Math.sin(0.62);
  const body =
    `M${r2(CX - a)} ${r2(T)} L${r2(CX - b)} ${r2(B - k)} ` +
    `Q${r2(CX - b)} ${r2(B + ryB * 0.15)} ${r2(CX - b * ca)} ${r2(B + ryB * sa)} ` +
    `A${r2(b)} ${r2(ryB)} 0 0 0 ${r2(CX + b * ca)} ${r2(B + ryB * sa)} ` +
    `Q${r2(CX + b)} ${r2(B + ryB * 0.15)} ${r2(CX + b)} ${r2(B - k)} ` +
    `L${r2(CX + a)} ${r2(T)} A${r2(a)} ${r2(ryT)} 0 0 1 ${r2(CX - a)} ${r2(T)}Z`;

  const collarH = 9 * u;
  const ac = widthAt(T + collarH);
  const collar =
    `M${r2(CX - a)} ${r2(T)} L${r2(CX - ac)} ${r2(T + collarH)} ` +
    `A${r2(ac)} ${r2(ac * ELL)} 0 0 0 ${r2(CX + ac)} ${r2(T + collarH)} ` +
    `L${r2(CX + a)} ${r2(T)} A${r2(a)} ${r2(ryT)} 0 0 1 ${r2(CX - a)} ${r2(T)}Z`;
  const groove = `M${r2(CX - ac)} ${r2(T + collarH)} A${r2(ac)} ${r2(ac * ELL)} 0 0 0 ${r2(CX + ac)} ${r2(T + collarH)}`;

  const pa = b * 0.93;
  const plinth =
    `M${r2(CX - pa)} ${r2(B - 2)} L${r2(CX - pa)} ${r2(GROUND - pa * ELL * 0.2)} ` +
    `A${r2(pa)} ${r2(pa * ELL)} 0 0 0 ${r2(CX + pa)} ${r2(GROUND - pa * ELL * 0.2)} L${r2(CX + pa)} ${r2(B - 2)}Z`;

  // Screen (4:3), centred on the upper front.
  const sw = p.w * 0.5;
  const sh = sw * 0.75;
  const sx = CX - sw / 2;
  const sy = T + collarH + 9 * u + p.h * 0.02;

  // Water window (right side).
  const ww = Math.max(6.5, p.w * 0.072);
  const wy = sy + sh + 14 * u;
  const wh = B - k - 6 * u - wy;
  const wx = CX + widthAt(wy + wh / 2) * 0.56 - ww / 2;

  // Soil probe (front-right of the soil).
  const probeX = CX + openA * 0.5;
  const probeBase = soilY + openA * ELL * 0.45;
  const probeTop = probeBase - 17 * u;

  return {
    u,
    a,
    b,
    T,
    B,
    ryT,
    ryB,
    rimW,
    openA,
    openY,
    soilY,
    body,
    collar,
    collarH,
    groove,
    plinth,
    pa,
    screen: { x: sx, y: sy, w: sw, h: sh },
    water: { x: wx, y: wy, w: ww, h: wh },
    probe: { x: probeX, base: probeBase, top: probeTop },
    ring: { cx: CX, cy: p.ringY, R: p.ringR, r: p.ringR * ELL },
  };
}

export type PotLayout = ReturnType<typeof potLayout>;

/** Elliptical arc between parametric angles t1 < t2 (radians). */
export function arcD(cx: number, cy: number, R: number, r: number, t1: number, t2: number) {
  const x1 = cx + R * Math.cos(t1);
  const y1 = cy + r * Math.sin(t1);
  const x2 = cx + R * Math.cos(t2);
  const y2 = cy + r * Math.sin(t2);
  const large = t2 - t1 > Math.PI ? 1 : 0;
  return `M${r2(x1)} ${r2(y1)} A${r2(R)} ${r2(r)} 0 ${large} 1 ${r2(x2)} ${r2(y2)}`;
}

/** Point on the ring ellipse. */
export function ringPoint(ring: PotLayout["ring"], t: number, radial = 1): [number, number] {
  return [ring.cx + ring.R * radial * Math.cos(t), ring.cy + ring.r * radial * Math.sin(t)];
}
