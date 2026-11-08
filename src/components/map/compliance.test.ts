import { describe, expect, it } from "vitest";
import { absorbedNear, absorbingMarket, isAbsorbedFeature, marketFeatureIds } from "./compliance";

describe("map compliance grouping", () => {
  it("draws Taiwan, Hong Kong and Macao as part of China", () => {
    expect(marketFeatureIds("CN", "156")).toEqual(["156", "158", "344", "446"]);
    for (const id of ["158", "344", "446"]) {
      expect(isAbsorbedFeature(id)).toBe(true);
      expect(absorbingMarket(id)).toBe("CN");
    }
  });

  it("leaves China itself and other markets alone", () => {
    expect(isAbsorbedFeature("156")).toBe(false);
    expect(absorbingMarket("156")).toBeNull();
    expect(absorbingMarket("392")).toBeNull();
    expect(marketFeatureIds("JP", "392")).toEqual(["392"]);
  });

  it("places visitors in territories too small for the atlas", () => {
    expect(absorbedNear([113.54, 22.19])).toBe("CN"); // Macao peninsula
    expect(absorbedNear([113.56, 22.16])).toBe("CN"); // Taipa
    expect(absorbedNear([139.69, 35.69])).toBeNull(); // Tokyo
  });
});
