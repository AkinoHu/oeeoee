"use client";

import { Fragment } from "react";
import { blade, n, pt, ribbon, smoothThrough, taper, type Pt } from "../geometry";
import { flutterSpec, Leaf, LeafGrad, LinGrad, Pivot, Stem, useArt } from "../kit";

// ── Snake plant ─────────────────────────────────────────────

const SNAKE_BLADES = [
  // x, height, lean°, width, bend, front?
  { x: -10, h: 176, lean: -7, w: 22, bend: -3, front: false },
  { x: 12, h: 196, lean: 5, w: 24, bend: 4, front: false },
  { x: -28, h: 136, lean: -17, w: 20, bend: -6, front: false },
  { x: 30, h: 146, lean: 16, w: 21, bend: 6, front: false },
  { x: 0, h: 208, lean: 1, w: 26, bend: 2, front: true },
  { x: -16, h: 114, lean: -10, w: 22, bend: -3, front: true },
  { x: 18, h: 122, lean: 11, w: 22, bend: 3, front: true },
] as const;

export function SnakePlant() {
  const { id, url } = useArt();
  return (
    <g>
      <defs>
        <LeafGrad id={id("margin")} base="#9c9b45" mid="#cfca62" tip="#e3dc83" />
        <LinGrad
          id={id("blade")}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            [0, "#3d7a49"],
            [0.45, "#2c6239"],
            [1, "#1a4227"],
          ]}
        />
        <LinGrad
          id={id("bladeB")}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            [0, "#326a3e"],
            [0.5, "#24532f"],
            [1, "#163a22"],
          ]}
        />
        <pattern id={id("bands")} width={22} height={10} patternUnits="userSpaceOnUse">
          <path
            d="M0 5 C5.5 1.6 11 8.4 16.5 5 S22 4 22 5"
            fill="none"
            stroke="#9cc2a0"
            strokeWidth={2.2}
            opacity={0.5}
          />
        </pattern>
      </defs>
      {SNAKE_BLADES.map((b, i) => {
        const p0: Pt = [0, 4];
        const p1: Pt = [0, -b.h * 0.35];
        const p2: Pt = [b.bend * 0.8, -b.h * 0.72];
        const p3: Pt = [b.bend, -b.h];
        const outer = ribbon(p0, p1, p2, p3, blade(b.w, { hold: 0.52, base: 0.85 }), 16);
        const inner = ribbon(
          p0,
          p1,
          p2,
          [b.bend, -b.h + 5],
          blade(b.w - 5.5, { hold: 0.52, base: 0.85 }),
          16,
        );
        return (
          <Pivot key={i} x={b.x} y={0} rot={b.lean} motion={flutterSpec(i, 0.7, 7)} kind="sway">
            <path d={outer} fill={url("margin")} />
            <path d={inner} fill={url(b.front ? "blade" : "bladeB")} />
            <path d={inner} fill={url("bands")} opacity={b.front ? 1 : 0.7} />
            <path
              d={`M${pt([-b.w * 0.18, -6])} Q${pt([-b.w * 0.16 + b.bend * 0.4, -b.h * 0.5])} ${pt([b.bend * 0.8, -b.h * 0.9])}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0.12}
            />
          </Pivot>
        );
      })}
    </g>
  );
}

// ── Lucky bamboo ────────────────────────────────────────────

const STALKS = [
  { x: -18, h: 150, cut: true, leaves: [{ at: 118, rots: [-62, -34, -8] }] },
  { x: -5, h: 204, cut: true, leaves: [{ at: 182, rots: [-48, -18, 16, 40] }] },
  { x: 9, h: 176, cut: false, leaves: [{ at: 176, rots: [-14, 22, 52] }] },
  { x: 21, h: 128, cut: true, leaves: [{ at: 108, rots: [36, 64] }] },
] as const;

export function LuckyBamboo() {
  const { id, url } = useArt();
  const w = 9;
  return (
    <g>
      <defs>
        <LinGrad
          id={id("stalk")}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            [0, "#5f8a31"],
            [0.3, "#b6d56a"],
            [0.55, "#90b44e"],
            [1, "#557d2c"],
          ]}
        />
        <LeafGrad id={id("lf")} base="#3f8a37" mid="#5fae46" tip="#9ad46c" />
        <LinGrad
          id={id("band")}
          stops={[
            [0, "#a9822f"],
            [0.5, "#e3c068"],
            [1, "#f5dd94"],
          ]}
        />
      </defs>
      {STALKS.map((s, i) => {
        const nodes: number[] = [];
        for (let y = 22; y < s.h - 6; y += 26) nodes.push(y);
        return (
          <Pivot key={i} x={s.x} y={0} motion={flutterSpec(i, 0.5, 8)} kind="sway">
            {s.leaves.map((cl, k) => (
              <Fragment key={`l${k}`}>
                {cl.rots.map((r, j) => {
                  const L = 40 + ((j * 7 + i * 3) % 14);
                  return (
                    <Leaf
                      key={j}
                      x={0}
                      y={-cl.at}
                      rot={r}
                      L={L}
                      W={9.5}
                      opts={{ p: 0.38, tip: "acuminate", bend: r > 0 ? 5 : -5 }}
                      fill={url("lf")}
                      gloss={0.2}
                      shade={0.18}
                      rib="#c9ef9e"
                      ribOpacity={0.4}
                      motion={flutterSpec(i * 5 + j, 2.6)}
                    />
                  );
                })}
              </Fragment>
            ))}
            <rect x={-w / 2} y={-s.h} width={w} height={s.h + 4} rx={w / 2} fill={url("stalk")} />
            {nodes.map((y) => (
              <g key={y}>
                <rect x={-w / 2 - 0.7} y={-y - 1.3} width={w + 1.4} height={2.6} rx={1.3} fill="#4b6e27" opacity={0.9} />
                <path d={`M${-w / 2 + 1} ${-y - 2.6} H${w / 2 - 1}`} stroke="#e1f2a8" strokeWidth={0.8} opacity={0.5} />
              </g>
            ))}
            {s.cut && (
              <>
                <ellipse cx={0} cy={-s.h + 1.6} rx={w / 2} ry={1.9} fill="#dfeaa8" />
                <ellipse cx={0} cy={-s.h + 1.6} rx={w / 2 - 1.6} ry={1} fill="#a9c766" />
              </>
            )}
          </Pivot>
        );
      })}
      {/* golden tie band — the classic lucky-bamboo arrangement */}
      <rect x={-25} y={-38} width={52} height={8} rx={3} fill={url("band")} />
      <path d="M-23 -36.4 H25" stroke="#fff4c8" strokeWidth={0.9} opacity={0.7} />
      <path d="M-23 -31.6 H25" stroke="#7e5f1e" strokeWidth={0.8} opacity={0.5} />
    </g>
  );
}

// ── Money tree (braided pachira) ────────────────────────────

const BRAID_TOP = 98;

function braidX(y: number, phase: number) {
  return 6.2 * Math.sin((y / 46) * Math.PI * 2 + phase);
}

const CLUSTERS = [
  { x: -14, y: -146, dir: -12, s: 0.82, back: true },
  { x: 22, y: -144, dir: 18, s: 0.86, back: true },
  { x: -56, y: -140, dir: -58, s: 1, back: false },
  { x: -30, y: -170, dir: -26, s: 1.04, back: false },
  { x: 2, y: -182, dir: 0, s: 1.08, back: false },
  { x: 32, y: -166, dir: 28, s: 1, back: false },
  { x: 58, y: -134, dir: 60, s: 0.95, back: false },
] as const;

export function MoneyTree() {
  const { id, url } = useArt();
  const phases = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  const seg = 46 / 6;
  const pieces: { d: string; z: number; key: string }[] = [];
  for (let y0 = 0; y0 < BRAID_TOP; y0 += seg) {
    const y1 = Math.min(BRAID_TOP, y0 + seg);
    phases.forEach((ph, si) => {
      const pts: Pt[] = [0, 0.5, 1].map((f) => {
        const y = y0 + (y1 - y0) * f;
        return [braidX(y, ph), -y];
      });
      const ym = (y0 + y1) / 2;
      pieces.push({ d: smoothThrough(pts), z: Math.cos((ym / 46) * Math.PI * 2 + phases[si]), key: `${n(y0)}-${si}` });
    });
  }
  // sort per segment by depth, keep segments bottom→top
  const ordered: typeof pieces = [];
  for (let i = 0; i < pieces.length; i += 3) {
    ordered.push(...pieces.slice(i, i + 3).sort((a, b) => a.z - b.z));
  }
  const tops = phases.map((ph) => [braidX(BRAID_TOP, ph), -BRAID_TOP] as Pt);
  const branchEnds: Pt[] = [
    [-34, -128],
    [2, -142],
    [32, -124],
  ];
  const branchOrder = tops
    .map((t, i) => ({ t, i }))
    .sort((a, b) => a.t[0] - b.t[0])
    .map((o, k) => ({ from: o.t, to: branchEnds[k] }));
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3a8a40" mid="#5fae4e" tip="#8fd068" />
        <LeafGrad id={id("lb")} base="#2b6e36" tip="#5c9e4c" />
      </defs>
      {branchOrder.map((b, i) => (
        <path
          key={`b${i}`}
          d={ribbon(b.from, [b.from[0], b.from[1] - 14], [b.to[0] * 0.7, b.to[1] + 10], b.to, taper(5, 2.6), 8)}
          fill="#7a5a3b"
        />
      ))}
      {CLUSTERS.map((c, i) => {
        const anchor = branchEnds[c.x < -20 ? 0 : c.x > 16 ? 2 : 1];
        return (
          <Stem
            key={`s${i}`}
            d={`M${pt(anchor)} Q${pt([(anchor[0] + c.x) / 2, Math.min(anchor[1], c.y) - 4])} ${pt([c.x, c.y])}`}
            color="#5c8c3c"
            width={1.6}
          />
        );
      })}
      {CLUSTERS.map((c, i) => {
        const angles = [-66, -33, 0, 33, 66];
        const lens = [22, 28, 32, 28, 22];
        return (
          <Pivot key={`c${i}`} x={c.x} y={c.y} rot={c.dir} motion={flutterSpec(i, 2.2, 5.5)}>
            {angles.map((a, k) => (
              <Leaf
                key={k}
                x={0}
                y={0}
                rot={a}
                L={lens[k] * c.s}
                W={lens[k] * c.s * 0.36}
                opts={{ p: 0.56, tip: "acute" }}
                fill={url(c.back ? "lb" : "lf")}
                gloss={0.2}
                shade={0.18}
                rib="#d2f3a8"
                ribOpacity={0.45}
              />
            ))}
          </Pivot>
        );
      })}
      {/* braided trunk */}
      {ordered.map((p) => (
        <g key={p.key}>
          <path d={p.d} fill="none" stroke="#5a4029" strokeWidth={6.6} strokeLinecap="round" />
          <path
            d={p.d}
            fill="none"
            stroke={p.z > 0 ? "#a27c55" : "#7d5d3e"}
            strokeWidth={4.6}
            strokeLinecap="round"
          />
          {p.z > 0.2 && (
            <path d={p.d} fill="none" stroke="#d2b088" strokeWidth={1.2} strokeLinecap="round" opacity={0.45} transform="translate(-1 0)" />
          )}
        </g>
      ))}
    </g>
  );
}

// ── Spider plant ────────────────────────────────────────────

type Arch = readonly [Pt, Pt, Pt];
const SPIDER_LEAVES: { a: Arch; back: boolean }[] = [
  { a: [[8, -56], [10, -100], [22, -118]], back: true },
  { a: [[-6, -58], [-8, -104], [-18, -124]], back: true },
  { a: [[6, -50], [24, -92], [40, -100]], back: true },
  { a: [[-6, -52], [-22, -96], [-36, -108]], back: true },
  { a: [[10, -40], [40, -84], [62, -78]], back: false },
  { a: [[-12, -40], [-44, -80], [-66, -72]], back: false },
  { a: [[14, -34], [54, -66], [80, -52]], back: false },
  { a: [[-14, -30], [-56, -60], [-82, -44]], back: false },
  { a: [[16, -24], [62, -44], [90, -22]], back: false },
  { a: [[-16, -20], [-62, -36], [-92, -14]], back: false },
  { a: [[16, -14], [62, -22], [86, 2]], back: false },
  { a: [[-14, -10], [-58, -14], [-84, 6]], back: false },
  { a: [[4, -40], [6, -70], [-6, -86]], back: false },
];

function Plantlet({ x, y }: { x: number; y: number }) {
  const { url } = useArt();
  const tips: Pt[] = [
    [-15, -6],
    [-9, -14],
    [-2, -17],
    [6, -15],
    [13, -8],
    [-12, 4],
    [12, 3],
  ];
  return (
    <Pivot x={x} y={y} motion={{ amp: 4, dur: 4.4, delay: -1.5 }}>
      <path d="M-2 2 q-2 6 -1 10 M1 2 q1 5 3 8 M0 2 q0 6 0 9" fill="none" stroke="#d8d2a8" strokeWidth={0.9} opacity={0.8} />
      {tips.map((tip, i) => (
        <g key={i}>
          <path
            d={ribbon([0, 0], [tip[0] * 0.3, tip[1] * 0.8 - 3], [tip[0] * 0.8, tip[1] - 2], tip, blade(4.2, { hold: 0.3 }), 6)}
            fill={url(i % 2 ? "lf" : "lb")}
          />
          <path
            d={ribbon([0, 0], [tip[0] * 0.3, tip[1] * 0.8 - 3], [tip[0] * 0.8, tip[1] - 2], tip, blade(1.4, { hold: 0.2 }), 6)}
            fill="#f1f0cf"
            opacity={0.85}
          />
        </g>
      ))}
    </Pivot>
  );
}

export function SpiderPlant() {
  const { id, url, variant } = useArt();
  const potted = variant === "potted";
  const runners: { d: string; end: Pt }[] = potted
    ? [
        { d: "M-4 -14 C-30 -96 -84 -86 -94 30", end: [-94, 30] },
        { d: "M4 -14 C32 -100 88 -84 96 22", end: [96, 22] },
      ]
    : [
        { d: "M-4 -14 C-26 -110 -76 -100 -86 -36", end: [-86, -36] },
        { d: "M4 -14 C30 -118 82 -104 90 -44", end: [90, -44] },
      ];
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3d8f3f" mid="#5aaf4c" tip="#86cc62" />
        <LeafGrad id={id("lb")} base="#2b6d34" tip="#55984a" />
      </defs>
      {runners.map((r, i) => (
        <Pivot key={`r${i}`} motion={{ amp: 1.4, dur: 7 + i, delay: -i * 2 }} kind="sway">
          <path d={r.d} fill="none" stroke="#c7cd8a" strokeWidth={1.4} strokeLinecap="round" />
          <Plantlet x={r.end[0]} y={r.end[1]} />
        </Pivot>
      ))}
      {SPIDER_LEAVES.map(({ a, back }, i) => {
        const p0: Pt = [0, -2];
        const outer = ribbon(p0, a[0], a[1], a[2], blade(10, { hold: 0.35, base: 0.8 }), 14);
        const stripe = ribbon(p0, a[0], a[1], a[2], blade(3.2, { hold: 0.3, base: 0.8 }), 14);
        return (
          <Pivot key={i} motion={flutterSpec(i, 1.8, 5)}>
            <path d={outer} fill={url(back ? "lb" : "lf")} />
            <path d={stripe} fill="#f1f0cf" opacity={back ? 0.7 : 0.92} />
          </Pivot>
        );
      })}
    </g>
  );
}
