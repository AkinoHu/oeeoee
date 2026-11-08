/** Turn vitals into translated UI strings. Works with the server or client `t`. */
import type { Locale } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { formatDuration, formatNumber } from "@/lib/companion/format";
import { METRIC_KEYS, type MetricKey, type VitalIssue, type VitalsAssessment } from "@/lib/vitals";
import { METRIC_META } from "./display";

export type ConsoleT = (key: MessageKey<"console">, vars?: Record<string, string | number>) => string;

export function formatMetric(metric: MetricKey, value: number | null, locale: Locale): string | null {
  return value === null ? null : formatNumber(value, locale, METRIC_META[metric].digits);
}

export function formatRange(metric: MetricKey, range: [number, number] | null, locale: Locale): string | null {
  if (!range) return null;
  const { unit } = METRIC_META[metric];
  return `${formatNumber(range[0], locale)}–${formatNumber(range[1], locale)}${unit === "lux" ? " lux" : unit}`;
}

export function metricStatusLabel(metric: MetricKey, vitals: VitalsAssessment, growLightOn: boolean | null | undefined, t: ConsoleT): string {
  const m = vitals.metrics[metric];
  if (m.value === null) return t("metric.noData");
  if (metric === "lightLux") {
    if (growLightOn) return t("metric.growLight");
    if (!vitals.daytime) return t("metric.resting");
  }
  if (metric === "waterLevel" && m.level === "low") return t("metric.refill");
  return m.level === "low" ? t("metric.low") : m.level === "high" ? t("metric.high") : t("metric.good");
}

export interface TileText {
  metric: MetricKey;
  label: string;
  value: string | null;
  unit: string;
  statusLabel: string;
  targetLabel: string | null;
}

export function tileTexts(vitals: VitalsAssessment, growLightOn: boolean | null | undefined, t: ConsoleT, locale: Locale): TileText[] {
  return METRIC_KEYS.map((metric) => {
    const m = vitals.metrics[metric];
    const range = formatRange(metric, m.target, locale);
    return {
      metric,
      label: t(`metric.${metric}`),
      value: formatMetric(metric, m.value, locale),
      unit: METRIC_META[metric].unit,
      statusLabel: metricStatusLabel(metric, vitals, growLightOn, t),
      targetLabel: range ? t("metric.target", { range }) : null,
    };
  });
}

export function issueText(issue: VitalIssue, potName: string, t: ConsoleT, locale: Locale): string {
  const value = issue.value === undefined ? "" : formatNumber(issue.value, locale, issue.code === "cold" || issue.code === "hot" ? 1 : 0);
  return t(`issue.${issue.code}`, {
    pot: potName,
    value,
    duration: formatDuration(issue.value ?? 60, locale),
  });
}
