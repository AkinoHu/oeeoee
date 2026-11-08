"use client";

import {
  angleOf,
  cubic,
  cubicTan,
  n,
  pt,
  rotFor,
  type LeafShape,
  type Pt,
} from "../geometry";
import { flutterSpec, Leaf, LeafGrad, Pivot, RadGrad, Stem, useArt } from "../kit";

type Curve = readonly [Pt, Pt, Pt, Pt];
const curveD = ([a, b, c, d]: Curve) => `M${pt(a)} C${pt(b)} ${pt(c)} ${pt(d)}`;

// ── Phalaenopsis ────────────────────────────────────────────

function Flower({ x, y, s, i }: { x: number; y: number; s: number; i: number }) {
  const { url } = useArt();
  return (
    <Pivot x={x} y={y} motion={flutterSpec(i, 3, 4.5)}>
      <g transform={`scale(${n(s / 30)})`}>
        <ellipse cx={0} cy={-8.5} rx={5.6} ry={8.4} fill={url("sepal")} />
        <ellipse cx={0} cy={0} rx={4.6} ry={7.6} fill={url("sepal")} transform="translate(-5.6 7) rotate(32)" />
        <ellipse cx={0} cy={0} rx={4.6} ry={7.6} fill={url("sepal")} transform="translate(5.6 7) rotate(-32)" />
        <ellipse cx={0} cy={0} rx={8.8} ry={7.8} fill={url("petal")} transform="translate(-8.2 -1) rotate(-14)" />
        <ellipse cx={0} cy={0} rx={8.8} ry={7.8} fill={url("petal")} transform="translate(8.2 -1) rotate(14)" />
        <path d="M-6.5 -1 Q-8.5 -1 -12 -2.6 M6.5 -1 Q8.5 -1 12 -2.6" stroke="#e7a6c6" strokeWidth={0.6} opacity={0.6} fill="none" />
        <path d="M-4.2 2.6 C-5.4 8.4 -2.2 12 0 12.6 C2.2 12 5.4 8.4 4.2 2.6 C2.2 4.8 -2.2 4.8 -4.2 2.6Z" fill="#c4357b" />
        <ellipse cx={-2.4} cy={2.4} rx={1.7} ry={1.3} fill="#f3cd57" />
        <ellipse cx={2.4} cy={2.4} rx={1.7} ry={1.3} fill="#f3cd57" />
        <ellipse cx={0} cy={-1.4} rx={1.7} ry={2.4} fill="#fff6dd" />
      </g>
    </Pivot>
  );
}

export function Phalaenopsis() {
  const { id, url } = useArt();
  const spike: Curve = [
    [6, -8],
    [4, -104],
    [18, -188],
    [80, -166],
  ];
  const flowers = [
    { t: 0.46, s: 42 },
    { t: 0.6, s: 41 },
    { t: 0.73, s: 38 },
    { t: 0.85, s: 33 },
  ];
  const buds = [0.94, 1];
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#2c6a3c" mid="#3f8a4d" tip="#5aa760" />
        <LeafGrad id={id("lb")} base="#235a33" tip="#45844f" />
        <RadGrad
          id={id("petal")}
          cx={0.5}
          cy={0.5}
          r={0.6}
          stops={[
            [0, "#f3b5d1"],
            [0.55, "#fbe3ef"],
            [1, "#ffffff"],
          ]}
        />
        <RadGrad
          id={id("sepal")}
          cx={0.5}
          cy={0.3}
          r={0.7}
          stops={[
            [0, "#f7cde0"],
            [1, "#fff8fb"],
          ]}
        />
      </defs>
      <Leaf x={0} y={-4} rot={-54} L={50} W={22} opts={{ p: 0.55, tip: "round", bend: -6 }} fill={url("lb")} gloss={0.3} />
      <Leaf x={0} y={-4} rot={58} L={48} W={21} opts={{ p: 0.55, tip: "round", bend: 6 }} fill={url("lb")} gloss={0.3} />
      {/* aerial roots */}
      <path d="M-4 -6 C-16 -2 -28 6 -38 -2" fill="none" stroke="#a9b89a" strokeWidth={2.8} strokeLinecap="round" />
      <path d="M-35 -0.8 L-38 -2" stroke="#7fa86a" strokeWidth={2.8} strokeLinecap="round" />
      <path d="M6 -4 C18 2 24 10 34 6" fill="none" stroke="#a9b89a" strokeWidth={2.4} strokeLinecap="round" />
      <Pivot motion={{ amp: 1.2, dur: 7.5, delay: -2 }} kind="sway">
        <Stem d={curveD(spike)} color="#6f7d3f" width={2.2} />
        {buds.map((t, i) => {
          const p = cubic(...spike, t);
          return <ellipse key={i} cx={n(p[0])} cy={n(p[1] + 5)} rx={3.6} ry={5} fill="#d9e6b6" transform={`rotate(${n(-30 + i * 20)} ${n(p[0])} ${n(p[1] + 5)})`} />;
        })}
        {flowers.map((f, i) => {
          const p = cubic(...spike, f.t);
          return (
            <g key={i}>
              <Stem d={`M${pt(p)} q2 5 1 10`} color="#7d8a45" width={1.3} />
              <Flower x={p[0] + 1} y={p[1] + 16} s={f.s} i={i} />
            </g>
          );
        })}
      </Pivot>
      <Leaf x={0} y={-2} rot={-78} L={60} W={26} opts={{ p: 0.55, tip: "round", bend: -9 }} fill={url("lf")} gloss={0.38} motion={flutterSpec(2, 1)} />
      <Leaf x={0} y={-2} rot={82} L={58} W={25} opts={{ p: 0.55, tip: "round", bend: 9 }} fill={url("lf")} gloss={0.38} motion={flutterSpec(3, 1)} />
    </g>
  );
}

// ── Basil ───────────────────────────────────────────────────

const BASIL_STEMS: { c: Curve; scale: number; back: boolean }[] = [
  { c: [[-1, 0], [-3, -60], [-6, -120], [-8, -146]], scale: 1, back: true },
  { c: [[2, 0], [6, -60], [14, -116], [18, -138]], scale: 0.96, back: true },
  { c: [[-4, 0], [-12, -50], [-28, -96], [-36, -116]], scale: 0.92, back: false },
  { c: [[4, 0], [14, -44], [32, -86], [40, -104]], scale: 0.9, back: false },
  { c: [[0, 0], [-2, -36], [2, -72], [2, -88]], scale: 0.86, back: false },
];

export function Basil() {
  const { id, url } = useArt();
  const nodes = [0.3, 0.52, 0.72, 0.88];
  const sizes = [34, 28, 22, 16];
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3b9a3a" mid="#5dbe4b" tip="#93de6c" />
        <LeafGrad id={id("lb")} base="#2f7f32" tip="#5aaa48" />
      </defs>
      {BASIL_STEMS.map(({ c, scale, back }, si) => {
        const top = c[3];
        const topDir = angleOf(cubicTan(...c, 1));
        return (
          <Pivot key={si} motion={flutterSpec(si, 1, 6.5)} kind="sway">
            <Stem d={curveD(c)} color="#4c8d34" width={2.6} />
            {nodes.map((t, k) => {
              const p = cubic(...c, t);
              const dir = angleOf(cubicTan(...c, t));
              const L = sizes[k] * scale;
              return [1, -1].map((s) => (
                <Leaf
                  key={`${k}${s}`}
                  x={p[0]}
                  y={p[1]}
                  rot={rotFor(dir + s * (62 - k * 6))}
                  L={L}
                  W={L * 0.66}
                  opts={{ p: 0.42, base: "round", tip: "acute", bend: s * 2 }}
                  fill={url(back ? "lb" : "lf")}
                  gloss={0.42}
                  shade={0.26}
                  rib="#d9f7b5"
                  ribOpacity={0.55}
                  stroke="#2f7a2e"
                  strokeWidth={0.6}
                  motion={flutterSpec(si * 8 + k * 2 + (s > 0 ? 1 : 0), 2.4)}
                />
              ));
            })}
            {[-26, 26, 0].map((a, k) => (
              <Leaf
                key={`t${k}`}
                x={top[0]}
                y={top[1]}
                rot={rotFor(topDir + a)}
                L={a === 0 ? 10 : 13}
                W={a === 0 ? 7 : 8.6}
                opts={{ p: 0.45, base: "round", tip: "acute" }}
                fill={url("lf")}
                gloss={0.4}
                rib={null}
              />
            ))}
          </Pivot>
        );
      })}
    </g>
  );
}

// ── Mint ────────────────────────────────────────────────────

/** Ovate leaf with a serrated margin. */
function serrated(L: number, W: number): LeafShape {
  const N = 14;
  const right: Pt[] = [];
  for (let i = 1; i < N; i++) {
    const f = i / N;
    const hw = (W / 2) * Math.pow(Math.sin(Math.PI * Math.pow(f, 0.72)), 0.8);
    const tooth = i % 2 === 1 && f > 0.15 && f < 0.92 ? 0.9 : 0;
    right.push([hw + tooth, -L * f - tooth * 0.8]);
  }
  const tip: Pt = [0, -L];
  const left = right.map(([x, y]) => [-x, y] as Pt).reverse();
  const line = (ps: Pt[]) => ps.map((p) => `L${pt(p)}`).join(" ");
  const d = `M0 0 ${line(right)} L${pt(tip)} ${line(left)} Z`;
  const half = `M0 0 ${line(right)} L${pt(tip)} Z`;
  const halfL = `M0 0 ${line([...left].reverse())} L${pt(tip)} Z`;
  const rib = `M0 0 L${pt([0, -L * 0.94])}`;
  return { d, half, halfL, rib, widthAt: () => W / 2 };
}

const MINT_STEMS: { c: Curve; back: boolean }[] = [
  { c: [[-1, 0], [-2, -50], [-6, -100], [-8, -124]], back: true },
  { c: [[2, 0], [6, -48], [16, -94], [22, -112]], back: true },
  { c: [[-3, 0], [-10, -40], [-28, -78], [-38, -94]], back: false },
  { c: [[4, 0], [16, -32], [36, -60], [48, -70]], back: false },
  { c: [[0, 0], [2, -30], [4, -58], [4, -70]], back: false },
];

export function Mint() {
  const { id, url } = useArt();
  const nodes = [0.3, 0.55, 0.78];
  const sizes = [34, 28, 21];
  return (
    <g>
      <defs>
        <LeafGrad id={id("lf")} base="#3a8a4e" mid="#58ad62" tip="#8ad487" />
        <LeafGrad id={id("lb")} base="#2d7040" mid="#45935a" tip="#6db978" />
      </defs>
      {MINT_STEMS.map(({ c, back }, si) => {
        const top = c[3];
        const topDir = angleOf(cubicTan(...c, 1));
        return (
          <Pivot key={si} motion={flutterSpec(si, 1.1, 6)} kind="sway">
            <Stem d={curveD(c)} color="#5f7f45" width={2.2} />
            {nodes.map((t, k) => {
              const p = cubic(...c, t);
              const dir = angleOf(cubicTan(...c, t));
              const L = sizes[k];
              const shape = serrated(L, L * 0.72);
              return [1, -1].map((s) => (
                <Leaf
                  key={`${k}${s}`}
                  x={p[0]}
                  y={p[1]}
                  rot={rotFor(dir + s * (62 - k * 8))}
                  L={L}
                  W={L * 0.72}
                  shape={shape}
                  fill={url(back ? "lb" : "lf")}
                  shade={0.2}
                  gloss={0.18}
                  rib="#24592f"
                  ribOpacity={0.6}
                  ribWidth={0.9}
                  motion={flutterSpec(si * 8 + k * 2 + (s > 0 ? 1 : 0), 2.6)}
                >
                  {() => (
                    <path
                      d={[0.28, 0.46, 0.64, 0.8]
                        .flatMap((f) =>
                          [1, -1].map(
                            (q) =>
                              `M0 ${n(-L * f)} Q${n(q * L * 0.1)} ${n(-L * (f + 0.05))} ${n(q * L * 0.24)} ${n(-L * (f + 0.13))}`,
                          ),
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#1f5129"
                      strokeWidth={0.7}
                      strokeLinecap="round"
                      opacity={0.42}
                    />
                  )}
                </Leaf>
              ));
            })}
            {[-70, 70, -28, 28].map((a, k) => (
              <Leaf
                key={`t${k}`}
                x={top[0]}
                y={top[1]}
                rot={rotFor(topDir + a)}
                L={k < 2 ? 14 : 11}
                W={k < 2 ? 9.4 : 7.4}
                shape={serrated(k < 2 ? 14 : 11, k < 2 ? 9.4 : 7.4)}
                fill={url("lf")}
                shade={0.18}
                rib="#24592f"
                ribOpacity={0.5}
                ribWidth={0.7}
              />
            ))}
          </Pivot>
        );
      })}
    </g>
  );
}
