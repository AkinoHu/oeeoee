import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoEqualEarth } from "d3-geo";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import {
  countriesBySalesMode,
  getCountry,
  getCountryByNumeric,
  getPlant,
  isPlantId,
  listCountries,
  listFinishes,
  listPlants,
  listPotModels,
  listRegions,
  plantPrice,
  plantsForCountry,
  potPrice,
  shippingFee,
} from "./index";
import { PLANT_IDS, type CurrencyCode, type LocalizedText } from "./types";

const require = createRequire(import.meta.url);

function atlasIds(file: "countries-110m.json" | "countries-50m.json"): Set<string> {
  const topo = JSON.parse(readFileSync(require.resolve(`world-atlas/${file}`), "utf8")) as {
    objects: { countries: { geometries: { id?: string }[] } };
  };
  return new Set(topo.objects.countries.geometries.flatMap((g) => (g.id ? [g.id] : [])));
}

function expectLocalized(text: LocalizedText, label: string) {
  for (const locale of locales) {
    expect(text[locale]?.trim(), `${label} [${locale}]`).toBeTruthy();
  }
}

const plants = listPlants();
const countries = listCountries();
const CAM_PLANTS = ["snake-plant", "jade-plant", "aloe", "echeveria", "cactus", "phalaenopsis"];
/** ASPCA non-toxic to both cats and dogs. */
const ASPCA_NON_TOXIC = ["money-tree", "echeveria", "spider-plant", "calathea", "phalaenopsis", "basil"];

describe("plants", () => {
  it("has exactly one entry per PLANT_ID", () => {
    expect(plants.map((p) => p.id).sort()).toEqual([...PLANT_IDS].sort());
    for (const id of PLANT_IDS) {
      expect(getPlant(id)?.id).toBe(id);
      expect(isPlantId(id)).toBe(true);
    }
    expect(isPlantId("triffid")).toBe(false);
  });

  it("has complete en / zh / ja copy", () => {
    for (const p of plants) {
      expectLocalized(p.name, `${p.id}.name`);
      expectLocalized(p.blurb, `${p.id}.blurb`);
      expectLocalized(p.personality, `${p.id}.personality`);
      expect(p.scientificName.trim()).toBeTruthy();
    }
  });

  it("gives every plant a distinct personality and accent color", () => {
    expect(new Set(plants.map((p) => p.personality.en)).size).toBe(plants.length);
    expect(new Set(plants.map((p) => p.color.toLowerCase())).size).toBe(plants.length);
    for (const p of plants) expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("has sane care targets and ranges", () => {
    for (const p of plants) {
      const [tMin, tMax] = p.tempRange;
      expect(tMin, p.id).toBeLessThan(tMax);
      expect(tMin).toBeGreaterThanOrEqual(5);
      expect(tMax).toBeLessThanOrEqual(40);
      const [mMin, mMax] = p.care.soilMoisture;
      expect(mMin, p.id).toBeGreaterThanOrEqual(0);
      expect(mMin).toBeLessThan(mMax);
      expect(mMax).toBeLessThanOrEqual(80);
      const [lMin, lMax] = p.care.lux;
      expect(lMin, p.id).toBeGreaterThan(0);
      expect(lMin).toBeLessThan(lMax);
      expect(p.care.lightHours).toBeGreaterThanOrEqual(6);
      expect(p.care.lightHours).toBeLessThanOrEqual(16);
      expect(p.sizes.length, p.id).toBeGreaterThan(0);
      expect(p.placements.length, p.id).toBeGreaterThan(0);
      expect(p.climates.length, p.id).toBeGreaterThan(0);
    }
  });

  it("keeps watering targets consistent with the water level", () => {
    for (const p of plants) {
      const [, max] = p.care.soilMoisture;
      if (p.water === "low") expect(max, p.id).toBeLessThanOrEqual(30);
      if (p.water === "high") expect(max, p.id).toBeGreaterThanOrEqual(60);
    }
  });

  it("only flags CAM plants as night breathers", () => {
    expect(plants.filter((p) => p.nightOxygen).map((p) => p.id).sort()).toEqual([...CAM_PLANTS].sort());
  });

  it("follows ASPCA toxicity for petSafe", () => {
    expect(plants.filter((p) => p.petSafe).map((p) => p.id).sort()).toEqual([...ASPCA_NON_TOXIC].sort());
  });
});

describe("markets", () => {
  it("has ~40 markets in every region", () => {
    expect(countries.length).toBeGreaterThanOrEqual(38);
    for (const r of listRegions()) {
      expect(countries.some((c) => c.region === r.id), r.id).toBe(true);
    }
  });

  it("uses unique, upper-case ISO alpha-2 codes", () => {
    const codes = countries.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of countries) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(getCountry(c.code.toLowerCase())).toBe(c);
    }
  });

  it("does not list sub-national areas as separate markets", () => {
    for (const code of ["TW", "HK", "MO"]) expect(getCountry(code)).toBeUndefined();
    expect(getCountry("CN")?.name).toEqual({ en: "China", zh: "中国", ja: "中国" });
    expect(getCountry("CN")?.shippingNote?.zh).toBe("目前仅配送中国大陆地址");
  });

  it("uses unique 3-digit isoNumeric ids that exist in world-atlas 50m", () => {
    const ids50 = atlasIds("countries-50m.json");
    const numerics = countries.map((c) => c.isoNumeric);
    expect(new Set(numerics).size).toBe(numerics.length);
    for (const c of countries) {
      expect(c.isoNumeric, c.code).toMatch(/^\d{3}$/);
      expect(ids50.has(c.isoNumeric), `${c.code} ${c.isoNumeric} missing from 50m`).toBe(true);
      expect(getCountryByNumeric(Number(c.isoNumeric))).toBe(c);
    }
  });

  it("documents which markets are absent from world-atlas 110m (drawn as markers)", () => {
    const ids110 = atlasIds("countries-110m.json");
    expect(countries.filter((c) => !ids110.has(c.isoNumeric)).map((c) => c.code)).toEqual(["SG"]);
  });

  it("has localized names and valid geography", () => {
    for (const c of countries) {
      expectLocalized(c.name, `${c.code}.name`);
      const [lng, lat] = c.center;
      expect(Math.abs(lng)).toBeLessThanOrEqual(180);
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      // Equatorial markets (|lat| < 5°) follow where most people live (e.g. Kenya → south).
      if (Math.abs(lat) >= 5) expect(c.hemisphere, c.code).toBe(lat < 0 ? "south" : "north");
      expect(c.climates.length).toBeGreaterThan(0);
      expect(new Set(c.climates).size).toBe(c.climates.length);
    }
  });

  it("only references plants that exist, with at least 5 local favorites", () => {
    for (const c of countries) {
      const refs = [...Object.keys(c.plantOffers), ...c.localPlantIds];
      for (const id of refs) expect(getPlant(id), `${c.code} → ${id}`).toBeDefined();
      expect(new Set(c.localPlantIds).size, c.code).toBe(c.localPlantIds.length);
      expect(c.localPlantIds.length, c.code).toBeGreaterThanOrEqual(5);
      expect(plantsForCountry(c).length).toBeGreaterThanOrEqual(5);
    }
  });

  it("local favorites suit at least one of the market's climates", () => {
    for (const c of countries) {
      for (const id of c.localPlantIds) {
        const plant = getPlant(id)!;
        expect(
          plant.climates.some((z) => c.climates.includes(z)),
          `${c.code} → ${id}`,
        ).toBe(true);
      }
    }
  });

  it("follows the launch plan for sales modes", () => {
    expect(countriesBySalesMode("full").map((c) => c.code)).toEqual(["CN"]);
    const potOnly = countriesBySalesMode("pot_only").map((c) => c.code);
    for (const code of ["US", "JP", "KR", "SG", "AU", "CA", "GB", "DE", "FR", "NL", "ES", "IT"]) {
      expect(potOnly, code).toContain(code);
    }
    for (const c of countries) {
      if (c.salesMode === "full") {
        expect(c.partnerStatus).toBe("live");
        expect(Object.keys(c.plantOffers).length).toBeGreaterThan(0);
      } else {
        expect(c.plantOffers, c.code).toEqual({});
        expect(c.partnerStatus, c.code).toBe(c.salesMode === "pot_only" ? "recruiting" : "planned");
      }
    }
  });

  it("prices CN plants in CNY minor units and ships free in 2–5 days", () => {
    const cn = getCountry("CN")!;
    expect(cn.currency).toBe("cny");
    expect(cn.shipping).toEqual({ flatFee: 0, etaDays: [2, 5] });
    for (const [id, price] of Object.entries(cn.plantOffers)) {
      expect(Number.isInteger(price), id).toBe(true);
      expect(price, id).toBeGreaterThanOrEqual(900); // ≥ ¥9
      expect(price, id).toBeLessThanOrEqual(50000); // ≤ ¥500
      expect(plantPrice(cn, id)).toBe(price);
    }
    expect(plantPrice(getCountry("US")!, "pothos")).toBeNull();
  });

  it("has consistent shipping in minor units", () => {
    for (const c of countries) {
      const { flatFee, freeOver, etaDays } = c.shipping;
      expect(Number.isInteger(flatFee), c.code).toBe(true);
      expect(flatFee).toBeGreaterThanOrEqual(0);
      expect(etaDays[0]).toBeGreaterThan(0);
      expect(etaDays[0]).toBeLessThanOrEqual(etaDays[1]);
      if (freeOver !== undefined) {
        expect(freeOver, c.code).toBeGreaterThan(flatFee);
        expect(shippingFee(c, freeOver)).toBe(0);
        expect(shippingFee(c, freeOver - 1)).toBe(flatFee);
      }
      if (c.salesMode === "pot_only") {
        // The standard pot ships free everywhere we sell pots.
        expect(freeOver, c.code).toBe(potPrice(c, "M"));
      }
    }
    // Zero-decimal currencies are whole yen / won, not cents.
    expect(getCountry("JP")!.shipping.flatFee).toBeLessThan(5000);
    expect(getCountry("KR")!.shipping.flatFee).toBeGreaterThanOrEqual(1000);
  });
});

describe("pot products", () => {
  const models = listPotModels();

  it("keeps the S / M / L line-up and finishes", () => {
    expect(models.map((m) => m.sku)).toEqual(["POT-S", "POT-M", "POT-L"]);
    expect(listFinishes().map((f) => f.id)).toEqual(["porcelain", "sage", "graphite"]);
    for (const m of models) {
      expectLocalized(m.name, m.sku);
      expectLocalized(m.tagline, m.sku);
    }
  });

  it("has a price for every currency used by a market, increasing with size", () => {
    const currencies = new Set<CurrencyCode>(countries.map((c) => c.currency));
    for (const currency of currencies) {
      const [s, m, l] = models.map((model) => model.prices[currency]);
      for (const price of [s, m, l]) {
        expect(Number.isInteger(price), currency).toBe(true);
        expect(price, currency).toBeGreaterThan(0);
      }
      expect(s, currency).toBeLessThan(m);
      expect(m, currency).toBeLessThan(l);
    }
    for (const c of countries) expect(potPrice(c, "S")).toBeGreaterThan(0);
  });

  it("prices regions within a plausible band of the US price", () => {
    // Rough FX per USD; tax-inclusive markets may sit up to ~25 % higher.
    const fx: Record<CurrencyCode, number> = {
      usd: 1,
      cny: 7.1,
      jpy: 150,
      eur: 0.92,
      gbp: 0.78,
      krw: 1400,
      sgd: 1.33,
      aud: 1.52,
      cad: 1.38,
    };
    const exponent = (c: CurrencyCode) => (c === "jpy" || c === "krw" ? 0 : 2);
    for (const m of models) {
      const usd = m.prices.usd / 100;
      for (const [currency, minor] of Object.entries(m.prices) as [CurrencyCode, number][]) {
        const inUsd = minor / 10 ** exponent(currency) / fx[currency];
        const ratio = inUsd / usd;
        expect(ratio, `${m.sku} ${currency}`).toBeGreaterThan(0.8);
        expect(ratio, `${m.sku} ${currency}`).toBeLessThan(1.25);
      }
    }
  });
});

describe("regions", () => {
  it("has localized names", () => {
    for (const r of listRegions()) expectLocalized(r.name, r.id);
  });

  // Mirrors how the map frames a region: world fitted to the viewport, scaled by
  // `zoom` and centred on `center`. Every market marker must land inside the
  // frame with a margin, on desktop and on a phone.
  it.each([
    [1280, 720],
    [390, 780],
  ])("frames all of its markets in a %ix%i viewport", (w, h) => {
    const baseScale = geoEqualEarth().fitSize([w, h], { type: "Sphere" }).scale();
    const margin = 0.08;
    for (const r of listRegions()) {
      const projection = geoEqualEarth()
        .scale(baseScale * r.zoom)
        .translate([w / 2, h / 2]);
      const [cx, cy] = projection(r.center)!;
      projection.translate([w - cx, h - cy]);
      for (const c of countries.filter((country) => country.region === r.id)) {
        const [x, y] = projection(c.center)!;
        expect(x / w, `${r.id} ${c.code} x`).toBeGreaterThan(margin);
        expect(x / w, `${r.id} ${c.code} x`).toBeLessThan(1 - margin);
        expect(y / h, `${r.id} ${c.code} y`).toBeGreaterThan(margin);
        expect(y / h, `${r.id} ${c.code} y`).toBeLessThan(1 - margin);
      }
    }
  });
});
