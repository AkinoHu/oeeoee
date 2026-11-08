import { describe, expect, it } from "vitest";
import type { Country, Region } from "@/data";
import { countByStatus, countryName, countryOptions, groupMarketsByRegion } from "./markets";

const region = (id: Region["id"], en: string): Region => ({ id, name: { en, zh: en, ja: en }, center: [0, 0], zoom: 1 });
const country = (code: string, en: string, regionId: Region["id"], partnerStatus: Country["partnerStatus"]): Country => ({
  code,
  isoNumeric: "000",
  name: { en, zh: en, ja: en },
  region: regionId,
  salesMode: "pot_only",
  currency: "usd",
  climates: ["temperate"],
  hemisphere: "north",
  center: [0, 0],
  plantOffers: {},
  localPlantIds: [],
  partnerStatus,
  shipping: { flatFee: 0, etaDays: [1, 2] },
});

const regions = [region("east-asia", "East Asia"), region("europe", "Europe"), region("africa", "Africa")];
const countries = [
  country("JP", "Japan", "east-asia", "recruiting"),
  country("CN", "China", "east-asia", "live"),
  country("KR", "South Korea", "east-asia", "planned"),
  country("FR", "France", "europe", "planned"),
  country("DE", "Germany", "europe", "recruiting"),
  country("AT", "Austria", "europe", "recruiting"),
];

describe("groupMarketsByRegion", () => {
  it("keeps region order, drops empty regions and sorts by status then name", () => {
    const groups = groupMarketsByRegion(countries, regions, "en");
    expect(groups.map((g) => g.region.id)).toEqual(["east-asia", "europe"]);
    expect(groups[0].countries.map((c) => c.code)).toEqual(["JP", "KR", "CN"]);
    expect(groups[1].countries.map((c) => c.code)).toEqual(["AT", "DE", "FR"]);
    expect(groups[1].counts).toEqual({ recruiting: 2, planned: 1, live: 0 });
  });
});

describe("countByStatus", () => {
  it("counts every status", () => {
    expect(countByStatus(countries)).toEqual({ recruiting: 3, planned: 2, live: 1 });
  });
});

describe("countryOptions", () => {
  it("groups options by region and sorts names", () => {
    const groups = countryOptions(countries, regions, "en");
    expect(groups).toEqual([
      {
        label: "East Asia",
        options: [
          { code: "CN", name: "China" },
          { code: "JP", name: "Japan" },
          { code: "KR", name: "South Korea" },
        ],
      },
      {
        label: "Europe",
        options: [
          { code: "AT", name: "Austria" },
          { code: "FR", name: "France" },
          { code: "DE", name: "Germany" },
        ],
      },
    ]);
  });
});

describe("countryName", () => {
  it("uses the catalog name when known", () => {
    expect(countryName("jp", "ja")).toBe("日本");
  });
  it("falls back to Intl region names, then the code", () => {
    expect(countryName("NL", "en")).toBe("Netherlands");
    expect(countryName("", "en")).toBe("");
  });
});
