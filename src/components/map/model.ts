import { listCountries, listRegions, lt, type SalesMode } from "@/data";
import type { Locale } from "@/i18n/config";
import { isAbsorbedFeature, marketFeatureIds } from "./compliance";
import type { MapMarket, MapModel } from "./types";

const MODE_ORDER: Record<SalesMode, number> = { full: 0, pot_only: 1, coming_soon: 2 };

/**
 * Builds the slim, localized catalog view passed from the server page to the
 * client map (keeps the full catalog out of the client bundle).
 */
export function buildMapModel(locale: Locale): MapModel {
  const regions = listRegions().map((r) => ({
    id: r.id,
    name: lt(r.name, locale),
    center: r.center,
    zoom: r.zoom,
  }));

  const markets: MapMarket[] = listCountries()
    // Compliance: a feature absorbed into another market's group is never a market itself.
    .filter((c) => !isAbsorbedFeature(c.isoNumeric))
    .map((c) => ({
      code: c.code.toUpperCase(),
      isoNumeric: c.isoNumeric,
      featureIds: marketFeatureIds(c.code, c.isoNumeric),
      name: lt(c.name, locale),
      region: c.region,
      salesMode: c.salesMode,
      center: c.center,
      eta: c.salesMode === "coming_soon" ? null : c.shipping.etaDays,
    }))
    .sort((a, b) => MODE_ORDER[a.salesMode] - MODE_ORDER[b.salesMode] || a.name.localeCompare(b.name, locale));

  return { regions, markets };
}
