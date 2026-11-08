/** Display metadata for vitals in the console. Client-safe, no JSX. */
import type { MetricKey, MetricState, Severity, VitalStatus } from "@/lib/vitals";

export type Tone = "leaf" | "sky" | "sun" | "rose" | "neutral";

export const METRIC_META: Record<MetricKey, { unit: string; digits: number; icon: "soil" | "temp" | "humidity" | "light" | "tank" }> = {
  soilMoisture: { unit: "%", digits: 0, icon: "soil" },
  airTemp: { unit: "°C", digits: 1, icon: "temp" },
  airHumidity: { unit: "%", digits: 0, icon: "humidity" },
  lightLux: { unit: "lux", digits: 0, icon: "light" },
  waterLevel: { unit: "%", digits: 0, icon: "tank" },
};

export const STATUS_TONE: Record<VitalStatus, Tone> = {
  thriving: "leaf",
  ok: "sky",
  needs_attention: "sun",
  critical: "rose",
};

export const SEVERITY_TONE: Record<Severity, Tone> = { info: "sky", warning: "sun", critical: "rose" };

export function metricTone(m: MetricState): Tone {
  if (m.value === null) return "neutral";
  return m.severity ? SEVERITY_TONE[m.severity] : "leaf";
}

/** CSS colour for a tone (marks only; text stays in text tokens). */
export const TONE_COLOR: Record<Tone, string> = {
  leaf: "var(--color-leaf-300)",
  sky: "var(--color-sky)",
  sun: "var(--color-sun)",
  rose: "var(--color-rose)",
  neutral: "var(--color-faint)",
};

export function isDemoSerial(serial: string): boolean {
  return serial.startsWith("OEE-DEMO");
}
