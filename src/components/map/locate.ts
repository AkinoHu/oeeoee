import type { GeometryCollection, Topology } from "topojson-specification";

/** Promise wrapper around navigator.geolocation (call only from a user gesture). */
export function requestPosition(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
    );
  });
}

/**
 * world-atlas feature id (ISO numeric) containing [lon, lat], or null when the
 * point is at sea / on a feature too small for the atlas. The atlas and
 * topojson are loaded lazily — only when the visitor asks for their location.
 */
export async function featureIdAt(lonLat: [number, number], detail: "110m" | "50m" = "110m"): Promise<string | null> {
  const [{ feature }, { geoContains }, atlas] = await Promise.all([
    import("topojson-client"),
    import("d3-geo"),
    detail === "50m" ? import("world-atlas/countries-50m.json") : import("world-atlas/countries-110m.json"),
  ]);
  const topology = ((atlas as { default?: unknown }).default ?? atlas) as Topology<{
    countries: GeometryCollection;
  }>;
  const collection = feature(topology, topology.objects.countries);
  for (const f of collection.features) {
    if (f.id != null && geoContains(f, lonLat)) return String(f.id).padStart(3, "0");
  }
  return null;
}

/**
 * The 110m atlas has no room for the smallest markets: Singapore lies inside
 * Malaysia's outline there, so a visitor in Singapore resolved to Malaysia.
 * Near one of `small`, ask the finer 50m atlas and trust it only when it lands
 * inside that market (the 50m outlines are still too coarse elsewhere, e.g.
 * they put central Shenzhen inside Hong Kong).
 */
export async function refineForSmallMarkets(
  lonLat: [number, number],
  fid: string | null,
  small: readonly { center: [number, number]; featureIds: readonly string[] }[],
): Promise<string | null> {
  const near = small.filter((m) => distanceKm(lonLat, m.center) < 150);
  if (near.length === 0) return fid;
  const fine = await featureIdAt(lonLat, "50m");
  return fine && near.some((m) => m.featureIds.includes(fine)) ? fine : fid;
}

/** Great-circle distance in km. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
