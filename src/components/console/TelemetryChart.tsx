"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { localeTag } from "@/lib/companion/format";
import { seriesRuns, timeTicks } from "@/lib/companion/series";

export interface TelemetryChartProps {
  title: string;
  unit: string;
  digits: number;
  /** Bucketed values, evenly spaced across [start, end). */
  values: (number | null)[];
  start: number;
  end: number;
  target?: [number, number] | null;
  /** Fixed y domain (e.g. 0–100 for percentages). */
  domain?: [number, number];
  /** Per-bucket flag (1 = on) shaded as a background band, e.g. grow light. */
  band?: (number | null)[];
  /** Per-bucket event magnitude drawn as markers on the baseline, e.g. watering seconds. */
  markers?: (number | null)[];
  labels: { target: string; band?: string; markers?: string; empty: string; summary: string };
  locale: Locale;
  timeZone: string;
}

const M = { top: 12, right: 12, bottom: 24, left: 44 };
const HEIGHT = 196;

function niceTicks(lo: number, hi: number, count = 4): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => span / s <= count) ?? 10 * mag;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/**
 * Single-series time chart (hand-rolled SVG): 2px line over a target
 * band, optional on/off band and event markers, crosshair tooltip on hover and
 * keyboard (← → Home End). One series, so no legend box — the title names it.
 */
export function TelemetryChart(props: TelemetryChartProps) {
  const { values, start, end, target, domain, band, markers, unit, digits, labels, locale, timeZone, title } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const descId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = values.length;
  const nums = values.filter((v): v is number => v !== null);
  const hasData = nums.length > 0;

  const [lo, hi] = useMemo(() => {
    if (domain) return domain;
    if (!hasData) return [0, 1];
    let a = Math.min(...nums);
    let b = Math.max(...nums);
    if (target) {
      a = Math.min(a, target[0]);
      b = Math.max(b, Math.min(target[1], b + (b - a) * 0.4));
    }
    const pad = (b - a) * 0.12 || 1;
    a = a >= 0 && a - pad < 0 ? 0 : a - pad;
    b = b + pad;
    const ticks = niceTicks(a, b);
    return [Math.min(a, ticks[0]), Math.max(b, ticks[ticks.length - 1])];
  }, [domain, hasData, nums, target]);

  const innerW = width - M.left - M.right;
  const innerH = HEIGHT - M.top - M.bottom;
  const slot = innerW / Math.max(1, n);
  const x = (i: number) => M.left + (i + 0.5) * slot;
  const y = (v: number) => M.top + innerH - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * innerH;
  const baseline = M.top + innerH;

  const fmt = useMemo(() => new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: digits }), [locale, digits]);
  const unitText = unit === "lux" ? " lux" : unit;
  const span = end - start;
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag(locale), {
        timeZone,
        ...(span > 2 * 86400000 ? { weekday: "short", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" }),
        hourCycle: "h23",
      }),
    [locale, timeZone, span],
  );

  // Line path, split at gaps; lone points (no neighbour to join) become dots.
  const { line, dots } = useMemo(() => {
    const runs = seriesRuns(values);
    const l = runs
      .filter((run) => run.length > 1)
      .map((run) => run.map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(values[i]!).toFixed(1)}`).join(""))
      .join("");
    return { line: l, dots: runs.filter((run) => run.length === 1).map(([i]) => i) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, width, lo, hi]);

  const yTicks = niceTicks(lo, hi);

  // X ticks: every 6 h for a day, midnight for longer ranges (local time).
  const xTicks = useMemo(() => {
    const out: { t: number; label: string }[] = [];
    const step = span > 2 * 86400000 ? 24 : 6;
    const dayFmt = new Intl.DateTimeFormat(localeTag(locale), { timeZone, weekday: "short" });
    const hourFmt = new Intl.DateTimeFormat(localeTag(locale), { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    for (const t of timeTicks(start, end, step, timeZone)) out.push({ t, label: step === 24 ? dayFmt.format(t) : hourFmt.format(t) });
    return out;
  }, [start, end, span, locale, timeZone]);
  const xOf = (t: number) => M.left + ((t - start) / span) * innerW;

  const nearest = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const i = Math.floor((clientX - rect.left - M.left) / slot);
    return Math.min(n - 1, Math.max(0, i));
  };
  const step = (dir: number) => {
    setKeyboard(true);
    setActive((cur) => {
      let i = cur ?? (dir > 0 ? -1 : n);
      do i += dir;
      while (i >= 0 && i < n && values[i] === null);
      return i < 0 || i >= n ? cur : i;
    });
  };

  const activeValue = active !== null ? values[active] : null;
  const activeTime = active !== null ? start + (active + 0.5) * (span / n) : null;
  const readout =
    active !== null && activeTime !== null
      ? `${timeFmt.format(activeTime)}: ${activeValue === null ? "—" : `${fmt.format(activeValue)}${unitText}`}`
      : "";

  return (
    <figure className="min-w-0">
      <div
        ref={wrapRef}
        className="relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-leaf-300/50"
        tabIndex={hasData ? 0 : -1}
        role="img"
        aria-label={`${title}. ${labels.summary}`}
        aria-describedby={descId}
        onPointerMove={(e) => {
          setKeyboard(false);
          setActive(nearest(e.clientX));
        }}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          else if (e.key === "ArrowLeft") step(-1);
          else if (e.key === "Home") {
            setKeyboard(true);
            setActive(Math.max(0, values.findIndex((v) => v !== null)));
          }
          else if (e.key === "End") {
            setKeyboard(true);
            setActive(n - 1);
          } else if (e.key === "Escape") setActive(null);
          else return;
          e.preventDefault();
        }}
      >
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="block h-auto w-full touch-pan-y select-none" aria-hidden>
          {/* Grid + y labels */}
          {yTicks.map((tv) => (
            <g key={tv}>
              <line x1={M.left} x2={width - M.right} y1={y(tv)} y2={y(tv)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={M.left - 8} y={y(tv)} dy="0.32em" textAnchor="end" className="fill-faint text-[10px] tabular-nums">
                {fmt.format(tv)}
              </text>
            </g>
          ))}
          {/* On/off band (e.g. grow light) */}
          {band?.map((b, i) =>
            b ? <rect key={i} x={M.left + i * slot} y={M.top} width={Math.ceil(slot)} height={innerH} fill="var(--color-sun)" opacity={0.08} /> : null,
          )}
          {/* Target range */}
          {target && (
            <rect
              x={M.left}
              width={innerW}
              y={y(target[1])}
              height={Math.max(0, y(target[0]) - y(target[1]))}
              fill="var(--color-leaf-300)"
              opacity={0.07}
            />
          )}
          {/* X ticks */}
          {xTicks.map(({ t, label }) => (
            <g key={t}>
              <line x1={xOf(t)} x2={xOf(t)} y1={baseline} y2={baseline + 4} stroke="var(--color-line-strong)" />
              <text x={xOf(t)} y={HEIGHT - 6} textAnchor="middle" className="fill-faint text-[10px] tabular-nums">
                {label}
              </text>
            </g>
          ))}
          <line x1={M.left} x2={width - M.right} y1={baseline} y2={baseline} stroke="var(--color-line-strong)" />
          {/* Data */}
          <path d={line} fill="none" stroke="var(--color-leaf-300)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {dots.map((i) => (
            <circle key={i} cx={x(i)} cy={y(values[i]!)} r={2.5} fill="var(--color-leaf-300)" />
          ))}
          {markers?.map((m, i) =>
            m ? <circle key={i} cx={x(i)} cy={baseline - 5} r={3.5} fill="var(--color-sky)" stroke="var(--color-surface)" strokeWidth={2} /> : null,
          )}
          {/* Crosshair */}
          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={M.top} y2={baseline} stroke="var(--color-muted)" strokeWidth={1} />
              {activeValue !== null && (
                <circle cx={x(active)} cy={y(activeValue)} r={4.5} fill="var(--color-leaf-300)" stroke="var(--color-surface)" strokeWidth={2} />
              )}
            </g>
          )}
        </svg>
        {!hasData && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">{labels.empty}</p>}
        {active !== null && activeTime !== null && (
          <div
            className="glass pointer-events-none absolute top-1 z-10 rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: Math.min(width - 150, Math.max(0, x(active) - 70)) }}
          >
            <p className="font-semibold text-fg tabular-nums">
              {activeValue === null ? "—" : `${fmt.format(activeValue)}${unitText}`}
            </p>
            <p className="text-muted">{timeFmt.format(activeTime)}</p>
            {band?.[active] ? <p className="text-muted">{labels.band}</p> : null}
            {markers?.[active] ? <p className="text-muted">{`${labels.markers} · ${markers[active]} s`}</p> : null}
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {keyboard ? readout : ""}
        </span>
      </div>
      <figcaption id={descId} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        {target && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-sm bg-leaf-300/20" aria-hidden /> {labels.target}
          </span>
        )}
        {band && labels.band && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-sm bg-sun/20" aria-hidden /> {labels.band}
          </span>
        )}
        {markers && labels.markers && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky" aria-hidden /> {labels.markers}
          </span>
        )}
        <span className="sr-only">{labels.summary}</span>
      </figcaption>
    </figure>
  );
}
