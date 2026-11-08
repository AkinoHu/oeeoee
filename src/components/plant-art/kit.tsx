"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { leafShape, n, place, type LeafOpts, type LeafShape } from "./geometry";
import "./plant-art.css";

/** Class names from plant-art.css (plain CSS: the shared turbopack rule disables CSS modules). */
const styles = { bob: "oe-plant-bob", flutter: "oe-plant-flutter", sway: "oe-plant-sway" } as const;

/**
 * Shared building blocks for the plant illustrations: an id scope (so several
 * illustrations can live on one page without gradient-id collisions), the
 * animation switch, gradients and a layered `Leaf` primitive that gives every
 * plant the same flat-layered, softly shaded look.
 */

interface ArtScope {
  /** Unique, CSS-safe prefix for ids inside this illustration. */
  uid: string;
  animated: boolean;
  /** "potted" lets trailing plants hang further down over the pot rim. */
  variant: "standalone" | "potted";
}

const ScopeCtx = createContext<ArtScope>({ uid: "plant", animated: false, variant: "standalone" });

export function ArtScopeProvider({ value, children }: { value: ArtScope; children: ReactNode }) {
  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}

export function useArt() {
  const scope = useContext(ScopeCtx);
  return {
    ...scope,
    id: (name: string) => `${scope.uid}-${name}`,
    url: (name: string) => `url(#${scope.uid}-${name})`,
  };
}

// ── Palette ──────────────────────────────────────────────────

export const INK = "#0b2414"; // deep shadow used for folded-leaf shading
export const SHEEN = "#ffffff";

// ── Gradients ────────────────────────────────────────────────

type Stop = readonly [offset: number, color: string, opacity?: number];

export function LinGrad({
  id,
  stops,
  x1 = 0,
  y1 = 1,
  x2 = 0,
  y2 = 0,
  userSpace,
}: {
  id: string;
  stops: readonly Stop[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  userSpace?: boolean;
}) {
  return (
    <linearGradient
      id={id}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      gradientUnits={userSpace ? "userSpaceOnUse" : undefined}
    >
      {stops.map(([o, c, a], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
      ))}
    </linearGradient>
  );
}

export function RadGrad({
  id,
  stops,
  cx = 0.5,
  cy = 0.5,
  r = 0.5,
  fx,
  fy,
}: {
  id: string;
  stops: readonly Stop[];
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
}) {
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={r} fx={fx} fy={fy}>
      {stops.map(([o, c, a], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
      ))}
    </radialGradient>
  );
}

/** Base→tip leaf gradient (objectBoundingBox, follows each leaf's rotation). */
export function LeafGrad({ id, base, mid, tip }: { id: string; base: string; mid?: string; tip: string }) {
  const stops: Stop[] = mid ? [[0, base], [0.55, mid], [1, tip]] : [[0, base], [1, tip]];
  return <LinGrad id={id} stops={stops} x1={0.2} y1={1} x2={0.8} y2={0} />;
}

/** The standard soft sheen used on glossy leaves. */
export function SheenGrad({ id }: { id: string }) {
  return (
    <LinGrad
      id={id}
      stops={[
        [0, SHEEN, 0],
        [0.55, SHEEN, 0.55],
        [1, SHEEN, 0.1],
      ]}
      x1={0}
      y1={1}
      x2={0.3}
      y2={0}
    />
  );
}

// ── Motion wrappers ─────────────────────────────────────────

export interface MotionSpec {
  amp: number;
  dur: number;
  delay: number;
}

/** Deterministic flutter parameters for the i-th element. */
export function flutterSpec(i: number, amp = 2.2, base = 4.6): MotionSpec {
  return {
    amp: n(amp * (0.65 + ((i * 37) % 10) / 22)),
    dur: n(base + ((i * 53) % 17) / 10),
    delay: n(-((i * 0.83) % 5)),
  };
}

function motionStyle(spec: MotionSpec): CSSProperties {
  return {
    ["--amp" as string]: `${spec.amp}deg`,
    ["--dur" as string]: `${spec.dur}s`,
    ["--delay" as string]: `${spec.delay}s`,
  } as CSSProperties;
}

/**
 * Places children (drawn with their pivot at the origin) at x/y/rot and
 * optionally sways them around that pivot.
 */
export function Pivot({
  x = 0,
  y = 0,
  rot = 0,
  s = 1,
  motion,
  kind = "flutter",
  children,
}: {
  x?: number;
  y?: number;
  rot?: number;
  s?: number;
  motion?: MotionSpec | null;
  kind?: "flutter" | "sway" | "bob";
  children: ReactNode;
}) {
  const { animated } = useArt();
  const inner =
    animated && motion ? (
      <g className={styles[kind]} style={motionStyle(motion)}>
        {children}
      </g>
    ) : (
      children
    );
  if (!x && !y && !rot && s === 1) return <>{inner}</>;
  return <g transform={place(x, y, rot, s)}>{inner}</g>;
}

// ── Leaf ────────────────────────────────────────────────────

export interface LeafProps {
  x: number;
  y: number;
  rot: number;
  L: number;
  W: number;
  opts?: LeafOpts;
  fill: string;
  /** Opacity of the darker right half (folded look). */
  shade?: number;
  /** Midrib colour; null hides it. */
  rib?: string | null;
  ribOpacity?: number;
  ribWidth?: number;
  /** Opacity of the white sheen on the left half. */
  gloss?: number;
  stroke?: string;
  strokeWidth?: number;
  motion?: MotionSpec | null;
  /** Decorations drawn in the leaf's own space (pointing up from origin). */
  children?: (shape: LeafShape) => ReactNode;
  /** Custom outline override (same space). */
  shape?: LeafShape;
}

export function Leaf({
  x,
  y,
  rot,
  L,
  W,
  opts,
  fill,
  shade = 0.2,
  rib = "#d7f5b0",
  ribOpacity = 0.45,
  ribWidth,
  gloss = 0,
  stroke,
  strokeWidth = 1,
  motion,
  children,
  shape: custom,
}: LeafProps) {
  const { url } = useArt();
  const shape = custom ?? leafShape(L, W, opts);
  return (
    <Pivot x={x} y={y} rot={rot} motion={motion}>
      <path d={shape.d} fill={fill} stroke={stroke} strokeWidth={stroke ? strokeWidth : undefined} />
      {children?.(shape)}
      {shade > 0 && <path d={shape.half} fill={INK} opacity={shade} />}
      {gloss > 0 && <path d={shape.halfL} fill={url("sheen")} opacity={gloss} />}
      {rib && (
        <path
          d={shape.rib}
          fill="none"
          stroke={rib}
          strokeWidth={ribWidth ?? Math.max(0.6, W * 0.035)}
          strokeLinecap="round"
          opacity={ribOpacity}
        />
      )}
    </Pivot>
  );
}

/** A curved stem drawn as a stroke (petiole, runner, flower stalk). */
export function Stem({
  d,
  color,
  width,
  opacity,
}: {
  d: string;
  color: string;
  width: number;
  opacity?: number;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}
