import { describe, expect, it } from "vitest";
import { distanceKm, featureIdAt, refineForSmallMarkets } from "./locate";

const SINGAPORE = { center: [103.82, 1.35] as [number, number], featureIds: ["702"] };

describe("featureIdAt", () => {
  it("finds the country under a point", async () => {
    expect(await featureIdAt([139.69, 35.68])).toBe("392"); // Tokyo
    expect(await featureIdAt([-30, 0])).toBeNull(); // mid-Atlantic
  });

  it("has no Singapore in the 110m atlas, but the 50m one does", async () => {
    expect(await featureIdAt([103.82, 1.35])).toBe("458"); // swallowed by Malaysia
    expect(await featureIdAt([103.82, 1.35], "50m")).toBe("702");
  });
});

describe("refineForSmallMarkets", () => {
  it("resolves central Singapore to the Singapore market instead of Malaysia", async () => {
    expect(await refineForSmallMarkets([103.82, 1.35], "458", [SINGAPORE])).toBe("702");
    expect(await refineForSmallMarkets([103.99, 1.36], "458", [SINGAPORE])).toBe("702"); // Changi
  });

  it("keeps the coarse answer when the finer atlas does not land in the small market", async () => {
    expect(await refineForSmallMarkets([103.76, 1.46], "458", [SINGAPORE])).toBe("458"); // Johor Bahru
    expect(await refineForSmallMarkets([101.69, 3.14], "458", [SINGAPORE])).toBe("458"); // Kuala Lumpur (> 150 km)
  });

  it("never lets the 50m atlas re-assign points far from small markets (e.g. Shenzhen stays China)", async () => {
    expect(await refineForSmallMarkets([114.055, 22.541], "156", [SINGAPORE])).toBe("156");
  });
});

describe("distanceKm", () => {
  it("is a great-circle distance", () => {
    expect(distanceKm([0, 0], [0, 1])).toBeCloseTo(111.2, 0);
    expect(distanceKm([139.69, 35.68], [139.69, 35.68])).toBe(0);
  });
});
