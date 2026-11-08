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
 * point is at sea / on a feature too small for the 110m data. The atlas and
 * topojson are loaded lazily — only when the visitor asks for their location.
 */
export async function featureIdAt(lonLat: [number, number]): Promise<string | null> {
  const [{ feature }, { geoContains }, atlas] = await Promise.all([
    import("topojson-client"),
    import("d3-geo"),
    import("world-atlas/countries-110m.json"),
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

/** Great-circle distance in km. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
