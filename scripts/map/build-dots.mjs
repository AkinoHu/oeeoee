#!/usr/bin/env node
/**
 * Precomputes the dot-matrix world used by the landing map.
 *
 *   node scripts/map/build-dots.mjs
 *
 * Land from world-atlas/countries-50m is projected with Equal Earth into a
 * fixed reference space (1000 units wide, Antarctica cropped) and sampled on
 * a square grid of 1 unit. Every land cell records which country feature it
 * belongs to, so the client never runs point-in-polygon tests: it decodes the
 * run-length rows below and only picks colours.
 *
 * Output (committed): src/components/map/data/land-dots.json
 *   meta     – projection + grid parameters (the client rebuilds the same projection)
 *   features – one entry per feature index: [isoNumeric, alpha2, region, dotCount, bbox, centroid]
 *              (index 0 = unidentified land)
 *   rows     – per grid row: [j, gap, len, featureIndex, gap, len, featureIndex, …]
 *              where gap is the column distance from the end of the previous run.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { FEATURE_TABLE, UNCODED_REGIONS } from "./countries.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const require = createRequire(resolve(root, "package.json"));
const topology = require("world-atlas/countries-50m.json");

// Keep in sync with src/components/map/engine/projection.ts
const REF_W = 1000;
const LAT_TOP = 84;
const LAT_BOTTOM = -57;
const SPACING = 1; // grid spacing in reference units (fine level)

const projection = geoEqualEarth().fitWidth(REF_W, { type: "Sphere" });
const yTop = projection([0, LAT_TOP])[1];
const yBottom = projection([0, LAT_BOTTOM])[1];
const REF_H = yBottom - yTop;

// ── Collect features (merge duplicate ids, drop Antarctica) ───────────────
const fc = feature(topology, topology.objects.countries);
/** @type {Map<string, { id: string, a2: string, region: string, geoms: any[] }>} */
const groups = new Map();
for (const f of fc.features) {
  if (f.id === "010") continue; // Antarctica
  let key, a2, region;
  if (f.id) {
    const entry = FEATURE_TABLE[f.id];
    if (!entry) throw new Error(`No table entry for feature ${f.id} (${f.properties.name})`);
    key = f.id;
    [a2, region] = entry;
  } else {
    key = `x:${f.properties.name}`;
    a2 = "";
    region = UNCODED_REGIONS[f.properties.name] ?? null;
  }
  if (!groups.has(key)) groups.set(key, { id: f.id ?? "", a2, region: region ?? "", geoms: [] });
  groups.get(key).geoms.push(f);
}

// ── Project every feature into planar edges (reference space) ─────────────
function projectRings(geo) {
  const rings = [];
  let ring = null;
  const ctx = {
    moveTo(x, y) {
      ring = [[x, y - yTop]];
      rings.push(ring);
    },
    lineTo(x, y) {
      ring.push([x, y - yTop]);
    },
    closePath() {
      if (ring && ring.length) ring.push(ring[0]);
    },
    arc() {},
    rect() {},
  };
  geoPath(projection, ctx)(geo);
  return rings;
}

const featureList = [{ id: "", a2: "", region: "", edges: [], bbox: null }];
for (const g of groups.values()) {
  const edges = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const geom of g.geoms) {
    for (const ring of projectRings(geom)) {
      for (let k = 1; k < ring.length; k++) {
        const [ax, ay] = ring[k - 1];
        const [bx, by] = ring[k];
        if (ay === by) continue;
        edges.push(ax, ay, bx, by);
        x0 = Math.min(x0, ax, bx);
        x1 = Math.max(x1, ax, bx);
        y0 = Math.min(y0, ay, by);
        y1 = Math.max(y1, ay, by);
      }
    }
  }
  featureList.push({ id: g.id, a2: g.a2, region: g.region, edges, bbox: [x0, y0, x1, y1] });
}

// ── Scanline fill ─────────────────────────────────────────────────────────
const COLS = Math.round(REF_W / SPACING) + 1; // column i sits at x = i * SPACING
const ROWS = Math.floor(REF_H / SPACING) + 1; // row j sits at y = j * SPACING
const cells = new Uint16Array(COLS * ROWS); // feature index, 0 = sea

// Bucket edges by the rows they cross so each row only touches nearby edges.
const rowEdges = Array.from({ length: ROWS }, () => []);
featureList.forEach((f, fi) => {
  const e = f.edges;
  for (let k = 0; k < e.length; k += 4) {
    const ya = e[k + 1], yb = e[k + 3];
    const lo = Math.max(0, Math.ceil(Math.min(ya, yb) / SPACING));
    const hi = Math.min(ROWS - 1, Math.floor(Math.max(ya, yb) / SPACING));
    for (let j = lo; j <= hi; j++) rowEdges[j].push(fi, k);
  }
});

for (let j = 0; j < ROWS; j++) {
  const y = j * SPACING;
  /** @type {Map<number, number[]>} */
  const crossings = new Map();
  const list = rowEdges[j];
  for (let n = 0; n < list.length; n += 2) {
    const fi = list[n], k = list[n + 1];
    const e = featureList[fi].edges;
    const ax = e[k], ay = e[k + 1], bx = e[k + 2], by = e[k + 3];
    // half-open rule so shared vertices are counted once
    if ((ay <= y && y < by) || (by <= y && y < ay)) {
      const x = ax + ((y - ay) * (bx - ax)) / (by - ay);
      if (!crossings.has(fi)) crossings.set(fi, []);
      crossings.get(fi).push(x);
    }
  }
  for (const [fi, xs] of crossings) {
    xs.sort((a, b) => a - b);
    for (let n = 0; n + 1 < xs.length; n += 2) {
      const i0 = Math.max(0, Math.ceil(xs[n] / SPACING));
      const i1 = Math.min(COLS - 1, Math.ceil(xs[n + 1] / SPACING) - 1);
      for (let i = i0; i <= i1; i++) {
        const c = j * COLS + i;
        if (!cells[c]) cells[c] = fi;
      }
    }
  }
}

// ── Encode rows + per-feature stats ───────────────────────────────────────
const stats = featureList.map(() => ({ n: 0, sx: 0, sy: 0 }));
const rows = [];
for (let j = 0; j < ROWS; j++) {
  const row = [j];
  let prevEnd = 0;
  let i = 0;
  while (i < COLS) {
    const f = cells[j * COLS + i];
    if (!f) {
      i++;
      continue;
    }
    let len = 1;
    while (i + len < COLS && cells[j * COLS + i + len] === f) len++;
    row.push(i - prevEnd, len, f);
    const s = stats[f];
    s.n += len;
    s.sx += (i + (len - 1) / 2) * SPACING * len;
    s.sy += y(j) * len;
    prevEnd = i + len;
    i += len;
  }
  if (row.length > 1) rows.push(row);
}
function y(j) {
  return j * SPACING;
}

const round1 = (v) => Math.round(v * 10) / 10;
const features = featureList.map((f, fi) => {
  const s = stats[fi];
  const bbox = f.bbox ? f.bbox.map(round1) : [0, 0, 0, 0];
  const c = s.n ? [round1(s.sx / s.n), round1(s.sy / s.n)] : [round1((bbox[0] + bbox[2]) / 2), round1((bbox[1] + bbox[3]) / 2)];
  return [f.id, f.a2, f.region, s.n, bbox, c];
});

const out = {
  meta: {
    projection: "equalEarth",
    width: REF_W,
    height: round1(REF_H),
    latTop: LAT_TOP,
    latBottom: LAT_BOTTOM,
    spacing: SPACING,
    cols: COLS,
    rows: ROWS,
    source: "world-atlas/countries-50m",
  },
  features,
  rows,
};

const outFile = resolve(root, "src/components/map/data/land-dots.json");
mkdirSync(dirname(outFile), { recursive: true });
const json = JSON.stringify(out);
writeFileSync(outFile, json + "\n");
const total = stats.reduce((a, s) => a + s.n, 0);
console.log(`wrote ${outFile}`);
console.log(`  grid ${COLS}×${ROWS}, ${total} land dots, ${rows.length} rows, ${(json.length / 1024).toFixed(1)} KiB`);
