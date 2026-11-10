"use client";

import { Droplet, Droplets, ScanLine, Sun, Thermometer, Waves, type LucideIcon } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type MetricKey = "soil" | "light" | "temp" | "humidity";

interface Metric {
  key: MetricKey;
  icon: LucideIcon;
  unit: string;
  base: number;
  jitter: number;
  decimals: number;
  target: [number, number];
  range: [number, number];
}

const METRICS: Metric[] = [
  { key: "soil", icon: Droplet, unit: "%", base: 44, jitter: 2.2, decimals: 0, target: [35, 55], range: [0, 100] },
  { key: "light", icon: Sun, unit: "klx", base: 12.4, jitter: 0.9, decimals: 1, target: [8, 15], range: [0, 20] },
  { key: "temp", icon: Thermometer, unit: "°C", base: 23.6, jitter: 0.35, decimals: 1, target: [18, 27], range: [10, 35] },
  { key: "humidity", icon: Waves, unit: "%", base: 58, jitter: 1.8, decimals: 0, target: [45, 70], range: [20, 90] },
];
const POINTS = 28;
const RING_ANGLES = [0, 60, 120, 180, 240, 300];

/** Small deterministic PRNG so the server and the first client render agree. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function step(prev: number, m: Metric, rand: () => number) {
  const pull = (m.base - prev) * 0.25;
  const next = prev + pull + (rand() - 0.5) * m.jitter * 2;
  return Math.min(m.target[1] + m.jitter, Math.max(m.target[0] - m.jitter, next));
}

function initialSeries(): Record<MetricKey, number[]> {
  const rand = seeded(7);
  const out = {} as Record<MetricKey, number[]>;
  for (const m of METRICS) {
    const series = [m.base];
    for (let i = 1; i < POINTS; i++) series.push(step(series[i - 1], m, rand));
    out[m.key] = series;
  }
  return out;
}

function Sparkline({ values, range }: { values: number[]; range: [number, number] }) {
  const id = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const w = 120;
  const h = 34;
  const [lo, hi] = range;
  const span = hi - lo || 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.6, span * 0.04);
  const y0 = min - pad;
  const y1 = max + pad;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - y0) / (y1 - y0)) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const ly = pts[pts.length - 1][1];
  return (
    <div className="relative h-9 w-full" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-leaf-300)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--color-leaf-300)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${w},${h}L0,${h}Z`} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke="var(--color-leaf-300)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* End point as HTML so it stays round while the SVG stretches */}
      <span
        className="absolute right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf-200 shadow-[0_0_0_4px_rgb(var(--accent)/0.18),0_0_10px_var(--color-leaf-300)] transition-[top] duration-700"
        style={{ top: `${((ly / h) * 100).toFixed(1)}%` }}
      />
    </div>
  );
}

/** A living "vital signs" panel: numbers drift and sparklines scroll while on screen. */
export function VitalsDashboard() {
  const t = useT("landing");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [series, setSeries] = useState(initialSeries);
  const [tank, setTank] = useState(68);
  const [ring, setRing] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const rand = seeded(Date.now());
    const id = setInterval(() => {
      setSeries((prev) => {
        const next = {} as Record<MetricKey, number[]>;
        for (const m of METRICS) {
          const s = prev[m.key];
          next[m.key] = [...s.slice(1), step(s[s.length - 1], m, rand)];
        }
        return next;
      });
      setTank((v) => (v <= 40 ? 68 : +(v - 0.1).toFixed(1)));
      setRing((r) => (r + 1) % RING_ANGLES.length);
    }, 1400);
    return () => clearInterval(id);
  }, [inView, reduce]);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-3xl border border-fg/10 bg-surface/80 p-4 shadow-[0_40px_120px_-40px_rgb(var(--glow)/0.25)] sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-leaf-300/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex items-center gap-3">
        <div className="shrink-0 rounded-2xl border border-fg/10 bg-screen p-1.5">
          <CompanionFace expression="happy" size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{t("vitals.plant")}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-300/12 px-2 py-0.5 font-medium text-leaf-200">
              {t("vitals.status")}
            </span>
            {t("vitals.mood")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-fg/10 px-2.5 py-1 font-bold tabular-nums text-[10px] tracking-wide text-muted uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-rose/70" />
            <span className="relative size-1.5 rounded-full bg-rose" />
          </span>
          {t("vitals.live")}
        </span>
      </div>

      {/* Metrics */}
      <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {METRICS.map((m) => {
          const values = series[m.key];
          const value = values[values.length - 1];
          const Icon = m.icon;
          return (
            <div key={m.key} className="rounded-2xl border border-fg/[0.06] bg-bg/50 p-3 sm:p-3.5">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Icon className="size-3.5 text-leaf-300" aria-hidden />
                {t(`vitals.${m.key}`)}
              </p>
              <p className="mt-1.5 text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
                {value.toFixed(m.decimals)}
                <span className="ml-1 text-xs font-normal text-muted">{m.unit}</span>
              </p>
              <Sparkline values={values} range={m.range} />
              <p className="mt-1 font-bold tabular-nums text-[10px] text-faint">
                {t("vitals.target", { min: m.target[0], max: m.target[1] })} {m.unit}
              </p>
            </div>
          );
        })}

        {/* Water tank */}
        <div className="col-span-2 flex gap-3 rounded-2xl sm:col-span-1 border border-fg/[0.06] bg-bg/50 p-3 sm:p-3.5">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Droplets className="size-3.5 text-sky" aria-hidden />
              {t("vitals.tank")}
            </p>
            <p className="mt-1.5 text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
              {Math.round(tank)}
              <span className="ml-1 text-xs font-normal text-muted">%</span>
            </p>
            <p className="mt-2 text-[11px] text-faint">{t("vitals.tankDays", { n: Math.max(1, Math.round(tank / 7.5)) })}</p>
          </div>
          <div className="relative w-7 overflow-hidden rounded-xl border border-sky/20 bg-sky/[0.04]">
            <div
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky/50 to-sky/20 transition-[height] duration-1000"
              style={{ height: `${tank}%` }}
            >
              <div className="h-0.5 w-full bg-sky/80" />
            </div>
          </div>
        </div>

        {/* Ring scan */}
        <div className="col-span-2 rounded-2xl border border-fg/[0.06] bg-bg/50 p-3 sm:col-span-1 sm:p-3.5">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ScanLine className="size-3.5 text-leaf-300" aria-hidden />
            {t("vitals.ring")}
          </p>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {RING_ANGLES.map((deg, i) => (
              <div
                key={deg}
                className={cn(
                  "relative aspect-[3/4] overflow-hidden rounded-md border bg-screen transition-colors duration-500",
                  i === ring ? "border-leaf-300/70 shadow-[0_0_12px_rgb(var(--accent)/0.35)]" : "border-fg/[0.06]",
                )}
              >
                <div
                  className="absolute inset-x-0 bottom-0 flex justify-center"
                  style={{ transform: `scaleX(${Math.max(0.35, Math.abs(Math.cos((deg * Math.PI) / 180))).toFixed(2)})` }}
                >
                  <PlantArt plantId="pothos" animated={false} className="w-[120%] max-w-none" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 font-bold tabular-nums text-[10px] text-faint">{t("vitals.ringBody")}</p>
        </div>
      </div>

      {/* Log */}
      <div className="relative mt-4 rounded-2xl border border-fg/[0.06] bg-bg/30 p-3 sm:p-4">
        <p className="eyebrow !text-[10px] !text-faint">{t("vitals.log")}</p>
        <ul className="mt-2.5 space-y-2 text-sm">
          {(
            [
              ["07:00", "vitals.log1", Sun],
              ["09:42", "vitals.log2", Droplets],
              ["12:00", "vitals.log3", ScanLine],
            ] as const
          ).map(([time, key, Icon]) => (
            <li key={key} className="flex items-center gap-3">
              <span className="w-11 shrink-0 font-bold tabular-nums text-xs text-faint ">{time}</span>
              <Icon className="size-3.5 shrink-0 text-leaf-300" aria-hidden />
              <span className="min-w-0 text-fg/85">{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
