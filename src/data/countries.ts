import type { Country } from "./types";

/**
 * Markets. SEED DATA — the catalog agent expands this list.
 * Owner: catalog agent.
 *
 * Launch plan:
 *  - CN: full (pot + plants, we ship both)
 *  - US, JP, …: pot_only (local plant partners being recruited)
 *  - everything else: coming_soon (waitlist)
 */
export const COUNTRIES: Country[] = [
  {
    code: "CN",
    isoNumeric: "156",
    name: { en: "China (Mainland)", zh: "中国大陆", ja: "中国本土" },
    region: "east-asia",
    salesMode: "full",
    currency: "cny",
    climates: ["subtropical", "continental", "temperate", "arid"],
    hemisphere: "north",
    center: [104, 35],
    plantOffers: { pothos: 3900, "snake-plant": 5900, monstera: 12900 },
    localPlantIds: ["pothos", "snake-plant", "monstera"],
    partnerStatus: "live",
    shipping: { flatFee: 0, etaDays: [2, 5] },
  },
  {
    code: "US",
    isoNumeric: "840",
    name: { en: "United States", zh: "美国", ja: "アメリカ" },
    region: "north-america",
    salesMode: "pot_only",
    currency: "usd",
    climates: ["temperate", "continental", "subtropical", "arid", "mediterranean"],
    hemisphere: "north",
    center: [-98, 39],
    plantOffers: {},
    localPlantIds: ["pothos", "snake-plant", "monstera"],
    partnerStatus: "recruiting",
    shipping: { flatFee: 1500, freeOver: 15000, etaDays: [5, 10] },
  },
  {
    code: "JP",
    isoNumeric: "392",
    name: { en: "Japan", zh: "日本", ja: "日本" },
    region: "east-asia",
    salesMode: "pot_only",
    currency: "jpy",
    climates: ["temperate", "subtropical"],
    hemisphere: "north",
    center: [138, 37],
    plantOffers: {},
    localPlantIds: ["pothos", "snake-plant", "monstera"],
    partnerStatus: "recruiting",
    shipping: { flatFee: 1500, freeOver: 20000, etaDays: [4, 8] },
  },
];
