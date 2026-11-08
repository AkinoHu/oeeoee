/**
 * ════════════════════════════════════════════════════════════════════════
 *  MAP COMPLIANCE SETTING — to be reviewed by the founders before launch.
 * ════════════════════════════════════════════════════════════════════════
 *
 * oeeoee launches first in mainland China, where published maps are subject
 * to national map-review rules (审图号). The landing map therefore draws no
 * border lines at all, only land dots, and groups world-atlas features into
 * markets with this table.
 *
 * Each entry maps a market's ISO alpha-2 code to the world-atlas features
 * (ISO 3166-1 numeric ids) that are highlighted, hit-tested and selected
 * together as that ONE market:
 *
 *   CN → 156 + 158 + 344 + 446   (decided by the founders, 2026-11-08)
 *        Taiwan (158), Hong Kong (344) and Macao (446) are part of China on
 *        the map: highlighted, hit-tested and selected together with 156.
 *        They are never labelled or offered as markets of their own (a
 *        catalog entry with one of these isoNumeric ids is ignored), and a
 *        visitor located there is treated as being in China.
 *
 * Still open: the source data (Natural Earth, de-facto boundaries) draws some
 * disputed areas differently from official Chinese maps; a formal map review
 * (审图号) is still required for a mainland deployment.
 *
 * Markets not listed here use their own `isoNumeric` feature only.
 */
export const MARKET_FEATURE_GROUPS: Readonly<Record<string, readonly string[]>> = {
  CN: ["156", "158", "344", "446"],
};

/** Feature ids (ISO numeric) that belong to another market's group. */
export const ABSORBED_FEATURE_IDS: ReadonlySet<string> = new Set(
  Object.values(MARKET_FEATURE_GROUPS).flatMap((ids) => ids.slice(1)),
);

/** All world-atlas feature ids that render as part of a market. */
export function marketFeatureIds(code: string, isoNumeric: string): string[] {
  const group = MARKET_FEATURE_GROUPS[code.toUpperCase()];
  if (!group) return [isoNumeric];
  return group.includes(isoNumeric) ? [...group] : [isoNumeric, ...group];
}

/** True when a feature may never be a market, label or location of its own. */
export function isAbsorbedFeature(isoNumeric: string): boolean {
  return ABSORBED_FEATURE_IDS.has(isoNumeric);
}

/** The market whose group absorbs this feature (e.g. "344" → "CN"), or null. */
export function absorbingMarket(isoNumeric: string): string | null {
  for (const [code, ids] of Object.entries(MARKET_FEATURE_GROUPS)) {
    if (ids.indexOf(isoNumeric) > 0) return code;
  }
  return null;
}

/**
 * Anchor points of the grouped territories, for visitors the atlas can't place:
 * Macao is missing from the 110m atlas and its 50m outline misses the city.
 */
const ABSORBED_ANCHORS: readonly { id: string; lonLat: [number, number] }[] = [
  { id: "158", lonLat: [121.0, 23.7] },
  { id: "344", lonLat: [114.17, 22.32] },
  { id: "446", lonLat: [113.55, 22.17] },
];

/** Market of a grouped territory within `radiusKm` of [lon, lat] (e.g. Macao → "CN"), else null. */
export function absorbedNear(lonLat: [number, number], radiusKm = 50): string | null {
  for (const a of ABSORBED_ANCHORS) {
    if (greatCircleKm(lonLat, a.lonLat) <= radiusKm) return absorbingMarket(a.id);
  }
  return null;
}

function greatCircleKm(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
