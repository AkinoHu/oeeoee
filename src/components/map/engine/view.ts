import { geoEqualEarth, type GeoProjection } from "d3-geo";
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
let projection: GeoProjection | null = null;
let yTop = 0;

function getProjection(): GeoProjection {
  if (!projection) {
    const field = getDotField();
    projection = geoEqualEarth().fitWidth(field.width, { type: "Sphere" });
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

/** Pure layout shared by the canvas camera and the overlay UI so both agree. */
export function computeLayout(width: number, height: number): MapLayout {
  const desktop = width >= DESKTOP_MIN_WIDTH;
  if (desktop) {
    const panelWidth = width >= 1280 ? 400 : 360;
    // The hero copy sits in a band above the map; the map may run under the chips (southern ocean).
    const top = Math.round(Math.min(Math.max(height * 0.25, 180), 280));
    return {
      width,
      height,
      desktop,
      worldArea: { x: 0, y: top, w: width, h: Math.max(220, height - top - 84) },
      focusArea: { x: 0, y: 72, w: width - panelWidth - 40, h: height - 72 - 24 },
      panelWidth,
      sheetHeight: 0,
    };
  }
  const top = Math.round(Math.min(Math.max(height * 0.42, 260), 360));
  const bottom = 156;
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
  const overscan = layout.desktop ? 0.95 : 1.28;
  const k = Math.min((a.w * overscan) / field.width, a.h / field.height);
  // Desktop: nudge the world right, away from the hero copy on the left.
  const shift = layout.desktop ? Math.min(a.w * 0.04, Math.max(0, (a.w - field.width * k) / 2)) : 0;
  return {
    cx: field.width / 2 + (layout.desktop ? 0 : 30),
    cy: field.height / 2,
    k,
    ax: a.x + a.w / 2 + shift,
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
