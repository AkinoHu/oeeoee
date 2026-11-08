import { cn } from "@/lib/utils";

/**
 * Tiny trend line (no axes) at a fixed height, any width. De-emphasised stroke
 * with the current value as an accent end-dot; optional target band as a faint
 * wash. Decorative: the tile around it carries the value as text.
 */
export function Sparkline({
  values,
  target,
  accent = "var(--color-leaf-300)",
  className,
}: {
  values: readonly (number | null)[];
  target?: [number, number] | null;
  accent?: string;
  className?: string;
}) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className={cn("h-8", className)} aria-hidden />;

  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  if (target) {
    // Keep the band in view when it's close to the data.
    lo = Math.min(lo, target[0]);
    hi = Math.max(hi, Math.min(target[1], hi + (hi - lo) * 0.5 + 1));
  }
  if (hi - lo < 1e-6) {
    hi += 1;
    lo -= 1;
  }
  // Percent coordinates inside a 100×100 box; 8% vertical padding.
  const x = (i: number) => (i / (values.length - 1)) * 100;
  const y = (v: number) => 92 - ((v - lo) / (hi - lo)) * 84;

  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
    } else current.push(`${x(i).toFixed(2)},${y(v).toFixed(2)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  let lastIdx = values.length - 1;
  while (lastIdx >= 0 && values[lastIdx] === null) lastIdx--;
  const last = values[lastIdx] as number;
  const bandTop = target ? y(Math.min(hi, target[1])) : 0;
  const bandBottom = target ? y(Math.max(lo, target[0])) : 0;

  return (
    <div className={cn("relative h-8", className)} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {target && <rect x={0} width={100} y={bandTop} height={Math.max(0, bandBottom - bandTop)} fill="var(--color-leaf-300)" opacity={0.07} />}
        {segments.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface-2"
        style={{ left: `${x(lastIdx)}%`, top: `${y(last)}%`, background: accent }}
      />
    </div>
  );
}
