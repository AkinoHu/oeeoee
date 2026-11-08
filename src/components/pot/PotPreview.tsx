"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, type RefObject } from "react";
import { CompanionFaceGraphic } from "@/components/companion-face/CompanionFaceGraphic";
import { getPlantMeta } from "@/components/plant-art/registry";
import { PlantGraphic } from "@/components/plant-art/PlantGraphic";
import { seeded } from "@/components/plant-art/geometry";
import { usePrefersReducedMotion } from "@/components/plant-art/usePrefersReducedMotion";
import { getFinish, getPlant, lt } from "@/data";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Callouts, CalloutLabels, calloutSpecs } from "./Callouts";
import { hexToRgb, luminance, mix, rgbToHex } from "./color";
import { arcD, CX, ELL, GROUND, PARK, POT_SIZES, potLayout, r2, ringPoint, VB_H, VB_W, type PotLayout } from "./geometry";
import "./pot.css";
import type { PotPreviewProps } from "./types";
import { useTween } from "./useTween";

/** Class names from pot.css (plain CSS: the shared turbopack rule disables CSS modules). */
const styles = {
  root: "oe-pot-root",
  wave: "oe-pot-wave",
  bubble: "oe-pot-bubble",
  statusPulse: "oe-pot-status-pulse",
} as const;

const OMEGA = (Math.PI * 2) / 18; // one revolution every 18 s
const DELTA = 0.3; // half-span of the carriage, radians
const TICKS = 30;
const FALLBACK_FINISH = { color: "#ECE7DF", shade: "#C9C1B4" };

type Layer = 0 | 1; // 0 = far side (behind the plant), 1 = near side
type Pair<T> = readonly [RefObject<T | null>, RefObject<T | null>];
interface RingRefs {
  ticks: Pair<SVGPathElement>;
  housing: Pair<SVGPathElement>;
  ledGlow: Pair<SVGPathElement>;
  led: Pair<SVGPathElement>;
  cam: Pair<SVGGElement>;
  glow: RefObject<SVGCircleElement | null>;
}

/** Static soil texture (unit-circle coordinates), seeded so SSR and client agree. */
const SOIL_SPECKS = (() => {
  const rnd = seeded(9);
  return Array.from({ length: 26 }, () => {
    const ang = rnd() * Math.PI * 2;
    const rad = Math.sqrt(rnd()) * 0.86;
    return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, r: 0.5 + rnd() * 0.9, c: rnd() > 0.72 ? "#e9e3d6" : "#6e523a" };
  });
})();

interface RingGeo {
  ring: PotLayout["ring"];
  lightOn: boolean;
  spin: boolean;
  reduced: boolean;
}

function ticksD(ring: PotLayout["ring"], angle: number) {
  let d = "";
  for (let k = 0; k < TICKS; k++) {
    const t = angle + (k / TICKS) * Math.PI * 2;
    const [x, y] = ringPoint(ring, t);
    d += `M${r2(x)} ${r2(y - 1.5)}v3`;
  }
  return d;
}

/** Write the moving parts of the ring for a given carriage angle. */
function paintRing(els: RingRefs, geo: RingGeo, angle: number) {
  const { ring, lightOn } = geo;
  const s = Math.sin(angle);
  const depth = 0.86 + 0.14 * s;
  const housing = arcD(ring.cx, ring.cy, ring.R, ring.r, angle - DELTA, angle + DELTA);
  const led = arcD(ring.cx, ring.cy, ring.R * 0.965, ring.r * 0.965, angle - DELTA * 0.82, angle + DELTA * 0.82);
  const ticks = ticksD(ring, angle * 0.5);
  const [camX, camY] = ringPoint(ring, angle, 1.02);
  for (const i of [0, 1] as Layer[]) {
    els.ticks[i].current?.setAttribute("d", ticks);
    const h = els.housing[i].current;
    if (h) {
      h.setAttribute("d", housing);
      h.setAttribute("stroke-width", String(r2(6.4 * depth)));
    }
    els.ledGlow[i].current?.setAttribute("d", led);
    const l = els.led[i].current;
    if (l) {
      l.setAttribute("d", led);
      l.setAttribute("stroke-width", String(r2(2.1 * depth)));
    }
    els.cam[i].current?.setAttribute("transform", `translate(${r2(camX)} ${r2(camY + 5.2 * depth)}) scale(${r2(depth)})`);
  }
  const g = els.glow.current;
  if (g) {
    const [gx, gy] = ringPoint(ring, angle, 0.62);
    g.setAttribute("cx", String(r2(gx)));
    g.setAttribute("cy", String(r2(gy + 10)));
    g.setAttribute("opacity", lightOn ? String(r2(0.62 + 0.38 * s)) : "0");
  }
}

interface RingLayerProps {
  layer: Layer;
  uid: string;
  ring: PotLayout["ring"];
  color: string;
  highlight: string;
  lightOn: boolean;
  ticksRef: RefObject<SVGPathElement | null>;
  housingRef: RefObject<SVGPathElement | null>;
  ledGlowRef: RefObject<SVGPathElement | null>;
  ledRef: RefObject<SVGPathElement | null>;
  camRef: RefObject<SVGGElement | null>;
}

/**
 * One half of the halo ring: the far half (behind the plant) or the near half
 * (in front of it). Both halves draw the whole ring + carriage, each clipped
 * to its side of the ring's centre line, so the carriage passes behind and in
 * front of the foliage without popping. Moving parts are positioned at the
 * park angle here (SSR) and then driven imperatively by `paintRing`.
 */
function RingLayer({ layer, uid, ring, color, highlight, lightOn, ticksRef, housingRef, ledGlowRef, ledRef, camRef }: RingLayerProps) {
  const near = layer === 1;
  const depth = 0.86 + 0.14 * Math.sin(PARK);
  const housing = arcD(ring.cx, ring.cy, ring.R, ring.r, PARK - DELTA, PARK + DELTA);
  const led = arcD(ring.cx, ring.cy, ring.R * 0.965, ring.r * 0.965, PARK - DELTA * 0.82, PARK + DELTA * 0.82);
  const [camX, camY] = ringPoint(ring, PARK, 1.02);
  return (
    <g clipPath={`url(#${uid}-half${layer})`}>
      <ellipse
        cx={r2(ring.cx)}
        cy={r2(ring.cy)}
        rx={r2(ring.R)}
        ry={r2(ring.r)}
        fill="none"
        stroke={color}
        strokeWidth={near ? 2.6 : 2}
        opacity={near ? 1 : 0.7}
      />
      <ellipse
        cx={r2(ring.cx)}
        cy={r2(ring.cy - 0.7)}
        rx={r2(ring.R)}
        ry={r2(ring.r)}
        fill="none"
        stroke={highlight}
        strokeWidth={0.6}
        opacity={near ? 0.55 : 0.25}
      />
      <path ref={ticksRef} d={ticksD(ring, PARK * 0.5)} stroke={highlight} strokeWidth={0.8} opacity={near ? 0.5 : 0.25} />
      <path
        ref={ledGlowRef}
        d={led}
        fill="none"
        stroke="#fff3c4"
        strokeWidth={9}
        strokeLinecap="round"
        opacity={lightOn ? (near ? 0.32 : 0.5) : 0}
        filter={`url(#${uid}-soft)`}
      />
      <path ref={housingRef} d={housing} fill="none" stroke={color} strokeWidth={r2(6.4 * depth)} strokeLinecap="round" />
      <path
        ref={ledRef}
        d={led}
        fill="none"
        stroke={lightOn ? "#fffbe6" : "#59605b"}
        strokeWidth={r2(2.1 * depth)}
        strokeLinecap="round"
      />
      <g ref={camRef} transform={`translate(${r2(camX)} ${r2(camY + 5.2 * depth)}) scale(${r2(depth)})`}>
        <rect x={-4.6} y={-3.6} width={9.2} height={7.2} rx={3.2} fill={color} />
        <circle r={2.6} fill="#0b1210" />
        <circle r={1.3} fill="#16323f" />
        <circle cx={-0.6} cy={-0.7} r={0.55} fill={lightOn ? "#9fe2ff" : "#5b7d8a"} />
      </g>
    </g>
  );
}

/**
 * The hero product illustration: a smart pot in the chosen finish with a
 * face screen, a water-tank window, a soil probe and the rotating halo ring
 * (camera + LED grow-light carriage) circling the plant.
 * Fills its container width with a 3:4 aspect.
 */
export function PotPreview({
  size,
  finish,
  plantId,
  expression = "neutral",
  ringRotating = true,
  lightOn = true,
  annotated = false,
  className,
  talking = false,
  animated = true,
}: PotPreviewProps) {
  const uid = `pp${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const t = useT("pot");
  const locale = useLocale();
  const reduced = usePrefersReducedMotion();
  const live = animated && !reduced;

  // ── target geometry ──
  const fin = getFinish(finish) ?? FALLBACK_FINISH;
  const spec = POT_SIZES[size] ?? POT_SIZES.M;
  const meta = plantId ? getPlantMeta(plantId) : null;
  const base = potLayout({ w: spec.w, h: spec.h, plantScale: 1, ringY: 0, ringR: 0 });
  // Short plants (succulents, herbs) get a boost so they still read; tall ones are capped by headroom.
  const boost = meta ? Math.min(1.18, Math.max(1, 150 / meta.height)) : 1;
  const plantScale = meta
    ? Math.min(spec.plant * boost, 124 / meta.halfWidth, (base.soilY - 10) / meta.height)
    : spec.plant;
  const canopy = meta ? meta.canopy : 58;
  const ringY = Math.min(base.soilY - 36, Math.max(base.soilY - 176, base.soilY - canopy * plantScale));
  const [cr, cg, cb] = hexToRgb(fin.color);
  const [sr, sg, sb] = hexToRgb(fin.shade);

  const tw = useTween(
    { w: spec.w, h: spec.h, plantScale, ringY, ringR: spec.w / 2 + 17, cr, cg, cb, sr, sg, sb },
    { duration: 0.85, instant: reduced },
  );
  const L = potLayout(tw);
  const color = rgbToHex([tw.cr, tw.cg, tw.cb]);
  const shade = rgbToHex([tw.sr, tw.sg, tw.sb]);
  const light = luminance(color) > 0.5;

  // Derived palette
  const pal = {
    edge: mix(shade, "#000000", 0.28),
    hi: mix(color, "#ffffff", light ? 0.5 : 0.2),
    mid: mix(color, shade, 0.6),
    rim: mix(color, "#ffffff", light ? 0.3 : 0.12),
    collar: mix(color, shade, 0.4),
    inner: mix(shade, "#000000", 0.62),
    innerLow: mix(shade, "#000000", 0.4),
    ring: mix(color, "#ffffff", light ? 0.12 : 0.22),
    ringHi: mix(color, "#ffffff", 0.6),
    plinth: mix(shade, "#000000", 0.55),
  };

  // ── ring animation ──
  const rootRef = useRef<HTMLDivElement>(null);
  const ticksB = useRef<SVGPathElement>(null);
  const ticksF = useRef<SVGPathElement>(null);
  const housingB = useRef<SVGPathElement>(null);
  const housingF = useRef<SVGPathElement>(null);
  const ledGlowB = useRef<SVGPathElement>(null);
  const ledGlowF = useRef<SVGPathElement>(null);
  const ledB = useRef<SVGPathElement>(null);
  const ledF = useRef<SVGPathElement>(null);
  const camB = useRef<SVGGElement>(null);
  const camF = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const elsRef = useRef<RingRefs>({
    ticks: [ticksB, ticksF],
    housing: [housingB, housingF],
    ledGlow: [ledGlowB, ledGlowF],
    led: [ledB, ledF],
    cam: [camB, camF],
    glow: glowRef,
  });
  const angle = useRef(PARK);
  const speed = useRef(0);
  const spin = live && ringRotating && !annotated;
  const geoRef = useRef<RingGeo>({ ring: L.ring, lightOn, spin, reduced });

  // Keep the painter in sync with every render (before paint → no flicker).
  useLayoutEffect(() => {
    geoRef.current = { ring: L.ring, lightOn, spin, reduced };
    if (reduced) angle.current = PARK;
    paintRing(elsRef.current, geoRef.current, angle.current);
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let last = 0;
    let visible = true;
    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const g = geoRef.current;
      if (g.spin) {
        speed.current += (OMEGA - speed.current) * Math.min(1, dt * 1.2);
        angle.current += speed.current * dt;
      } else {
        const turn = Math.PI * 2;
        const goal = PARK + turn * Math.round((angle.current - PARK) / turn);
        const diff = goal - angle.current;
        if (Math.abs(diff) < 0.0008 || g.reduced) {
          angle.current = goal;
          speed.current = 0;
          paintRing(elsRef.current, g, angle.current);
          return;
        }
        speed.current = Math.max(-OMEGA * 3, Math.min(OMEGA * 3, diff * 2.4));
        angle.current += speed.current * dt;
      }
      paintRing(elsRef.current, g, angle.current);
      if (visible) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(root);
    start();
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [spin, reduced]);

  // ── static pieces derived from layout (SSR uses the park angle) ──
  const ring = L.ring;
  const [parkGlowX, parkGlowY] = ringPoint(ring, PARK, 0.62);

  const plantData = getPlant(plantId);
  const plantName = plantData ? lt(plantData.name, locale) : (plantId ?? "").replace(/-/g, " ");
  const finishName = (() => {
    const f = getFinish(finish);
    return f ? lt(f.name, locale) : finish;
  })();
  const aria = plantId
    ? t("aria.pot", { size, finish: finishName, plant: plantName })
    : t("aria.potEmpty", { size, finish: finishName });

  const callouts = annotated ? calloutSpecs(L) : [];

  const plantLayer = () =>
    plantId ? (
      <g transform={`translate(${r2(CX)} ${r2(L.soilY)}) scale(${r2(tw.plantScale)})`}>
        <PlantGraphic plantId={plantId} x={0} y={0} animated={live} variant="potted" />
      </g>
    ) : null;

  const mast = (() => {
    const at = -0.2 * Math.PI; // back-right, so the mast sits behind the plant
    const rr = L.a - L.rimW * 0.5;
    const base: [number, number] = [CX + rr * Math.cos(at), L.T + rr * ELL * Math.sin(at)];
    const top = ringPoint(ring, at);
    const rise = base[1] - top[1];
    return {
      base,
      top,
      d: `M${r2(base[0])} ${r2(base[1])} C${r2(base[0])} ${r2(base[1] - rise * 0.62)} ${r2(top[0])} ${r2(top[1] + rise * 0.3)} ${r2(top[0])} ${r2(top[1])}`,
    };
  })();

  const W = L.water;
  const level = 0.62;
  const waterTop = W.y + W.h * (1 - level);

  return (
    <div
      ref={rootRef}
      className={cn(styles.root, "relative w-full select-none", className)}
      data-size={size}
      data-finish={finish}
      data-plant={plantId ?? "none"}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={aria}>
        <defs>
          <linearGradient id={`${uid}-body`} x1={0} y1={0} x2={1} y2={0}>
            <stop offset={0} stopColor={pal.edge} />
            <stop offset={0.09} stopColor={shade} />
            <stop offset={0.26} stopColor={color} />
            <stop offset={0.37} stopColor={pal.hi} />
            <stop offset={0.52} stopColor={color} />
            <stop offset={0.8} stopColor={pal.mid} />
            <stop offset={0.95} stopColor={pal.edge} />
            <stop offset={1} stopColor={mix(shade, "#ffffff", 0.12)} />
          </linearGradient>
          <linearGradient id={`${uid}-ao`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor="#000" stopOpacity={0.22} />
            <stop offset={0.1} stopColor="#000" stopOpacity={0} />
            <stop offset={0.72} stopColor="#000" stopOpacity={0} />
            <stop offset={1} stopColor="#000" stopOpacity={0.28} />
          </linearGradient>
          <linearGradient id={`${uid}-collar`} x1={0} y1={0} x2={1} y2={0}>
            <stop offset={0} stopColor={pal.edge} />
            <stop offset={0.3} stopColor={pal.collar} />
            <stop offset={0.4} stopColor={mix(pal.collar, "#ffffff", 0.25)} />
            <stop offset={0.7} stopColor={pal.collar} />
            <stop offset={1} stopColor={pal.edge} />
          </linearGradient>
          <linearGradient id={`${uid}-rim`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor={mix(pal.rim, shade, 0.35)} />
            <stop offset={1} stopColor={pal.rim} />
          </linearGradient>
          <linearGradient id={`${uid}-inner`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor={pal.inner} />
            <stop offset={1} stopColor={pal.innerLow} />
          </linearGradient>
          <radialGradient id={`${uid}-soil`} cx={0.45} cy={0.4} r={0.65}>
            <stop offset={0} stopColor="#4b3727" />
            <stop offset={1} stopColor="#22170f" />
          </radialGradient>
          <linearGradient id={`${uid}-water`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor="#9be2ff" stopOpacity={0.95} />
            <stop offset={1} stopColor="#2f8fd0" stopOpacity={0.95} />
          </linearGradient>
          <radialGradient id={`${uid}-shadow`}>
            <stop offset={0} stopColor="#000" stopOpacity={0.6} />
            <stop offset={0.6} stopColor="#000" stopOpacity={0.25} />
            <stop offset={1} stopColor="#000" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${uid}-ambient`}>
            <stop offset={0} stopColor="#9be34a" stopOpacity={0.16} />
            <stop offset={0.55} stopColor="#9be34a" stopOpacity={0.05} />
            <stop offset={1} stopColor="#9be34a" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${uid}-lamp`}>
            <stop offset={0} stopColor="#fff4cf" stopOpacity={0.5} />
            <stop offset={0.45} stopColor="#eaffc4" stopOpacity={0.14} />
            <stop offset={1} stopColor="#f2ffd0" stopOpacity={0} />
          </radialGradient>
          <filter id={`${uid}-soft`} x={-0.5} y={-2} width={2} height={5}>
            <feGaussianBlur stdDeviation={3} />
          </filter>
          <filter id={`${uid}-blur`} x={-0.3} y={-1} width={1.6} height={3}>
            <feGaussianBlur stdDeviation={2.2} />
          </filter>
          <clipPath id={`${uid}-half0`}>
            <rect x={0} y={0} width={VB_W} height={r2(ring.cy)} />
          </clipPath>
          <clipPath id={`${uid}-half1`}>
            <rect x={0} y={r2(ring.cy)} width={VB_W} height={r2(VB_H - ring.cy)} />
          </clipPath>
          <clipPath id={`${uid}-opening`}>
            <ellipse cx={CX} cy={r2(L.openY)} rx={r2(L.openA)} ry={r2(L.openA * ELL)} />
          </clipPath>
          <clipPath id={`${uid}-window`}>
            <rect x={r2(W.x)} y={r2(W.y)} width={r2(W.w)} height={r2(W.h)} rx={r2(W.w / 2)} />
          </clipPath>
          {plantId && (
            <mask id={`${uid}-lit`} maskUnits="userSpaceOnUse" x={0} y={0} width={VB_W} height={VB_H} style={{ maskType: "alpha" }}>
              {plantLayer()}
            </mask>
          )}
        </defs>

        {/* ambience + ground shadow */}
        {lightOn && <ellipse cx={CX} cy={r2(ring.cy + 6)} rx={r2(ring.R * 1.45)} ry={r2(ring.R * 1.3)} fill={`url(#${uid}-ambient)`} />}
        <ellipse cx={CX} cy={GROUND + 1} rx={r2(L.b * 1.55)} ry={r2(L.b * 0.3)} fill={`url(#${uid}-shadow)`} />

        {/* ring: far half + struts */}
        <RingLayer
          layer={0}
          uid={uid}
          ring={ring}
          color={pal.ring}
          highlight={pal.ringHi}
          lightOn={lightOn}
          ticksRef={ticksB}
          housingRef={housingB}
          ledGlowRef={ledGlowB}
          ledRef={ledB}
          camRef={camB}
        />
        {/* pot */}
        <path d={L.plinth} fill={pal.plinth} />
        <ellipse
          cx={CX}
          cy={r2(GROUND - 0.5)}
          rx={r2(L.pa * 0.9)}
          ry={r2(L.pa * ELL * 0.8)}
          fill="none"
          stroke="#b6f36b"
          strokeWidth={1.2}
          opacity={0.45}
          filter={`url(#${uid}-blur)`}
          className={live ? styles.statusPulse : undefined}
        />
        <path d={L.body} fill={`url(#${uid}-body)`} />
        <path d={L.body} fill={`url(#${uid}-ao)`} />
        <path d={L.collar} fill={`url(#${uid}-collar)`} />
        <path d={L.groove} fill="none" stroke={pal.edge} strokeWidth={1.1} opacity={0.7} />
        <path d={L.groove} fill="none" stroke={pal.hi} strokeWidth={0.6} opacity={0.5} transform="translate(0 1.1)" />

        {/* screen */}
        <rect
          x={r2(L.screen.x - 3 * L.u)}
          y={r2(L.screen.y - 3 * L.u)}
          width={r2(L.screen.w + 6 * L.u)}
          height={r2(L.screen.h + 6 * L.u)}
          rx={r2(L.screen.h * 0.36)}
          fill="#0a0f0d"
          stroke={pal.edge}
          strokeWidth={0.8}
        />
        <CompanionFaceGraphic
          expression={expression}
          talking={talking}
          x={r2(L.screen.x)}
          y={r2(L.screen.y)}
          width={r2(L.screen.w)}
          animated={live}
        />
        {/* mic / speaker dots */}
        {[-2, -1, 0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={r2(CX + i * 3.4 * L.u)}
            cy={r2(L.screen.y + L.screen.h + 7 * L.u)}
            r={r2(0.8 * L.u)}
            fill={pal.edge}
            opacity={0.65}
          />
        ))}

        {/* water tank window */}
        <rect x={r2(W.x - 1.2)} y={r2(W.y - 1.2)} width={r2(W.w + 2.4)} height={r2(W.h + 2.4)} rx={r2(W.w / 2 + 1.2)} fill={pal.edge} opacity={0.6} />
        <g clipPath={`url(#${uid}-window)`}>
          <rect x={r2(W.x)} y={r2(W.y)} width={r2(W.w)} height={r2(W.h)} fill="#0b1513" />
          <rect x={r2(W.x)} y={r2(waterTop)} width={r2(W.w)} height={r2(W.h)} fill={`url(#${uid}-water)`} />
          <g className={live ? styles.wave : undefined} style={{ ["--wave" as string]: `${-r2(W.w)}px` }}>
            <path
              d={`M${r2(W.x - W.w)} ${r2(waterTop)} q${r2(W.w / 4)} -1.6 ${r2(W.w / 2)} 0 t${r2(W.w / 2)} 0 t${r2(W.w / 2)} 0 t${r2(W.w / 2)} 0 t${r2(W.w / 2)} 0 t${r2(W.w / 2)} 0 v3 h${r2(-W.w * 3)}Z`}
              fill="#c8f0ff"
              opacity={0.75}
            />
          </g>
          {[0, 1].map((i) => (
            <circle
              key={i}
              cx={r2(W.x + W.w * (0.35 + i * 0.3))}
              cy={r2(W.y + W.h - 4 - i * 6)}
              r={0.9}
              fill="#e6f8ff"
              className={live ? styles.bubble : undefined}
              style={{ animationDelay: `${-i * 2.1}s`, ["--rise" as string]: `${-r2(W.h * level * 0.8)}px` }}
              opacity={live ? undefined : 0}
            />
          ))}
          <rect x={r2(W.x + 1)} y={r2(W.y)} width={1} height={r2(W.h)} fill="#fff" opacity={0.18} />
        </g>
        {[0.25, 0.5, 0.75].map((f) => (
          <path
            key={f}
            d={`M${r2(W.x - 3.2)} ${r2(W.y + W.h * f)} h2`}
            stroke={pal.edge}
            strokeWidth={0.7}
            opacity={0.7}
          />
        ))}

        {/* rim, opening, soil */}
        <ellipse cx={CX} cy={r2(L.T)} rx={r2(L.a)} ry={r2(L.ryT)} fill={`url(#${uid}-rim)`} />
        <ellipse cx={CX} cy={r2(L.openY)} rx={r2(L.openA)} ry={r2(L.openA * ELL)} fill={`url(#${uid}-inner)`} />
        <g clipPath={`url(#${uid}-opening)`}>
          <ellipse cx={CX} cy={r2(L.soilY)} rx={r2(L.openA - 0.5)} ry={r2((L.openA - 0.5) * ELL)} fill={`url(#${uid}-soil)`} />
          {SOIL_SPECKS.map((s, i) => (
            <circle
              key={i}
              cx={r2(CX + s.x * L.openA)}
              cy={r2(L.soilY + s.y * L.openA * ELL)}
              r={r2(s.r * L.u)}
              fill={s.c}
              opacity={0.85}
            />
          ))}
        </g>

        {/* mast holding the halo ring (back-right, behind the plant) */}
        <path d={mast.d} fill="none" stroke={pal.edge} strokeWidth={3.6} strokeLinecap="round" />
        <path d={mast.d} fill="none" stroke={pal.ring} strokeWidth={2.4} strokeLinecap="round" />
        <path d={mast.d} fill="none" stroke={pal.ringHi} strokeWidth={0.6} strokeLinecap="round" opacity={0.6} transform="translate(-0.7 0)" />
        <rect
          x={r2(mast.base[0] - 4 * L.u)}
          y={r2(mast.base[1] - 3.2 * L.u)}
          width={r2(8 * L.u)}
          height={r2(6 * L.u)}
          rx={r2(2.6 * L.u)}
          fill={pal.ring}
          stroke={pal.edge}
          strokeWidth={0.5}
        />
        <circle cx={r2(mast.top[0])} cy={r2(mast.top[1])} r={2.6} fill={pal.ring} stroke={pal.edge} strokeWidth={0.5} />

        {/* plant */}
        <AnimatePresence initial={false}>
          {plantId && (
            <motion.g
              key={plantId}
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{ originX: "50%", originY: "100%" }}
            >
              {plantLayer()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* grow light falling on the leaves */}
        {plantId && (
          <g mask={`url(#${uid}-lit)`} style={{ mixBlendMode: "screen" }}>
            <circle
              ref={glowRef}
              cx={r2(parkGlowX)}
              cy={r2(parkGlowY + 10)}
              r={r2(ring.R * 0.85)}
              fill={`url(#${uid}-lamp)`}
              opacity={lightOn ? r2(0.62 + 0.38 * Math.sin(PARK)) : 0}
            />
          </g>
        )}

        {/* soil probe */}
        <g>
          <rect
            x={r2(L.probe.x - 1.6 * L.u)}
            y={r2(L.probe.top)}
            width={r2(3.2 * L.u)}
            height={r2(L.probe.base - L.probe.top)}
            rx={r2(1.6 * L.u)}
            fill={mix(pal.ring, "#000000", 0.08)}
          />
          <rect
            x={r2(L.probe.x - 3.4 * L.u)}
            y={r2(L.probe.top - 3 * L.u)}
            width={r2(6.8 * L.u)}
            height={r2(5.6 * L.u)}
            rx={r2(2.6 * L.u)}
            fill={pal.ring}
            stroke={pal.edge}
            strokeWidth={0.4}
          />
          <circle
            cx={r2(L.probe.x + 1.2 * L.u)}
            cy={r2(L.probe.top - 0.2 * L.u)}
            r={r2(1.1 * L.u)}
            fill="#b6f36b"
            className={live ? styles.statusPulse : undefined}
          />
        </g>

        {/* ring: near half */}
        <RingLayer
          layer={1}
          uid={uid}
          ring={ring}
          color={pal.ring}
          highlight={pal.ringHi}
          lightOn={lightOn}
          ticksRef={ticksF}
          housingRef={housingF}
          ledGlowRef={ledGlowF}
          ledRef={ledF}
          camRef={camF}
        />

        <AnimatePresence initial={false}>{annotated && <Callouts key="callouts" specs={callouts} />}</AnimatePresence>
      </svg>
      <AnimatePresence initial={false}>{annotated && <CalloutLabels key="labels" specs={callouts} />}</AnimatePresence>
    </div>
  );
}
