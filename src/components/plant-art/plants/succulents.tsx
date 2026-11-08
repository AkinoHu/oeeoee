"use client";

import {
  angleOf,
  cubic,
  cubicTan,
  DEG,
  leafShape,
  n,
  pt,
  ribbon,
  rotFor,
  seeded,
  taper,
  type Pt,
} from "../geometry";
import { flutterSpec, Leaf, LeafGrad, LinGrad, Pivot, RadGrad, useArt } from "../kit";

// ── Jade plant ──────────────────────────────────────────────

type Branch = readonly [Pt, Pt, Pt, Pt, number, number];

const JADE_BRANCHES: Branch[] = [
  [[0, -50], [4, -74], [-2, -94], [-4, -112], 5.4, 3.6],
  [[0, -48], [-14, -64], [-28, -76], [-42, -88], 5.2, 3.4],
  [[1, -50], [16, -62], [28, -72], [42, -82], 5, 3.4],
  [[-1, -28], [-18, -34], [-34, -40], [-52, -48], 4.4, 3],
  [[1, -32], [18, -38], [36, -44], [54, -54], 4.4, 3],
];

export function JadePlant() {
  const { id, url } = useArt();
  const jadeLeaf = (x: number, y: number, rot: number, L: number, key: string, i: number) => (
    <Leaf
      key={key}
      x={x}
      y={y}
      rot={rot}
      L={L}
      W={L * 0.5}
      opts={{ p: 0.62, base: "wedge", tip: "round" }}
      fill={url(i % 3 === 0 ? "lb" : "lf")}
      shade={0.18}
      rib={null}
      gloss={0.4}
      stroke="#b0745d"
      strokeWidth={0.55}
      motion={flutterSpec(i, 1.2, 6)}
    >
      {() => <ellipse cx={-L * 0.12} cy={-L * 0.72} rx={L * 0.12} ry={L * 0.07} fill="#fff" opacity={0.35} />}
    </Leaf>
  );
  const leaves: React.ReactNode[] = [];
  let i = 0;
  JADE_BRANCHES.forEach(([p0, p1, p2, p3], bi) => {
    const dir = angleOf(cubicTan(p0, p1, p2, p3, 1));
    // older, larger pair low on the tip, then a younger pair, then the bud pair
    const pairs: [number, number][] = [
      [56, 27],
      [20, 23],
    ];
    pairs.forEach(([a, L], k) => {
      leaves.push(jadeLeaf(p3[0], p3[1], rotFor(dir - a), L + (bi === 0 ? 2 : 0), `t${bi}-${k}a`, i++));
      leaves.push(jadeLeaf(p3[0], p3[1], rotFor(dir + a), L - 1, `t${bi}-${k}b`, i++));
    });
    const mid = cubic(p0, p1, p2, p3, 0.5);
    const mdir = angleOf(cubicTan(p0, p1, p2, p3, 0.5));
    leaves.push(jadeLeaf(mid[0], mid[1], rotFor(mdir - 58), 22, `m${bi}a`, i++));
    leaves.push(jadeLeaf(mid[0], mid[1], rotFor(mdir + 58), 21, `m${bi}b`, i++));
  });
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#2f7a48" mid="#4f9c62" tip="#86c98b" />
        <LeafGrad id={id("lb")} base="#276a3e" mid="#3f8752" tip="#6eb178" />
        <LinGrad
          id={id("trunk")}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            [0, "#6a6440"],
            [0.4, "#a39c68"],
            [1, "#55502f"],
          ]}
        />
      </defs>
      <path d={ribbon([0, 2], [-4, -24], [3, -40], [0, -56], taper(18, 11), 8)} fill={url("trunk")} />
      {JADE_BRANCHES.map(([p0, p1, p2, p3, w0, w1], bi) => (
        <path key={bi} d={ribbon(p0, p1, p2, p3, taper(w0 * 2, w1 * 2), 8)} fill={url("trunk")} />
      ))}
      {leaves}
    </g>
  );
}

// ── Aloe ────────────────────────────────────────────────────

const ALOE = [
  // angle from vertical (°), length, back?
  { a: -16, L: 124, back: true },
  { a: 14, L: 130, back: true },
  { a: -40, L: 104, back: true },
  { a: 38, L: 108, back: true },
  { a: -62, L: 84, back: false },
  { a: 60, L: 88, back: false },
  { a: -26, L: 108, back: false },
  { a: 24, L: 112, back: false },
  { a: -3, L: 96, back: false },
] as const;

export function Aloe() {
  const { id, url } = useArt();
  const rnd = seeded(31);
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3f7a5c" mid="#62a07c" tip="#9ccaa6" />
        <LeafGrad id={id("lb")} base="#2f6248" mid="#4a8462" tip="#79a98a" />
      </defs>
      {ALOE.map((l, i) => {
        const s = Math.sign(l.a) || 1;
        const sa = Math.sin(l.a * DEG);
        const ca = Math.cos(l.a * DEG);
        const p0: Pt = [0, 0];
        const p1: Pt = [sa * l.L * 0.22, -ca * l.L * 0.3];
        const p2: Pt = [sa * l.L * 0.6 + s * l.L * 0.06, -ca * l.L * 0.7];
        const p3: Pt = [sa * l.L * 0.86 + s * l.L * 0.12, -ca * l.L * 0.9 + Math.abs(sa) * 10];
        const w = l.L * 0.25;
        const hw = (t: number) => (w / 2) * Math.pow(1 - t, 0.8) * (0.9 + 0.1 * Math.min(1, t * 6));
        const outline = ribbon(p0, p1, p2, p3, hw, 14);
        const halfShade = ribbon(p0, p1, p2, p3, (t) => hw(t) * 0.5, 14);
        const teeth: string[] = [];
        for (let t = 0.12; t < 0.82; t += 0.1) {
          const p = cubic(p0, p1, p2, p3, t);
          const tan = cubicTan(p0, p1, p2, p3, t);
          const len = Math.hypot(tan[0], tan[1]);
          const ux = tan[0] / len;
          const uy = tan[1] / len;
          const nx = -uy;
          const ny = ux;
          const ww = hw(t);
          for (const side of [1, -1]) {
            const ex = p[0] + nx * ww * side;
            const ey = p[1] + ny * ww * side;
            teeth.push(
              `M${pt([ex - ux * 1.2, ey - uy * 1.2])} L${pt([ex + nx * side * 1.7 + ux * 1.2, ey + ny * side * 1.7 + uy * 1.2])} L${pt([ex + ux * 1.3, ey + uy * 1.3])}Z`,
            );
          }
        }
        const specks = Array.from({ length: 7 }, () => {
          const t = 0.12 + rnd() * 0.6;
          const p = cubic(p0, p1, p2, p3, t);
          const tan = cubicTan(p0, p1, p2, p3, t);
          const len = Math.hypot(tan[0], tan[1]);
          const off = (rnd() - 0.5) * hw(t) * 1.2;
          return {
            x: p[0] - (tan[1] / len) * off,
            y: p[1] + (tan[0] / len) * off,
            r: angleOf(tan),
          };
        });
        return (
          <Pivot key={i} motion={flutterSpec(i, 0.6, 7)}>
            <path d={teeth.join(" ")} fill="#cfe3c6" opacity={0.75} />
            <path d={outline} fill={url(l.back ? "lb" : "lf")} />
            <path d={halfShade} fill="#0b2414" opacity={0.12} transform={`translate(${n(s * 1.2)} 0)`} />
            {specks.map((sp, k) => (
              <ellipse
                key={k}
                cx={0}
                cy={0}
                rx={1.8}
                ry={0.75}
                fill="#e9f5e8"
                opacity={l.back ? 0.35 : 0.6}
                transform={`translate(${n(sp.x)} ${n(sp.y)}) rotate(${n(sp.r + 90)})`}
              />
            ))}
          </Pivot>
        );
      })}
    </g>
  );
}

// ── Echeveria ───────────────────────────────────────────────

const RINGS = [
  { count: 12, reach: 72, elev: 4, w: 30, off: 0 },
  { count: 10, reach: 56, elev: 18, w: 28, off: 0.5 },
  { count: 9, reach: 40, elev: 32, w: 25, off: 0.2 },
  { count: 7, reach: 24, elev: 44, w: 20, off: 0.7 },
  { count: 5, reach: 10, elev: 52, w: 13, off: 0.3 },
] as const;

export function Echeveria() {
  const { id, url } = useArt();
  const C: Pt = [0, -28];
  const leaves: { x: number; y: number; rot: number; L: number; W: number; z: number; back: boolean; key: string }[] = [];
  RINGS.forEach((r, ri) => {
    for (let k = 0; k < r.count; k++) {
      const th = ((k + r.off) / r.count) * Math.PI * 2 + 0.3;
      const ct = Math.cos(th);
      const st = Math.sin(th);
      const tip: Pt = [C[0] + ct * r.reach, C[1] - r.elev + st * r.reach * 0.42];
      const root: Pt = [C[0] + ct * r.reach * 0.12, C[1] + st * 3 + 4 - ri * 3];
      const v: Pt = [tip[0] - root[0], tip[1] - root[1]];
      const L = Math.max(12, Math.hypot(v[0], v[1]) + 6);
      leaves.push({
        x: root[0],
        y: root[1],
        rot: rotFor(angleOf(v)),
        L,
        W: r.w,
        z: st * r.reach - ri * 0.5,
        back: st < -0.25,
        key: `${ri}-${k}`,
      });
    }
  });
  leaves.sort((a, b) => a.z - b.z);
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#86b2a2" mid="#bdd9cc" tip="#e7aec1" />
        <LeafGrad id={id("lb")} base="#6a9787" mid="#9dbfb1" tip="#d698ad" />
      </defs>
      <ellipse cx={0} cy={-6} rx={30} ry={6} fill="#0b2414" opacity={0.25} />
      {leaves.map((l) => {
        const shape = leafShape(l.L, l.W, { p: 0.62, base: "wedge", tip: "acute" });
        return (
          <Leaf
            key={l.key}
            x={l.x}
            y={l.y}
            rot={l.rot}
            L={l.L}
            W={l.W}
            shape={shape}
            fill={url(l.back ? "lb" : "lf")}
            shade={0.12}
            rib={null}
            gloss={0.22}
            stroke="#6f988a"
            strokeWidth={0.6}
          />
        );
      })}
    </g>
  );
}

// ── Cactus (ribbed barrel) ──────────────────────────────────

const BARREL = "M-36 0 C-62 -6 -70 -64 -46 -96 C-30 -116 30 -116 46 -96 C70 -64 62 -6 36 0 Z";

function Barrel({ ribs = 9, spines = true }: { ribs?: number; spines?: boolean }) {
  const { url } = useArt();
  const items: React.ReactNode[] = [];
  for (let k = 0; k < ribs; k++) {
    const u = -0.92 + (1.84 * k) / (ribs - 1);
    const p0: Pt = [u * 34, 0];
    const p1: Pt = [u * 66, -24];
    const p2: Pt = [u * 62, -90];
    const p3: Pt = [u * 8, -108 + Math.abs(u) * 4];
    const d = `M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}`;
    items.push(<path key={`r${k}`} d={d} fill="none" stroke="#a4dc95" strokeWidth={1.3} opacity={0.38 * (1 - Math.abs(u) * 0.5)} />);
    if (k < ribs - 1) {
      const g = u + 0.92 / (ribs - 1);
      const gd = `M${pt([g * 34, 0])} C${pt([g * 66, -24])} ${pt([g * 62, -90])} ${pt([g * 8, -108 + Math.abs(g) * 4])}`;
      items.push(<path key={`g${k}`} d={gd} fill="none" stroke="#1d4f2b" strokeWidth={2.2} opacity={0.5} />);
    }
    if (spines && Math.abs(u) < 0.95) {
      for (const t of k % 2 ? [0.14, 0.34, 0.54, 0.72, 0.88] : [0.24, 0.44, 0.63, 0.8]) {
        const p = cubic(p0, p1, p2, p3, t);
        items.push(
          <g key={`a${k}-${t}`} transform={`translate(${n(p[0])} ${n(p[1])})`} opacity={1 - Math.abs(u) * 0.35}>
            <path
              d="M0 0 L-4 -3.2 M0 0 L0.6 -5.4 M0 0 L4.4 -2.4"
              stroke="#f7efd6"
              strokeWidth={0.6}
              strokeLinecap="round"
            />
            <circle r={1.6} fill="#efe3c1" />
          </g>,
        );
      }
    }
  }
  return (
    <>
      <path d={BARREL} fill={url("body")} />
      {items}
      <path d={BARREL} fill={url("shadow")} />
    </>
  );
}

export function Cactus() {
  const { id, url } = useArt();
  const petals = Array.from({ length: 9 }, (_, i) => i * 40);
  return (
    <g>
      <defs>
        <LinGrad
          id={id("body")}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            [0, "#2a6b3b"],
            [0.28, "#4f9d58"],
            [0.42, "#6fbb6f"],
            [0.7, "#3d874b"],
            [1, "#215a31"],
          ]}
        />
        <LinGrad
          id={id("shadow")}
          stops={[
            [0, "#0b2414", 0.35],
            [0.35, "#0b2414", 0],
            [1, "#0b2414", 0],
          ]}
        />
        <RadGrad
          id={id("petal")}
          cx={0.5}
          cy={1}
          r={1}
          stops={[
            [0, "#ff6f9c"],
            [0.7, "#ffa3c0"],
            [1, "#ffd6e3"],
          ]}
        />
      </defs>
      {/* a little pup at the side */}
      <g transform="translate(-50 0) scale(0.36)">
        <Barrel ribs={7} spines={false} />
      </g>
      <Barrel />
      <ellipse cx={0} cy={-106} rx={13} ry={4.6} fill="#efe1b6" />
      <ellipse cx={0} cy={-107} rx={8.5} ry={2.6} fill="#fbf2d6" />
      <Pivot x={4} y={-110} motion={{ amp: 4, dur: 5, delay: -2 }}>
        {petals.map((a) => (
          <ellipse key={a} cx={0} cy={-6.5} rx={2.8} ry={7} fill={url("petal")} transform={`rotate(${a - 80}) scale(1 ${a > 100 && a < 260 ? 0.55 : 1})`} />
        ))}
        <circle cx={0} cy={-1} r={2.6} fill="#ffd56b" />
        <circle cx={-0.6} cy={-1.6} r={0.9} fill="#fff4c4" />
      </Pivot>
      <Pivot x={-12} y={-106} rot={-28} motion={{ amp: 3, dur: 6, delay: -4 }}>
        <ellipse cx={0} cy={-5} rx={2.6} ry={5} fill={url("petal")} />
      </Pivot>
    </g>
  );
}
