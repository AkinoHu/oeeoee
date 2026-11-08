import { CircleCheck, Droplets, GlassWater, Info, OctagonAlert, Sun, Thermometer, TriangleAlert, Waves } from "lucide-react";
import type { Severity } from "@/lib/vitals";
import { cn } from "@/lib/utils";
import { METRIC_META } from "./display";
import type { MetricKey } from "@/lib/vitals";

const ICONS = { soil: Droplets, temp: Thermometer, humidity: Waves, light: Sun, tank: GlassWater } as const;

export function MetricIcon({ metric, className }: { metric: MetricKey; className?: string }) {
  const Icon = ICONS[METRIC_META[metric].icon];
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}

const SEVERITY_ICONS = { info: Info, warning: TriangleAlert, critical: OctagonAlert } as const;
const SEVERITY_CLASS = { info: "text-sky", warning: "text-sun", critical: "text-rose" } as const;

/** Status icon (always paired with a text label — never colour alone). */
export function SeverityIcon({ severity, className }: { severity: Severity | null; className?: string }) {
  if (!severity) return <CircleCheck className={cn("h-4 w-4 text-leaf-300", className)} aria-hidden />;
  const Icon = SEVERITY_ICONS[severity];
  return <Icon className={cn("h-4 w-4", SEVERITY_CLASS[severity], className)} aria-hidden />;
}
