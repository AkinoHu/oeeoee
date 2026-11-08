import type { RegionId, SalesMode } from "@/data/types";

/** Serializable, already-localized view of the catalog that the map needs. */
export interface MapRegion {
  id: RegionId;
  name: string;
  /** [longitude, latitude] */
  center: [number, number];
  /** Zoom relative to the whole-world view. */
  zoom: number;
}

export interface MapMarket {
  /** ISO alpha-2, upper case. */
  code: string;
  isoNumeric: string;
  /** world-atlas features drawn as this market (see compliance.ts). */
  featureIds: string[];
  name: string;
  region: RegionId;
  salesMode: SalesMode;
  /** [longitude, latitude] label / beacon anchor. */
  center: [number, number];
  /** Delivery estimate in days, when we ship there. */
  eta: [number, number] | null;
}

export interface MapModel {
  regions: MapRegion[];
  markets: MapMarket[];
}

export type Stage =
  | { level: "world" }
  | { level: "region"; region: RegionId }
  | { level: "country"; region: RegionId; code: string };
