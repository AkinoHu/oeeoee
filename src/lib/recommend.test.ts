import { describe, expect, it } from "vitest";
import { getCountry, listCountries } from "@/data";
import { REASON_CODES, recommendPlants, type RecommendInput } from "./recommend";

const ids = (input: RecommendInput) => recommendPlants(input).map((r) => r.plant.id);

describe("recommendPlants", () => {
  it("returns [] for an unknown country", () => {
    expect(recommendPlants({ country: "XX" })).toEqual([]);
    expect(recommendPlants({ country: "" })).toEqual([]);
  });

  it("accepts a code in any case or a Country object", () => {
    const jp = getCountry("JP")!;
    expect(ids({ country: "jp" })).toEqual(ids({ country: jp }));
  });

  it("puts the snake plant first for a dim bedside Mini pot in Japan", () => {
    const recs = recommendPlants({ country: "JP", placement: "bedside", size: "S", light: "low" });
    expect(recs[0].plant.id).toBe("snake-plant");
    expect(recs[0].reasons[0]).toBe("night_oxygen");
    expect(recs[0].reasons).toContain("low_light_ok");
    // Low-light-tolerant plants dominate the top of the list.
    for (const r of recs.slice(0, 4)) expect(r.plant.light).toBe("low");
  });

  it("favours night-breathing plants at the bedside when light is unknown", () => {
    const top = recommendPlants({ country: "JP", placement: "bedside", size: "S" }).slice(0, 3);
    expect(top[0].plant.id).toBe("snake-plant");
    expect(top.filter((r) => r.plant.nightOxygen).length).toBeGreaterThanOrEqual(2);
  });

  it("favours statement plants for a bright living room with the Grand pot", () => {
    const top = ids({ country: "US", placement: "living_room", size: "L", light: "bright" }).slice(0, 5);
    expect(top[0]).toBe("monstera");
    expect(top).toContain("fiddle-leaf-fig");
    expect(
      ids({ country: "US", placement: "living_room", size: "L", light: "bright", experience: "some" }).slice(0, 3),
    ).toContain("monstera");
    expect(ids({ country: "US", placement: "living_room", size: "L", light: "bright", experience: "expert" })[0]).toBe(
      "fiddle-leaf-fig",
    );
    expect(ids({ country: "DE", placement: "living_room", size: "L" })[0]).toBe("monstera");
  });

  it("ranks plants that don't fit the pot below those that do", () => {
    const recs = recommendPlants({ country: "US", size: "S" });
    const firstMisfit = recs.findIndex((r) => !r.plant.sizes.includes("S"));
    const lastFit = recs.map((r) => r.plant.sizes.includes("S")).lastIndexOf(true);
    expect(firstMisfit).toBeGreaterThan(lastFit);
    for (const r of recs) {
      if (!r.plant.sizes.includes("S")) expect(r.reasons).not.toContain("fits_size");
    }
  });

  it("removes toxic plants when petSafeOnly is set", () => {
    for (const country of listCountries()) {
      const recs = recommendPlants({ country, petSafeOnly: true });
      expect(recs.length, country.code).toBeGreaterThanOrEqual(3);
      for (const r of recs) {
        expect(r.plant.petSafe, `${country.code} ${r.plant.id}`).toBe(true);
        expect(r.reasons[0]).toBe("pet_safe");
      }
    }
    expect(ids({ country: "CN", petSafeOnly: true })).not.toContain("pothos");
  });

  it("tops up from the global catalog when the local pool is too small", () => {
    // UAE nurseries carry almost no pet-safe plants.
    const recs = recommendPlants({ country: "AE", petSafeOnly: true });
    expect(recs.length).toBe(3);
    expect(recs.some((r) => !getCountry("AE")!.localPlantIds.includes(r.plant.id))).toBe(true);
  });

  it("sells live plants with CNY prices in China", () => {
    const cn = getCountry("CN")!;
    const recs = recommendPlants({ country: "CN", placement: "desk", size: "M", light: "medium", experience: "beginner" });
    expect(recs.length).toBeGreaterThanOrEqual(10);
    for (const r of recs) {
      expect(r.sellable).toBe(true);
      expect(r.price).toBe(cn.plantOffers[r.plant.id]);
      expect(r.price).toBeGreaterThan(0);
    }
    expect(recs[0].reasons).toContain("sold_here");
  });

  it("marks pot-only markets as not sellable and explains local availability", () => {
    const recs = recommendPlants({ country: "GB", placement: "desk" });
    expect(recs.length).toBeGreaterThanOrEqual(5);
    for (const r of recs) {
      expect(r.sellable).toBe(false);
      expect(r.price).toBeNull();
      expect(r.reasons).not.toContain("sold_here");
    }
    expect(recs.some((r) => r.reasons.includes("local_favorite"))).toBe(true);
  });

  it("steers beginners to easy plants and experts may get fussier ones", () => {
    const beginner = recommendPlants({ country: "US", experience: "beginner" });
    for (const r of beginner.slice(0, 5)) expect(r.plant.difficulty).toBe(1);
    const fiddleRank = (experience: RecommendInput["experience"]) =>
      ids({ country: "US", experience }).indexOf("fiddle-leaf-fig");
    expect(fiddleRank("expert")).toBeLessThan(fiddleRank("beginner"));
  });

  it("penalises bright-light plants in a dim spot more than medium-light ones", () => {
    const score = (id: string) =>
      recommendPlants({ country: "US", light: "low", placement: "desk", size: "S" }).find((r) => r.plant.id === id)!
        .score;
    const scoreBright = (id: string) =>
      recommendPlants({ country: "US", light: "bright", placement: "desk", size: "S" }).find((r) => r.plant.id === id)!
        .score;
    const dropCactus = scoreBright("cactus") - score("cactus");
    const dropSpider = scoreBright("spider-plant") - score("spider-plant");
    expect(dropCactus).toBeGreaterThan(dropSpider);
    expect(score("pothos")).toBeGreaterThan(score("cactus"));
  });

  it("prefers plants that suit the local climate", () => {
    const sg = getCountry("SG")!;
    const desertSg = { ...sg, climates: ["arid" as const] };
    const calathea = (country: typeof sg) =>
      recommendPlants({ country, placement: "desk" }).find((r) => r.plant.id === "calathea")!;
    expect(calathea(sg).reasons).toContain("suits_climate");
    expect(calathea(desertSg).reasons).not.toContain("suits_climate");
    expect(calathea(sg).score).toBeGreaterThan(calathea(desertSg).score);
    const eg = recommendPlants({ country: "EG", placement: "desk" });
    expect(eg.find((r) => r.plant.id === "cactus")!.reasons).toContain("suits_climate");
  });

  it("returns well-formed, deterministic results for every market and input combo", () => {
    for (const country of listCountries()) {
      for (const size of ["S", "M", "L"] as const) {
        for (const placement of ["desk", "bedside", "living_room"] as const) {
          for (const light of ["low", "medium", "bright", undefined] as const) {
            const input: RecommendInput = { country: country.code, size, placement, light };
            const recs = recommendPlants(input);
            expect(recs.length, country.code).toBeGreaterThan(0);
            expect(new Set(recs.map((r) => r.plant.id)).size).toBe(recs.length);
            for (const [i, r] of recs.entries()) {
              expect(Number.isInteger(r.score)).toBe(true);
              expect(r.score).toBeGreaterThanOrEqual(0);
              expect(r.score).toBeLessThanOrEqual(100);
              expect(r.reasons.length).toBeLessThanOrEqual(3);
              expect(new Set(r.reasons).size).toBe(r.reasons.length);
              for (const code of r.reasons) expect(REASON_CODES).toContain(code);
              if (i > 0) {
                const prev = recs[i - 1];
                expect(prev.score).toBeGreaterThanOrEqual(r.score);
                if (prev.score === r.score && prev.sellable === r.sellable) {
                  expect(prev.plant.name.en <= r.plant.name.en).toBe(true);
                }
              }
            }
            expect(ids(input)).toEqual(recs.map((r) => r.plant.id));
          }
        }
      }
    }
  });
});
