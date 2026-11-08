import { describe, expect, it } from "vitest";
import { getCountry, listCountries, listPlants } from "@/data";
import { recommendPlants } from "@/lib/recommend";
import { resolveStudio, studioPlants } from "./studio";

describe("resolveStudio", () => {
  it("falls back to the top recommendation for unknown or missing params", () => {
    const us = getCountry("US")!;
    const top = studioPlants(us)[0];
    expect(resolveStudio(us, { plant: "../../etc", size: "XL", finish: "neon" })).toMatchObject({
      plantId: top.id,
      finish: "porcelain",
    });
    expect(["S", "M", "L"]).toContain(resolveStudio(us, {}).size);
  });

  it("keeps a quiz pick from outside the market's plant list (shared links, Stripe cancel_url)", () => {
    // The pet-safe quiz tops up from the global catalog when a market has fewer than 3 pet-safe plants.
    const found = listCountries()
      .flatMap((country) => {
        const strip = new Set(studioPlants(country).map((p) => p.id));
        return recommendPlants({ country, petSafeOnly: true })
          .filter((r) => !strip.has(r.plant.id))
          .map((r) => ({ country, plantId: r.plant.id }));
      })
      .at(0);
    expect(found).toBeDefined();
    const { country, plantId } = found!;
    expect(resolveStudio(country, { plant: plantId, size: "M" })).toMatchObject({ plantId, size: "M" });
  });

  it("accepts every catalog plant id", () => {
    const ca = getCountry("CA")!;
    for (const plant of listPlants()) expect(resolveStudio(ca, { plant: plant.id }).plantId).toBe(plant.id);
  });
});
