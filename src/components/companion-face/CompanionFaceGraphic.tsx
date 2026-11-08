"use client";

import { AnimatePresence, motion, useAnimate, type Transition } from "motion/react";
import { useEffect, useId, useState } from "react";
import { usePrefersReducedMotion } from "@/components/plant-art/usePrefersReducedMotion";
import {
  EYE_L_X,
  EYE_R_X,
  EYE_Y,
  FACE_H,
  FACE_W,
  FACES,
  type EyeSpec,
  type Extra,
  type FaceSpec,
  type MouthSpec,
  type P,
} from "./expressions";
import "./face.css";
import type { Expression } from "./types";

/** Class names from face.css (plain CSS: the shared turbopack rule disables CSS modules). */
const styles = {
  beat: "oe-face-beat",
  bob: "oe-face-bob",
  breathe: "oe-face-breathe",
  fall: "oe-face-fall",
  float: "oe-face-float",
  twinkle: "oe-face-twinkle",
} as const;

export interface CompanionFaceGraphicProps {
  expression?: Expression;
  talking?: boolean;
  /** Top-left of the face box in the parent SVG's units. */
  x?: number;
  y?: number;
  /** Width of the face box in the parent SVG's units (height = width × 3/4). Default 160. */
  width?: number;
  /** Draw the dark rounded glass screen behind the face. Default true. */
  screen?: boolean;
  /** Idle life: blinking, glances, breathing, looping accents. Default true. */
  animated?: boolean;
}

export const LEAF = "#b6f36b";
const ROSE = "#ff7a90";
const SKY = "#7cd4ff";

const n = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};
const p = (q: P) => `${n(q[0])} ${n(q[1])}`;

const SPRING: Transition = { type: "spring", stiffness: 230, damping: 22, mass: 0.9 };
const SOFT: Transition = { duration: 0.45, ease: [0.33, 1, 0.68, 1] };

/** Deterministic idle schedule (seconds) — no randomness during render. */
const BLINK_GAPS = [2.6, 4.3, 3.1, 5.2, 2.2, 3.8, 4.7, 3.4];
const LOOK_SEQ: readonly (-1 | 0 | 1)[] = [1, 0, -1, 0, 0, 1, 0, -1, 0];

function mouthD(m: MouthSpec) {
  return `M${p(m.l)} C${p(m.u1)} ${p(m.u2)} ${p(m.r)} C${p(m.d1)} ${p(m.d2)} ${p(m.l)}Z`;
}

/** Speaking mouth frames built around the expression's mouth. */
function talkFrames(m: MouthSpec): string[] {
  const cx = (m.l[0] + m.r[0]) / 2;
  const cy = Math.min(m.l[1], m.r[1]) + 1;
  const half = Math.max(6, Math.min(10, (m.r[0] - m.l[0]) / 2));
  const frame = (o: number, wv: number) => {
    const w = half * wv;
    const shape: MouthSpec = {
      l: [cx - w, cy],
      r: [cx + w, cy],
      u1: [cx - w * 0.55, cy - 2 - o * 1.5],
      u2: [cx + w * 0.55, cy - 2 - o * 1.5],
      d1: [cx + w * 0.7, cy + 2 + o * 9],
      d2: [cx - w * 0.7, cy + 2 + o * 9],
    };
    return mouthD(shape);
  };
  const seq: [number, number][] = [
    [0.15, 1],
    [0.85, 0.85],
    [0.35, 1],
    [1, 0.8],
    [0.25, 1.05],
    [0.7, 0.9],
    [0.1, 1],
  ];
  return [...seq.map(([o, w]) => frame(o, w)), frame(0.15, 1)];
}

interface EyeGeo {
  ex: number;
  ey: number;
  rect: { attrX: number; attrY: number; width: number; height: number; rx: number };
  lid: string;
  low: { cx: number; cy: number; rx: number; ry: number };
  glint: { cx: number; cy: number; r: number };
  brow: string;
}

function eyeGeo(e: EyeSpec, side: "L" | "R", cx: number, lookDx: number, f: FaceSpec): EyeGeo {
  const ex = cx + e.dx + lookDx;
  const ey = EYE_Y + e.dy;
  const top = ey - e.h / 2;
  const lidY = top + e.lid * e.h;
  const sign = side === "L" ? -1 : 1;
  const t = Math.tan((e.lidAng * Math.PI) / 180);
  const yAt = (x: number) => lidY + t * (x - ex) * sign;
  const xa = ex - e.w * 0.8 - 6;
  const xb = ex + e.w * 0.8 + 6;
  const lid = `M${p([xa, top - 40])} L${p([xb, top - 40])} L${p([xb, yAt(xb)])} L${p([xa, yAt(xa)])}Z`;
  const R = e.h * 0.85;
  const low = {
    cx: n(ex),
    cy: n(ey + e.h / 2 + R - e.low * e.h + (e.low === 0 ? 4 : 0)),
    rx: n(e.w * 0.85),
    ry: n(R),
  };
  const b = f.brows;
  const lift = side === "L" ? b.liftL : b.liftR;
  const by = top - 7 - lift;
  const outer: P = [ex + sign * 11, by + b.tilt * 0.45];
  const inner: P = [ex - sign * 9, by - b.tilt];
  const mid: P = [(outer[0] + inner[0]) / 2, (outer[1] + inner[1]) / 2 - 1.8];
  return {
    ex,
    ey,
    rect: {
      attrX: n(ex - e.w / 2),
      attrY: n(ey - e.h / 2),
      width: n(e.w),
      height: n(e.h),
      rx: n(Math.min(e.r, e.w / 2, e.h / 2)),
    },
    lid,
    low,
    glint: { cx: n(ex + e.w * 0.2), cy: n(ey - e.h * 0.21), r: n(3.1 * Math.min(1, e.w / 26)) },
    brow: `M${p(outer)} Q${p(mid)} ${p(inner)}`,
  };
}

const HEART =
  "M0 10.5 C-6 6.5 -15 1 -15 -6 C-15 -11.5 -10.5 -14.5 -6.6 -14.5 C-3.6 -14.5 -1.4 -12.6 0 -10.2 C1.4 -12.6 3.6 -14.5 6.6 -14.5 C10.5 -14.5 15 -11.5 15 -6 C15 1 6 6.5 0 10.5Z";
const DROP = "M0 -9 C3.6 -3.6 7 0.6 7 4.4 C7 8.4 3.9 11 0 11 C-3.9 11 -7 8.4 -7 4.4 C-7 0.6 -3.6 -3.6 0 -9Z";
const star = (s: number) =>
  `M0 ${-s} Q${n(s * 0.18)} ${n(-s * 0.18)} ${s} 0 Q${n(s * 0.18)} ${n(s * 0.18)} 0 ${s} Q${n(-s * 0.18)} ${n(s * 0.18)} ${-s} 0 Q${n(-s * 0.18)} ${n(-s * 0.18)} 0 ${-s}Z`;

function Accent({ extra, uid, eyeR }: { extra: Extra; uid: string; eyeR: EyeGeo }) {
  const delay = (s: number) => ({ animationDelay: `${s}s` });
  switch (extra) {
    case "sparkles":
      return (
        <g fill="#efffd6">
          {[
            [24, 30, 7, 0],
            [138, 26, 9, -0.6],
            [142, 76, 5, -1.1],
            [18, 80, 4.5, -0.3],
          ].map(([x, y, s, d], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d={star(s)} className={styles.twinkle} style={delay(d)} />
            </g>
          ))}
        </g>
      );
    case "zzz":
      return (
        <g fill="none" stroke={LEAF} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          {[
            [118, 34, 6, 0],
            [128, 22, 8, -1.05],
            [140, 10, 10, -2.1],
          ].map(([x, y, k, d], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d={`M0 0 H${k} L0 ${k} H${k}`} className={styles.float} style={delay(d)} />
            </g>
          ))}
        </g>
      );
    case "drop":
      return (
        <g transform="translate(136 24)">
          <g className={styles.bob}>
            <path d={DROP} fill={`url(#${uid}-water)`} stroke={SKY} strokeWidth={1.6} />
            <ellipse cx={-2.6} cy={-1.4} rx={1.1} ry={2.2} fill="#fff" opacity={0.7} />
          </g>
        </g>
      );
    case "sweat":
      return (
        <g transform="translate(130 32) scale(0.62)">
          <path d={DROP} fill={SKY} className={styles.fall} style={{ animationDuration: "3.4s" }} />
        </g>
      );
    case "tear":
      return (
        <g transform={`translate(${n(eyeR.ex - 7)} ${n(eyeR.ey + 18)}) scale(0.5)`}>
          <path d={DROP} fill={SKY} className={styles.fall} />
        </g>
      );
    case "question":
      return (
        <g transform="translate(138 28)">
          <g className={styles.bob}>
            <path
              d="M-4.6 -4.4 C-4.6 -10 4.6 -10 4.6 -4.4 C4.6 -0.8 0 0 0 3.6"
              fill="none"
              stroke={LEAF}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
            <circle cx={0} cy={8.6} r={1.7} fill={LEAF} />
          </g>
        </g>
      );
    case "hearts":
      return (
        <g fill={ROSE}>
          {[
            [136, 30, 0.42, 0],
            [24, 36, 0.32, -1.6],
          ].map(([x, y, s, d], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <path d={HEART} className={styles.float} style={delay(d)} />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

/**
 * The companion's face as an SVG `<g>` — embed it in any SVG (e.g. the pot's
 * screen) without foreignObject. Drawn in a 160×120 box scaled to `width`.
 */
export function CompanionFaceGraphic({
  expression = "neutral",
  talking = false,
  x = 0,
  y = 0,
  width = FACE_W,
  screen = true,
  animated = true,
}: CompanionFaceGraphicProps) {
  const uid = `cf${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const reduced = usePrefersReducedMotion();
  const live = animated && !reduced;
  const f = FACES[expression] ?? FACES.neutral;

  // Blinking: imperative, so it never re-renders the face.
  const [blinkScope, animateBlink] = useAnimate<SVGGElement>();
  useEffect(() => {
    if (!live || !f.blink) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        const el = blinkScope.current;
        if (el) {
          const twice = i % 4 === 3;
          animateBlink(
            el,
            { scaleY: twice ? [1, 0.08, 1, 0.08, 1] : [1, 0.08, 1] },
            { duration: twice ? 0.42 : 0.2, ease: "easeInOut" },
          );
        }
        i++;
        loop();
      }, BLINK_GAPS[i % BLINK_GAPS.length] * 1000);
    };
    loop();
    return () => clearTimeout(timer);
  }, [live, f.blink, animateBlink, blinkScope]);

  // Glances: an occasional look to the side.
  const [lookStep, setLookStep] = useState(0);
  useEffect(() => {
    if (!live || !f.look) return;
    const id = setInterval(() => setLookStep((s) => s + 1), 2600);
    return () => clearInterval(id);
  }, [live, f.look]);
  const lookDx = live && f.look ? LOOK_SEQ[lookStep % LOOK_SEQ.length] * 3.2 : 0;

  const L = eyeGeo(f.L, "L", EYE_L_X, lookDx, f);
  const R = eyeGeo(f.R, "R", EYE_R_X, lookDx, f);
  const mouth = mouthD(f.mouth);
  const scale = width / FACE_W;

  return (
    <g transform={`translate(${n(x)} ${n(y)})${scale !== 1 ? ` scale(${n(scale)})` : ""}`}>
      <defs>
        <linearGradient id={`${uid}-eye`} x1={0} y1={18} x2={0} y2={84} gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor="#f3ffd9" />
          <stop offset={0.42} stopColor={LEAF} />
          <stop offset={1} stopColor="#86d63f" />
        </linearGradient>
        <linearGradient id={`${uid}-heart`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#ffc2cd" />
          <stop offset={1} stopColor={ROSE} />
        </linearGradient>
        <linearGradient id={`${uid}-water`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={SKY} stopOpacity={0.08} />
          <stop offset={0.56} stopColor={SKY} stopOpacity={0.08} />
          <stop offset={0.57} stopColor={SKY} />
          <stop offset={1} stopColor="#3aa6e8" />
        </linearGradient>
        <radialGradient id={`${uid}-blush`}>
          <stop offset={0} stopColor={ROSE} stopOpacity={0.9} />
          <stop offset={1} stopColor={ROSE} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-glass`} cx={0.5} cy={0.42} r={0.75}>
          <stop offset={0} stopColor="#122219" />
          <stop offset={0.7} stopColor="#09130e" />
          <stop offset={1} stopColor="#050b08" />
        </radialGradient>
        <radialGradient id={`${uid}-sheen`} cx={0.18} cy={0.02} r={0.75} gradientTransform="translate(0.18 0.02) scale(1 0.6) translate(-0.18 -0.02)">
          <stop offset={0} stopColor="#fff" stopOpacity={0.1} />
          <stop offset={0.55} stopColor="#fff" stopOpacity={0.03} />
          <stop offset={1} stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <filter id={`${uid}-bloom`} x={-20} y={-20} width={200} height={160} filterUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceGraphic" stdDeviation={7} result="wide" />
          <feGaussianBlur in="SourceGraphic" stdDeviation={2.2} result="tight" />
          <feComponentTransfer in="wide" result="wideSoft">
            <feFuncA type="linear" slope={0.7} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="wideSoft" />
            <feMergeNode in="tight" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`${uid}-screen`}>
          <rect x={0} y={0} width={FACE_W} height={FACE_H} rx={28} />
        </clipPath>
        <mask id={`${uid}-eyes`} maskUnits="userSpaceOnUse" x={0} y={0} width={FACE_W} height={FACE_H}>
          <g ref={blinkScope}>
            {[L, R].map((g, i) => (
              <motion.rect key={i} initial={false} animate={g.rect} transition={SPRING} fill="#fff" />
            ))}
          </g>
          {[L, R].map((g, i) => (
            <motion.path key={`lid${i}`} initial={false} animate={{ d: g.lid }} transition={SPRING} fill="#000" />
          ))}
          {[L, R].map((g, i) => (
            <motion.ellipse key={`low${i}`} initial={false} animate={g.low} transition={SPRING} fill="#000" />
          ))}
        </mask>
      </defs>

      {screen && (
        <>
          <rect x={0} y={0} width={FACE_W} height={FACE_H} rx={28} fill={`url(#${uid}-glass)`} />
          <rect
            x={0.75}
            y={0.75}
            width={FACE_W - 1.5}
            height={FACE_H - 1.5}
            rx={27.25}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.07}
            strokeWidth={1.5}
          />
        </>
      )}

      <g clipPath={`url(#${uid}-screen)`}>
        <g transform="translate(80 60) scale(1.08) translate(-80 -60)">
          <motion.g initial={false} animate={{ rotate: f.tilt }} transition={SPRING}>
            <g className={live ? styles.breathe : undefined}>
              {/* blush */}
              <motion.g initial={false} animate={{ opacity: f.blush }} transition={SOFT}>
                <ellipse cx={36} cy={74} rx={13} ry={7} fill={`url(#${uid}-blush)`} />
                <ellipse cx={124} cy={74} rx={13} ry={7} fill={`url(#${uid}-blush)`} />
              </motion.g>

              <g filter={`url(#${uid}-bloom)`}>
                {/* eyes */}
                <g mask={`url(#${uid}-eyes)`}>
                  <rect x={0} y={0} width={FACE_W} height={FACE_H} fill={`url(#${uid}-eye)`} />
                  {[L, R].map((g, i) => (
                    <motion.circle
                      key={i}
                      initial={false}
                      animate={{ ...g.glint, opacity: f.glint }}
                      transition={SPRING}
                      fill="#ffffff"
                    />
                  ))}
                </g>

                {/* heart eyes */}
                {[L, R].map((g, i) => (
                  <g key={`h${i}`} transform={`translate(${n(g.ex)} ${n(g.ey)})`}>
                    <motion.g
                      initial={false}
                      animate={{ scale: f.hearts ? 1 : 0.2, opacity: f.hearts ? 1 : 0 }}
                      transition={f.hearts ? { type: "spring", stiffness: 320, damping: 14 } : SOFT}
                    >
                      <path d={HEART} fill={`url(#${uid}-heart)`} className={live && f.hearts ? styles.beat : undefined} />
                    </motion.g>
                  </g>
                ))}

                {/* brows */}
                {[L, R].map((g, i) => (
                  <motion.path
                    key={`b${i}`}
                    initial={false}
                    animate={{ d: g.brow, opacity: i === 0 ? f.brows.oL : f.brows.oR }}
                    transition={SPRING}
                    fill="none"
                    stroke={LEAF}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                  />
                ))}

                {/* mouth */}
                <motion.path
                  initial={false}
                  animate={{ d: talking ? talkFrames(f.mouth) : mouth }}
                  transition={talking ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : SPRING}
                  fill="#1d3d12"
                  stroke={LEAF}
                  strokeWidth={4.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* mood accents */}
                <AnimatePresence initial={false}>
                  {f.extra !== "none" && (
                    <motion.g
                      key={f.extra}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={SOFT}
                    >
                      <Accent extra={f.extra} uid={uid} eyeR={R} />
                    </motion.g>
                  )}
                </AnimatePresence>
              </g>
            </g>
          </motion.g>
        </g>
      </g>

      {screen && <rect x={0} y={0} width={FACE_W} height={FACE_H} rx={28} fill={`url(#${uid}-sheen)`} pointerEvents="none" />}
    </g>
  );
}
