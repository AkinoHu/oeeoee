"use client";

import { Fragment } from "react";
import {
  angleOf,
  cubic,
  cubicTan,
  leafShape,
  n,
  place,
  pt,
  ribbon,
  rotFor,
  seeded,
  taper,
  type LeafShape,
  type Pt,
} from "../geometry";
import { flutterSpec, Leaf, LeafGrad, LinGrad, Pivot, Stem, useArt } from "../kit";

/*
 * All plants are drawn relative to their stem base at (0, 0), growing up
 * towards -y. The shared viewBox (see registry.ts) puts that base at the
 * bottom centre.
 */

const petiole = (x: number, y: number, bow = 0.2, from: Pt = [0, -4]) =>
  `M${pt(from)} Q${pt([x * bow, y * 0.72])} ${pt([x, y])}`;

// ── Pothos ──────────────────────────────────────────────────

type LeafSpot = readonly [x: number, y: number, rot: number, L: number];

const POTHOS_BACK: LeafSpot[] = [
  [-46, -48, -66, 40],
  [48, -52, 66, 40],
  [-26, -74, -36, 44],
  [26, -80, 34, 46],
  [-2, -98, 2, 46],
];
const POTHOS_FRONT: LeafSpot[] = [
  [-14, -54, -20, 46],
  [16, -58, 18, 44],
  [-36, -28, -54, 38],
  [36, -30, 54, 38],
  [0, -32, 4, 40],
];

function PothosVariegation({ shape, L, i }: { shape: LeafShape; L: number; i: number }) {
  const W = L * 0.82;
  const flip = i % 2 === 0 ? 1 : -1;
  void shape;
  return (
    <g fill="none" stroke="#f1e07c" strokeLinecap="round">
      <path
        d={`M${n(flip * 1)} ${n(-L * 0.18)} Q${n(flip * W * 0.24)} ${n(-L * 0.36)} ${n(flip * W * 0.3)} ${n(-L * 0.6)}`}
        strokeWidth={n(L * 0.07)}
        opacity={0.6}
      />
      <path
        d={`M${n(-flip * 1)} ${n(-L * 0.42)} Q${n(-flip * W * 0.16)} ${n(-L * 0.55)} ${n(-flip * W * 0.2)} ${n(-L * 0.72)}`}
        strokeWidth={n(L * 0.035)}
        opacity={0.5}
      />
      <path
        d={`M${n(flip * W * 0.1)} ${n(-L * 0.66)} q${n(flip * L * 0.06)} ${n(-L * 0.06)} ${n(flip * L * 0.08)} ${n(-L * 0.14)}`}
        strokeWidth={n(L * 0.03)}
        opacity={0.45}
      />
    </g>
  );
}

function PothosVine({ side, potted, seed }: { side: 1 | -1; potted: boolean; seed: number }) {
  const { url } = useArt();
  const s = side;
  // Vine drawn relative to where it leaves the crown.
  const p0: Pt = [0, 0];
  const p1: Pt = [s * 40, -30];
  const p2: Pt = potted ? [s * 78, -6] : [s * 76, -8];
  const p3: Pt = potted ? [s * 70, 108] : [s * 70, 18];
  const ts = potted ? [0.2, 0.32, 0.44, 0.55, 0.65, 0.74, 0.82, 0.9, 1] : [0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1];
  const d = `M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}`;
  return (
    <>
      <Stem d={d} color="#5d9a45" width={2} />
      {ts.map((t, k) => {
        const p = cubic(p0, p1, p2, p3, t);
        const tan = angleOf(cubicTan(p0, p1, p2, p3, t));
        const alt = k % 2 === 0 ? 1 : -1;
        const last = k === ts.length - 1;
        const dir = last ? tan : tan + alt * 58;
        const L = last ? 15 : 28 - k * (potted ? 1.4 : 1.8);
        return (
          <Leaf
            key={k}
            x={p[0]}
            y={p[1]}
            rot={rotFor(dir)}
            L={L}
            W={L * 0.8}
            opts={{ base: "heart", p: 0.36, tip: "acuminate" }}
            fill={url(k % 3 === 1 ? "lb" : "lf")}
            gloss={0.25}
            motion={flutterSpec(seed + k, 3)}
          >
            {(shape) => <PothosVariegation shape={shape} L={L} i={seed + k} />}
          </Leaf>
        );
      })}
    </>
  );
}

export function Pothos() {
  const { id, url, variant } = useArt();
  const potted = variant === "potted";
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3b9246" mid="#5db24f" tip="#97d66c" />
        <LeafGrad id={id("lb")} base="#28693a" tip="#5aa04c" />
      </defs>
      <Pivot x={-18} y={-26} motion={{ amp: 1.6, dur: 8.5, delay: -1 }} kind="sway">
        <PothosVine side={-1} potted={potted} seed={11} />
      </Pivot>
      <Pivot x={18} y={-30} motion={{ amp: 1.6, dur: 9.3, delay: -4 }} kind="sway">
        <PothosVine side={1} potted={potted} seed={23} />
      </Pivot>
      {[...POTHOS_BACK, ...POTHOS_FRONT].map(([x, y], i) => (
        <Stem key={`p${i}`} d={petiole(x, y)} color="#4f8c3d" width={1.8} />
      ))}
      {POTHOS_BACK.map(([x, y, r, L], i) => (
        <Leaf
          key={`b${i}`}
          x={x}
          y={y}
          rot={r}
          L={L}
          W={L * 0.82}
          opts={{ base: "heart", p: 0.36, tip: "acuminate" }}
          fill={url("lb")}
          gloss={0.18}
          motion={flutterSpec(i, 2.2)}
        >
          {(shape) => <PothosVariegation shape={shape} L={L} i={i} />}
        </Leaf>
      ))}
      {POTHOS_FRONT.map(([x, y, r, L], i) => (
        <Leaf
          key={`f${i}`}
          x={x}
          y={y}
          rot={r}
          L={L}
          W={L * 0.82}
          opts={{ base: "heart", p: 0.36, tip: "acuminate" }}
          fill={url("lf")}
          gloss={0.28}
          motion={flutterSpec(i + 5, 2.4)}
        >
          {(shape) => <PothosVariegation shape={shape} L={L} i={i + 1} />}
        </Leaf>
      ))}
    </g>
  );
}

// ── Peace lily ──────────────────────────────────────────────

const LILY_BACK: LeafSpot[] = [
  [-46, -50, -66, 70],
  [48, -52, 66, 70],
  [-30, -78, -40, 80],
  [30, -82, 38, 82],
  [-6, -100, -8, 84],
  [12, -98, 14, 86],
];
const LILY_FRONT: LeafSpot[] = [
  [-56, -24, -84, 60],
  [58, -26, 84, 60],
  [-20, -50, -30, 76],
  [22, -52, 30, 76],
  [2, -58, 4, 70],
];
const LILY_FLOWERS = [
  { x: -24, y: -146, rot: -14, L: 40 },
  { x: 10, y: -172, rot: 4, L: 44 },
  { x: 38, y: -134, rot: 20, L: 36 },
] as const;

export function PeaceLily() {
  const { id, url } = useArt();
  const lilyLeaf = (spot: LeafSpot, i: number, fill: string, gloss: number) => {
    const [x, y, r, L] = spot;
    return (
      <Leaf
        key={i}
        x={x}
        y={y}
        rot={r}
        L={L}
        W={L * 0.33}
        opts={{ p: 0.46, tip: "acuminate", bend: r > 0 ? 7 : r < 0 ? -7 : 0 }}
        fill={fill}
        gloss={gloss}
        rib="#a7d79a"
        ribOpacity={0.4}
        motion={flutterSpec(i, 1.8)}
      />
    );
  };
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#1d5a33" mid="#2e7d45" tip="#4b9b58" />
        <LeafGrad id={id("lb")} base="#164529" tip="#2f6d3f" />
        <LeafGrad id={id("sp")} base="#bcd4b0" mid="#f2f6ec" tip="#ffffff" />
        <LinGrad
          id={id("spadix")}
          stops={[
            [0, "#d9c56e"],
            [1, "#f6eebc"],
          ]}
        />
      </defs>
      {[...LILY_BACK, ...LILY_FRONT].map(([x, y], i) => (
        <Stem key={`p${i}`} d={petiole(x, y, 0.3)} color="#2d6a3c" width={2.2} />
      ))}
      {LILY_BACK.map((s, i) => lilyLeaf(s, i, url("lb"), 0.15))}
      {LILY_FLOWERS.map((f, i) => (
        <Fragment key={`f${i}`}>
          <Stem d={`M0 -6 Q${n(f.x * 0.2)} ${n(f.y * 0.6)} ${f.x} ${f.y}`} color="#6c9a55" width={2.2} />
          <Pivot x={f.x} y={f.y} rot={f.rot} motion={flutterSpec(i + 20, 2.6)}>
            <Leaf
              x={0}
              y={0}
              rot={0}
              L={f.L}
              W={f.L * 0.58}
              opts={{ p: 0.42, base: "round", tip: "acuminate" }}
              fill={url("sp")}
              shade={0.1}
              rib="#c4d8bc"
              ribOpacity={0.9}
            />
            <rect
              x={-2.6}
              y={n(-f.L * 0.5)}
              width={5.2}
              height={n(f.L * 0.42)}
              rx={2.6}
              fill={url("spadix")}
              transform="rotate(8)"
            />
          </Pivot>
        </Fragment>
      ))}
      {LILY_FRONT.map((s, i) => lilyLeaf(s, i + 8, url("lf"), 0.3))}
    </g>
  );
}

// ── Monstera ────────────────────────────────────────────────

const MON_UNIT = leafShape(100, 96, { base: "heart", p: 0.42, tip: "acute" });

function MonsteraMask({ maskId }: { maskId: string }) {
  const slits: string[] = [];
  const holes: { x: number; y: number; a: number }[] = [];
  for (let k = 0; k < 5; k++) {
    const ym = -24 - k * 15;
    const ang = (18 + k * 7) * (Math.PI / 180);
    const x0 = 9;
    const x1 = 64;
    const ye = ym - (x1 - x0) * Math.tan(ang);
    for (const s of [1, -1]) {
      slits.push(
        `M${pt([s * x0, ym - 0.7])} Q${pt([s * 36, ym - (36 - x0) * Math.tan(ang) * 1.15 - 2])} ${pt([s * x1, ye - 3.4])} ` +
          `L${pt([s * x1, ye + 3.4])} Q${pt([s * 36, ym - (36 - x0) * Math.tan(ang) * 1.15 + 2])} ${pt([s * x0, ym + 0.7])}Z`,
      );
      if (k < 4) holes.push({ x: s * 19, y: ym - 8.5 - k, a: -s * (20 + k * 6) });
    }
  }
  return (
    <mask id={maskId} maskUnits="userSpaceOnUse" x={-70} y={-110} width={140} height={130}>
      <rect x={-70} y={-110} width={140} height={130} fill="#fff" />
      {slits.map((d, i) => (
        <path key={i} d={d} fill="#000" />
      ))}
      {holes.map((h, i) => (
        <ellipse key={`h${i}`} cx={0} cy={0} rx={4.2} ry={2.2} fill="#000" transform={place(h.x, h.y, h.a)} />
      ))}
    </mask>
  );
}

const MON_LEAVES = [
  { x: -46, y: -112, rot: -42, s: 0.72, back: true },
  { x: 44, y: -120, rot: 40, s: 0.74, back: true },
  { x: 0, y: -140, rot: 2, s: 0.66, back: true },
  { x: -30, y: -64, rot: -64, s: 0.7, back: false },
  { x: 34, y: -68, rot: 62, s: 0.72, back: false },
  { x: 4, y: -82, rot: 8, s: 0.6, back: false },
] as const;

export function Monstera() {
  const { id, url } = useArt();
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#246634" mid="#3a8f45" tip="#62b257" />
        <LeafGrad id={id("lb")} base="#1b5230" tip="#3a8444" />
        <MonsteraMask maskId={id("mask")} />
      </defs>
      {MON_LEAVES.map((l, i) => (
        <Stem
          key={`p${i}`}
          d={`M0 -2 Q${n(l.x * 0.12)} ${n(l.y * 0.72)} ${l.x} ${l.y}`}
          color={l.back ? "#3c7334" : "#4f8c3f"}
          width={3}
        />
      ))}
      {MON_LEAVES.map((l, i) => (
        <Pivot key={i} x={l.x} y={l.y} rot={l.rot} motion={flutterSpec(i, 1.6, 6)}>
          <g transform={`scale(${l.s})`}>
            <g mask={`url(#${id("mask")})`}>
              <path d={MON_UNIT.d} fill={url(l.back ? "lb" : "lf")} />
              <path d={MON_UNIT.half} fill="#0b2414" opacity={0.2} />
              <path d={MON_UNIT.halfL} fill={url("sheen")} opacity={0.14} />
              <path d={MON_UNIT.rib} fill="none" stroke="#bfe6a2" strokeWidth={2.2} opacity={0.5} />
            </g>
          </g>
        </Pivot>
      ))}
    </g>
  );
}

// ── Calathea (orbifolia) ────────────────────────────────────

const CAL_UNIT = leafShape(100, 86, { p: 0.5, base: "round", tip: "round" });

const CAL_LEAVES = [
  { x: -40, y: -100, rot: -36, s: 0.62, back: true },
  { x: 40, y: -106, rot: 34, s: 0.64, back: true },
  { x: -4, y: -136, rot: -4, s: 0.6, back: true },
  { x: -52, y: -56, rot: -66, s: 0.56, back: false },
  { x: 52, y: -60, rot: 64, s: 0.58, back: false },
  { x: -18, y: -76, rot: -16, s: 0.6, back: false },
  { x: 20, y: -82, rot: 18, s: 0.58, back: false },
] as const;

export function Calathea() {
  const { id, url } = useArt();
  const stripes: string[] = [];
  for (let k = 0; k < 8; k++) {
    const y0 = -10 - k * 11.2;
    for (const s of [1, -1]) {
      stripes.push(`M${pt([0, y0])} Q${pt([s * 22, y0 - 7])} ${pt([s * 52, y0 - 22])}`);
    }
  }
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3a7a4a" mid="#4f9460" tip="#67a96f" />
        <LeafGrad id={id("lb")} base="#2b6140" tip="#4d8858" />
        <clipPath id={id("clip")}>
          <path d={CAL_UNIT.d} />
        </clipPath>
      </defs>
      {CAL_LEAVES.map((l, i) => (
        <Stem
          key={`p${i}`}
          d={`M0 -2 Q${n(l.x * 0.1)} ${n(l.y * 0.7)} ${l.x} ${l.y}`}
          color="#6f6f4a"
          width={1.8}
        />
      ))}
      {CAL_LEAVES.map((l, i) => (
        <Pivot key={i} x={l.x} y={l.y} rot={l.rot} motion={flutterSpec(i, 1.8, 5.5)}>
          <g transform={`scale(${l.s})`}>
            <path d={CAL_UNIT.d} fill={url(l.back ? "lb" : "lf")} />
            <g clipPath={`url(#${id("clip")})`}>
              {stripes.map((d, k) => (
                <path
                  key={k}
                  d={d}
                  fill="none"
                  stroke="#d3eebf"
                  strokeWidth={k % 4 < 2 ? 4.6 : 3}
                  strokeLinecap="round"
                  opacity={l.back ? 0.42 : 0.6}
                />
              ))}
              <path d={CAL_UNIT.d} fill="none" stroke="#24563a" strokeWidth={6} opacity={0.5} />
            </g>
            <path d={CAL_UNIT.half} fill="#0b2414" opacity={0.16} />
            <path d={CAL_UNIT.halfL} fill={url("sheen")} opacity={0.12} />
            <path d={CAL_UNIT.rib} fill="none" stroke="#e0f4cf" strokeWidth={2.4} opacity={0.65} />
          </g>
        </Pivot>
      ))}
    </g>
  );
}

// ── Aglaonema ───────────────────────────────────────────────

const AGL_UNIT = leafShape(100, 42, { p: 0.48, base: "wedge", tip: "acuminate" });
const AGL_BLOTCH = leafShape(80, 26, { p: 0.5, base: "wedge", tip: "acute" });

const AGL_LEAVES = [
  { x: -28, y: -64, rot: -34, s: 0.74, back: true },
  { x: 28, y: -66, rot: 32, s: 0.76, back: true },
  { x: -6, y: -80, rot: -6, s: 0.8, back: true },
  { x: 10, y: -78, rot: 12, s: 0.78, back: true },
  { x: -50, y: -18, rot: -78, s: 0.6, back: false },
  { x: 50, y: -20, rot: 78, s: 0.6, back: false },
  { x: -40, y: -40, rot: -56, s: 0.7, back: false },
  { x: 40, y: -40, rot: 56, s: 0.7, back: false },
  { x: -16, y: -46, rot: -18, s: 0.74, back: false },
  { x: 18, y: -48, rot: 22, s: 0.72, back: false },
] as const;

export function Aglaonema() {
  const { id, url } = useArt();
  const rnd = seeded(7);
  const specks = Array.from({ length: 16 }, () => ({
    x: (rnd() - 0.5) * 26,
    y: -14 - rnd() * 64,
    r: 0.9 + rnd() * 1.2,
  }));
  const feathers: string[] = [];
  for (let k = 0; k < 9; k++) {
    const y = -16 - k * 8.4;
    for (const s of [1, -1]) feathers.push(`M${pt([s * 2, y])} Q${pt([s * 8, y - 4])} ${pt([s * 22, y - 12])}`);
  }
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#245c36" mid="#2f7243" tip="#3f8550" />
        <LeafGrad id={id("lb")} base="#1d4c2e" tip="#336c43" />
        <LeafGrad id={id("blotch")} base="#9fc49c" mid="#cfe2c5" tip="#e2eedb" />
        <clipPath id={id("clip")}>
          <path d={AGL_UNIT.d} />
        </clipPath>
      </defs>
      {AGL_LEAVES.map((l, i) => (
        <path
          key={`p${i}`}
          d={ribbon([0, -2], [l.x * 0.2, l.y * 0.4], [l.x * 0.6, l.y * 0.8], [l.x, l.y], taper(3.4, 2.2), 6)}
          fill="#d98aa0"
          opacity={l.back ? 0.8 : 1}
        />
      ))}
      {AGL_LEAVES.map((l, i) => (
        <Pivot key={i} x={l.x} y={l.y} rot={l.rot} motion={flutterSpec(i, 1.6, 5)}>
          <g transform={`scale(${l.s})`}>
            <path d={AGL_UNIT.d} fill={url(l.back ? "lb" : "lf")} />
            <g clipPath={`url(#${id("clip")})`}>
              <path d={AGL_BLOTCH.d} fill={url("blotch")} transform="translate(0 -6)" opacity={l.back ? 0.75 : 0.92} />
              {feathers.map((d, k) => (
                <path key={k} d={d} fill="none" stroke="#2c6a3e" strokeWidth={2.2} strokeLinecap="round" opacity={0.55} />
              ))}
              {specks.map((s, k) => (
                <circle key={`s${k}`} cx={n(s.x)} cy={n(s.y)} r={n(s.r)} fill="#ee93ab" opacity={0.75} />
              ))}
            </g>
            <path d={AGL_UNIT.half} fill="#0b2414" opacity={0.16} />
            <path d={AGL_UNIT.halfL} fill={url("sheen")} opacity={0.16} />
            <path d={AGL_UNIT.rib} fill="none" stroke="#ef8fa9" strokeWidth={3} strokeLinecap="round" opacity={0.95} />
          </g>
        </Pivot>
      ))}
    </g>
  );
}

// ── Fiddle-leaf fig ─────────────────────────────────────────

const FIDDLE: LeafShape = {
  d: "M0 0 C7 -3 15 -14 14 -30 C13 -42 22 -50 31 -64 C40 -80 28 -100 4 -98 C2 -97.4 -2 -97.4 -4 -98 C-28 -100 -40 -80 -31 -64 C-22 -50 -13 -42 -14 -30 C-15 -14 -7 -3 0 0Z",
  half: "M0 0 C7 -3 15 -14 14 -30 C13 -42 22 -50 31 -64 C40 -80 28 -100 4 -98 Q1 -50 0 0Z",
  halfL: "M0 0 C-7 -3 -15 -14 -14 -30 C-13 -42 -22 -50 -31 -64 C-40 -80 -28 -100 -4 -98 Q1 -50 0 0Z",
  rib: "M0 0 Q1 -50 1.5 -94",
  widthAt: () => 0,
};
const FIDDLE_VEINS = [
  [-22, 9],
  [-38, 13],
  [-54, 20],
  [-70, 23],
  [-82, 15],
].flatMap(([y, w]) =>
  [1, -1].map((s) => `M${pt([0.8, y])} Q${pt([s * w * 0.5, y - 4])} ${pt([s * w, y - 10])}`),
);

export function FiddleLeafFig() {
  const { id, url } = useArt();
  const T0: Pt = [0, 0];
  const T1: Pt = [-7, -52];
  const T2: Pt = [7, -104];
  const T3: Pt = [-1, -150];
  const leaves = [
    { t: 0.42, a: -72, s: 0.5 },
    { t: 0.48, a: 66, s: 0.54 },
    { t: 0.56, a: -58, s: 0.6 },
    { t: 0.64, a: 52, s: 0.62 },
    { t: 0.71, a: -40, s: 0.64 },
    { t: 0.78, a: 36, s: 0.64 },
    { t: 0.86, a: -22, s: 0.6 },
    { t: 0.92, a: 18, s: 0.58 },
    { t: 1, a: -3, s: 0.56 },
  ];
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#1f5a2f" mid="#2b7a3c" tip="#45984d" />
        <LeafGrad id={id("lb")} base="#184826" mid="#22643a" tip="#367f42" />
        <LinGrad
          id={id("bark")}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            [0, "#6b5946"],
            [0.4, "#9c876d"],
            [1, "#56473a"],
          ]}
        />
      </defs>
      <path d={ribbon(T0, T1, T2, T3, taper(10, 5), 12)} fill={url("bark")} />
      {leaves.map((l, i) => {
        const p = cubic(T0, T1, T2, T3, l.t);
        return (
          <Pivot key={i} x={p[0]} y={p[1]} rot={l.a} motion={flutterSpec(i, 1.5, 6)}>
            <Stem d="M0 0 L0 -5" color="#5d7a45" width={2} />
            <g transform={`translate(0 -4) scale(${l.s})`}>
              <path d={FIDDLE.d} fill={url(i % 2 ? "lf" : "lb")} />
              <path d={FIDDLE.half} fill="#0b2414" opacity={0.18} />
              <path d={FIDDLE.halfL} fill={url("sheen")} opacity={0.26} />
              {FIDDLE_VEINS.map((d, k) => (
                <path key={k} d={d} fill="none" stroke="#a8db8e" strokeWidth={1.8} strokeLinecap="round" opacity={0.36} />
              ))}
              <path d={FIDDLE.rib} fill="none" stroke="#c8eeaa" strokeWidth={2.4} opacity={0.6} />
            </g>
          </Pivot>
        );
      })}
    </g>
  );
}

// ── ZZ plant ────────────────────────────────────────────────

const ZZ_STEMS: readonly (readonly [Pt, Pt, Pt, Pt])[] = [
  [[-2, 0], [-4, -70], [-12, -140], [-22, -184]],
  [[2, 0], [4, -70], [10, -140], [16, -190]],
  [[-4, 0], [-10, -60], [-30, -120], [-52, -152]],
  [[4, 0], [12, -60], [34, -120], [50, -160]],
  [[-6, 0], [-24, -40], [-56, -80], [-76, -102]],
  [[6, 0], [24, -36], [58, -74], [78, -96]],
];

export function ZZPlant() {
  const { id, url } = useArt();
  const ts = [0.34, 0.46, 0.58, 0.69, 0.79, 0.88];
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#17462a" mid="#245f36" tip="#367d45" />
        <LeafGrad id={id("lb")} base="#123b22" tip="#2b6a3b" />
        <LinGrad
          id={id("stem")}
          stops={[
            [0, "#7a9c4b"],
            [1, "#4c7a35"],
          ]}
        />
      </defs>
      {ZZ_STEMS.map(([p0, p1, p2, p3], si) => {
        const back = si < 2;
        return (
          <Pivot key={si} motion={flutterSpec(si, 0.9, 7)} kind="sway">
            <path d={ribbon(p0, p1, p2, p3, taper(7.5, 2.4), 10)} fill={url("stem")} />
            {ts.map((t, k) => {
              const p = cubic(p0, p1, p2, p3, t);
              const dir = angleOf(cubicTan(p0, p1, p2, p3, t));
              const L = 26 - (t - 0.34) * 16;
              return [1, -1].map((s) => (
                <Leaf
                  key={`${k}${s}`}
                  x={p[0]}
                  y={p[1]}
                  rot={rotFor(dir + s * 50)}
                  L={L}
                  W={L * 0.5}
                  opts={{ p: 0.5, tip: "acute" }}
                  fill={url(back ? "lb" : "lf")}
                  gloss={0.55}
                  shade={0.22}
                  rib="#7fbf74"
                  ribOpacity={0.35}
                />
              ));
            })}
            <Leaf
              x={p3[0]}
              y={p3[1]}
              rot={rotFor(angleOf(cubicTan(p0, p1, p2, p3, 1)))}
              L={18}
              W={9}
              opts={{ p: 0.5, tip: "acute" }}
              fill={url(back ? "lb" : "lf")}
              gloss={0.55}
              rib="#7fbf74"
              ribOpacity={0.35}
            />
          </Pivot>
        );
      })}
    </g>
  );
}

// ── Fallback ────────────────────────────────────────────────

const GENERIC: LeafSpot[] = [
  [-30, -70, -40, 52],
  [30, -74, 38, 54],
  [0, -96, 0, 58],
  [-40, -34, -66, 46],
  [40, -36, 64, 46],
  [-12, -46, -16, 50],
  [14, -48, 18, 50],
];

export function GenericPlant() {
  const { id, url } = useArt();
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#2f7a40" mid="#4a9a52" tip="#7cc463" />
        <LeafGrad id={id("lb")} base="#22603a" tip="#4b8e50" />
      </defs>
      {GENERIC.map(([x, y], i) => (
        <Stem key={`p${i}`} d={petiole(x, y, 0.25)} color="#477f3a" width={2.2} />
      ))}
      {GENERIC.map(([x, y, r, L], i) => (
        <Leaf
          key={i}
          x={x}
          y={y}
          rot={r}
          L={L}
          W={L * 0.52}
          opts={{ p: 0.45, base: "round", tip: "acute" }}
          fill={url(i < 3 ? "lb" : "lf")}
          gloss={0.22}
          motion={flutterSpec(i, 2)}
        />
      ))}
    </g>
  );
}
