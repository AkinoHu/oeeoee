import { geoProjection, type GeoProjection } from "d3-geo";
import { getDotField } from "./field";

/**
 * A 2D camera over the reference space: reference point (cx, cy) is drawn at
 * screen point (ax, ay) with k screen pixels per reference unit.
 */
export interface View {
  cx: number;
  cy: number;
  k: number;
  ax: number;
  ay: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Projection (must match scripts/map/build-dots.mjs) ─────────────────────
/**
 * Miller cylindrical: north is straight up everywhere, so countries keep the
 * shapes people know from web maps, with less polar inflation than Mercator.
 */
function millerRaw(lambda: number, phi: number): [number, number] {
  return [lambda, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * phi))];
}
millerRaw.invert = (x: number, y: number): [number, number] => [x, 2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI];

/** The map projection at a given reference width (exported for tests). */
export function createMapProjection(width: number): GeoProjection {
  return geoProjection(millerRaw).fitWidth(width, { type: "Sphere" });
}

let projection: GeoProjection | null = null;
let yTop = 0;

function getProjection(): GeoProjection {
  if (!projection) {
    const field = getDotField();
    projection = createMapProjection(field.width);
    yTop = projection([0, field.latTop])![1];
  }
  return projection;
}

/** [lon, lat] → reference units. */
export function lonLatToRef(lonLat: [number, number]): [number, number] {
  const p = getProjection()(lonLat) ?? [0, 0];
  return [p[0], p[1] - yTop];
}

/** Reference units → [lon, lat] (null outside the globe). */
export function refToLonLat(x: number, y: number): [number, number] | null {
  return getProjection().invert?.([x, y + yTop]) ?? null;
}

export function toScreen(v: View, x: number, y: number): [number, number] {
  return [(x - v.cx) * v.k + v.ax, (y - v.cy) * v.k + v.ay];
}

export function toRef(v: View, sx: number, sy: number): [number, number] {
  return [(sx - v.ax) / v.k + v.cx, (sy - v.ay) / v.k + v.cy];
}

// ── Layout ─────────────────────────────────────────────────────────────────
export const DESKTOP_MIN_WIDTH = 1024;

export interface MapLayout {
  width: number;
  height: number;
  desktop: boolean;
  /** Where the whole world is fitted on the first stage. */
  worldArea: Rect;
  /** Free map area on the region / country stages (outside panel / sheet / top bar). */
  focusArea: Rect;
  /** Side panel width (desktop) — 0 on mobile. */
  panelWidth: number;
  /** Bottom sheet height (mobile) — 0 on desktop. */
  sheetHeight: number;
}

/**
 * Pure layout shared by the canvas camera and the overlay UI so both agree.
 * `heroHeight` is the measured height of the hero copy (0 = not measured yet):
 * the world map starts below it, so text never covers land in any language.
 */
export function computeLayout(width: number, height: number, heroHeight = 0): MapLayout {
  const desktop = width >= DESKTOP_MIN_WIDTH;
  if (desktop) {
    const panelWidth = width >= 1280 ? 400 : 360;
    // The hero copy and the companion sit in a band above the map, never over the land;
    // the map may run a little under the region chips (southern ocean).
    const fallback = Math.min(Math.max(height * 0.34, 264), 304);
    const top = Math.round(Math.min(heroHeight > 0 ? heroHeight + 6 : fallback, height - 290));
    return {
      width,
      height,
      desktop,
      worldArea: { x: 0, y: top, w: width, h: Math.max(220, height - top - 70) },
      focusArea: { x: 0, y: 72, w: width - panelWidth - 40, h: height - 72 - 24 },
      panelWidth,
      sheetHeight: 0,
    };
  }
  const fallbackTop = Math.min(Math.max(height * 0.56, 392), 440);
  const bottom = 104;
  const top = Math.round(Math.min(heroHeight > 0 ? heroHeight + 4 : fallbackTop, height - bottom - 150));
  const sheetHeight = Math.round(Math.min(height * 0.5, 420));
  return {
    width,
    height,
    desktop,
    worldArea: { x: 0, y: top, w: width, h: Math.max(140, height - top - bottom) },
    focusArea: { x: 0, y: 60, w: width, h: Math.max(160, height - sheetHeight - 60) },
    panelWidth: 0,
    sheetHeight,
  };
}

// ── Cameras ────────────────────────────────────────────────────────────────
/** Whole-world camera. Narrow screens overscan a little (the Pacific edges crop). */
export function worldView(layout: MapLayout): View {
  const field = getDotField();
  const a = layout.worldArea;
  const overscan = layout.desktop ? 0.96 : 1.2;
  const k = Math.min((a.w * overscan) / field.width, a.h / field.height);
  return {
    cx: field.width / 2 + (layout.desktop ? 0 : 24),
    cy: field.height / 2,
    k,
    ax: a.x + a.w / 2,
    ay: a.y + a.h / 2,
  };
}

/** Scale used as "zoom = 1" for regions: the world fitted to the focus area. */
function baseScale(layout: MapLayout): number {
  const field = getDotField();
  const a = layout.focusArea;
  return Math.max(a.w / field.width, (a.h / field.height) * 0.62);
}

export function regionView(layout: MapLayout, center: [number, number], zoom: number): View {
  const [cx, cy] = lonLatToRef(center);
  const a = layout.focusArea;
  const boost = layout.desktop ? 1 : 1.25;
  return { cx, cy, k: baseScale(layout) * zoom * boost, ax: a.x + a.w / 2, ay: a.y + a.h / 2 };
}

/**
 * Country camera: centre on the market and zoom in further for small
 * countries (size estimated from the number of land dots).
 */
export function countryView(
  layout: MapLayout,
  center: [number, number],
  dotCount: number,
  regionCamera: View,
): View {
  const field = getDotField();
  const [cx, cy] = lonLatToRef(center);
  const a = layout.focusArea;
  const size = Math.max(4, Math.sqrt(Math.max(1, dotCount)) * field.spacing);
  const fit = (Math.min(a.w, a.h) * 0.42) / size;
  const k = Math.min(Math.max(fit, regionCamera.k), regionCamera.k * 1.7);
  return { cx, cy, k, ax: a.x + a.w / 2, ay: a.y + a.h / 2 };
}
