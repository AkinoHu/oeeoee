/** Downsampling of telemetry rows into fixed time buckets for charts. Pure, client-safe. */

export type BucketMode = "avg" | "max" | "any" | "sum";

/**
 * Split [start, end) into `buckets` equal slots and aggregate `pick(row)` per
 * slot. Empty slots are null so charts can show gaps.
 */
export function bucketize<T extends { recordedAt: Date }>(
  rows: readonly T[],
  start: Date,
  end: Date,
  buckets: number,
  pick: (row: T) => number | boolean | null | undefined,
  mode: BucketMode = "avg",
): (number | null)[] {
  const span = end.getTime() - start.getTime();
  const sums = new Array<number>(buckets).fill(0);
  const counts = new Array<number>(buckets).fill(0);
  const maxes = new Array<number>(buckets).fill(-Infinity);
  if (span <= 0 || buckets <= 0) return [];
  for (const row of rows) {
    const raw = pick(row);
    if (raw === null || raw === undefined) continue;
    const value = typeof raw === "boolean" ? (raw ? 1 : 0) : raw;
    if (!Number.isFinite(value)) continue;
    const idx = Math.floor(((row.recordedAt.getTime() - start.getTime()) / span) * buckets);
    if (idx < 0 || idx >= buckets) continue;
    sums[idx] += value;
    counts[idx] += 1;
    maxes[idx] = Math.max(maxes[idx], value);
  }
  return sums.map((sum, i) => {
    if (counts[i] === 0) return null;
    switch (mode) {
      case "sum":
        return sum;
      case "max":
        return maxes[i];
      case "any":
        return maxes[i] > 0 ? 1 : 0;
      default:
        return sum / counts[i];
    }
  });
}

export function seriesStats(values: readonly (number | null)[]) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    latest: nums[nums.length - 1],
  };
}
