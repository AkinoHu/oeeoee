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
 *   CN → 156 + 158  Feature 158 is always highlighted with the China market.
 *                   It is never labelled on its own, never offered as a
 *                   location ("Looks like you're in …"), and can never be a
 *                   separate selectable market — a catalog entry with
 *                   isoNumeric "158" is ignored by the map.
 *
 * Other candidates the founders may want to review (currently NOT grouped):
 *   - 344 (Hong Kong) and 446 (Macao) are separate features in world-atlas.
 *   - The source data (Natural Earth, de-facto boundaries) draws some
 *     disputed areas differently from official Chinese maps; a formal map
 *     review is still required for a mainland deployment.
 *
 * Markets not listed here use their own `isoNumeric` feature only.
 */
export const MARKET_FEATURE_GROUPS: Readonly<Record<string, readonly string[]>> = {
  CN: ["156", "158"],
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
