import raw from "../data/land-dots.json";

/** One world-atlas feature as recorded by scripts/map/build-dots.mjs. */
export interface FeatureInfo {
  /** ISO numeric id ("" for unidentified land). */
  id: string;
  a2: string;
  /** Display region for non-market land ("" when none). */
  region: string;
  /** Number of fine dots. */
  n: number;
  /** [x0, y0, x1, y1] in reference units. */
  bbox: [number, number, number, number];
  /** Dot centroid in reference units. */
  c: [number, number];
}

export interface DotField {
  width: number;
  height: number;
  spacing: number;
  latTop: number;
  rows: number;
  count: number;
  /** Reference-space coordinates of every land dot, ordered by row then column. */
  xs: Float32Array;
  ys: Float32Array;
  /** Feature index per dot. */
  fs: Uint16Array;
  /** Level of detail: dot is kept when zoomed out by 2^lvl (0 = finest only, 4 = always). */
  lv: Uint8Array;
  /** Dot index range per grid row: rowStart[j] … rowStart[j + 1]. */
  rowStart: Int32Array;
  features: FeatureInfo[];
  byId: Map<string, number>;
  byA2: Map<string, number>;
}

export const MAX_LEVEL = 4;

/** LOD level of a grid row / column index: trailing zero bits, capped at MAX_LEVEL. */
export function lodLevel(n: number): number {
  let v = n | (1 << MAX_LEVEL);
  let l = 0;
  while ((v & 1) === 0) {
    v >>= 1;
    l++;
  }
  return l;
}

type RawFeature = [string, string, string, number, number[], number[]];

let cached: DotField | null = null;

/** Decodes the committed run-length land grid once per page. */
export function getDotField(): DotField {
  if (cached) return cached;
  const { meta, rows } = raw as { meta: typeof raw.meta; rows: number[][] };
  const features: FeatureInfo[] = (raw.features as unknown as RawFeature[]).map(([id, a2, region, n, bbox, c]) => ({
    id,
    a2,
    region,
    n,
    bbox: bbox as FeatureInfo["bbox"],
    c: c as FeatureInfo["c"],
  }));

  let count = 0;
  for (const row of rows) for (let k = 2; k < row.length; k += 3) count += row[k];

  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  const fs = new Uint16Array(count);
  const lv = new Uint8Array(count);
  const rowStart = new Int32Array(meta.rows + 1);
  const s = meta.spacing;

  let idx = 0;
  let r = 0;
  for (let j = 0; j < meta.rows; j++) {
    rowStart[j] = idx;
    const row = rows[r];
    if (!row || row[0] !== j) continue;
    r++;
    const rowLevel = lodLevel(j);
    let i = 0;
    for (let k = 1; k < row.length; k += 3) {
      i += row[k];
      const len = row[k + 1];
      const f = row[k + 2];
      for (let q = 0; q < len; q++, i++, idx++) {
        xs[idx] = i * s;
        ys[idx] = j * s;
        fs[idx] = f;
        lv[idx] = Math.min(rowLevel, lodLevel(i));
      }
    }
  }
  rowStart[meta.rows] = idx;

  const byId = new Map<string, number>();
  const byA2 = new Map<string, number>();
  features.forEach((f, i) => {
    if (f.id && !byId.has(f.id)) byId.set(f.id, i);
    if (f.a2 && !byA2.has(f.a2)) byA2.set(f.a2, i);
  });

  cached = {
    width: meta.width,
    height: meta.height,
    spacing: s,
    latTop: meta.latTop,
    rows: meta.rows,
    count,
    xs,
    ys,
    fs,
    lv,
    rowStart,
    features,
    byId,
    byA2,
  };
  return cached;
}

/** First dot index in [lo, hi) whose x ≥ x (dots in a row are sorted by x). */
export function lowerBound(xs: Float32Array, lo: number, hi: number, x: number): number {
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
