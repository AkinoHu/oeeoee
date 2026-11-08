import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import type { VitalsAssessment, VitalStatus } from "@/lib/vitals";
import { STATUS_TONE } from "./display";
import { SeverityIcon } from "./MetricIcon";

const STATUS_SEVERITY = { thriving: null, ok: "info", needs_attention: "warning", critical: "critical" } as const;

/** Overall vitals status: icon + label + tone (never colour alone). */
export function StatusBadge({ status, label, className }: { status: VitalStatus; label: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      <SeverityIcon severity={STATUS_SEVERITY[status]} className="h-3.5 w-3.5 text-current" />
      {label}
    </Badge>
  );
}

/** Status of a pot, or "waiting" when it has never reported. */
export function PotStatusBadge({
  vitals,
  statusLabel,
  waitingLabel,
  className,
}: {
  vitals: Pick<VitalsAssessment, "status" | "issues">;
  statusLabel: string;
  waitingLabel: string;
  className?: string;
}) {
  if (vitals.issues.some((i) => i.code === "no_data")) {
    return (
      <Badge tone="neutral" className={className}>
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {waitingLabel}
      </Badge>
    );
  }
  return <StatusBadge status={vitals.status} label={statusLabel} className={className} />;
}

/** Online / offline dot + label. */
export function PresenceDot({ online, label }: { online: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="relative flex h-2 w-2" aria-hidden>
        {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-300 opacity-40" />}
        <span className={online ? "relative h-2 w-2 rounded-full bg-leaf-300" : "relative h-2 w-2 rounded-full bg-faint"} />
      </span>
      {label}
    </span>
  );
}
