import type { MetricKey, MetricState } from "@/lib/vitals";
import { cn } from "@/lib/utils";
import { metricTone, TONE_COLOR } from "./display";
import { MetricIcon, SeverityIcon } from "./MetricIcon";
import { Sparkline } from "./Sparkline";

/**
 * One vital sign: label, current value, a status icon + word, the target range
 * and a 24 h sparkline. All text is passed in pre-translated.
 */
export function VitalTile({
  metric,
  state,
  label,
  value,
  unit,
  statusLabel,
  targetLabel,
  series,
  className,
}: {
  metric: MetricKey;
  state: MetricState;
  label: string;
  value: string | null;
  unit: string;
  statusLabel: string;
  targetLabel?: string | null;
  series: readonly (number | null)[];
  className?: string;
}) {
  const tone = metricTone(state);
  const severity = state.value === null ? null : state.severity;
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xl border border-line bg-surface-2/60 p-3", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <MetricIcon metric={metric} className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-xl font-semibold tracking-tight">{value ?? "—"}</span>
        {value !== null && <span className="text-xs text-muted">{unit}</span>}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
        {state.value !== null && <SeverityIcon severity={severity} className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{statusLabel}</span>
      </p>
      <div className="mt-2">
        <Sparkline values={series} target={state.target} accent={TONE_COLOR[tone]} />
      </div>
      {targetLabel && <p className="mt-1 truncate text-[11px] text-faint">{targetLabel}</p>}
    </div>
  );
}
