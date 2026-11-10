"use client";

/*
 * Dev-only concept sketches for the pot's form (not shipped, not translated).
 * Explores replacements for the halo ring: a telescoping lamp mast, a pop-up
 * periscope, a light arch and a sprout-shaped lamp, on a softer body.
 */

import { useId } from "react";
import { PlantGraphic } from "@/components/plant-art/PlantGraphic";
import { getPlantMeta } from "@/components/plant-art/registry";
import { luminance, mix } from "@/components/pot/color";
import { getFinish, type PotFinishId, type PotSize } from "@/data";

export type ConceptTop = "lamp" | "periscope" | "arch" | "sprout" | "none";
export type ConceptFace = "glow" | "glass";
export type ConceptMood = "happy" | "calm" | "sleepy";

interface ConceptPotProps {
  size?: PotSize;
  finish?: PotFinishId;
  plantId: string | null;
  top: ConceptTop;
  face?: ConceptFace;
  mood?: ConceptMood;
  lightOn?: boolean;
  /** Night scene: stronger, additive light. */
  night?: boolean;
  className?: string;
}

const VB_W = 300;
const VB_H = 400;
const CX = 150;
const GROUND = 380;
const ELL = 0.2;
const SIZES: Record<PotSize, { w: number; h: number; plant: number }> = {
  S: { w: 100, h: 98, plant: 0.7 },
  M: { w: 126, h: 112, plant: 0.82 },
  L: { w: 154, h: 124, plant: 0.92 },
};

const r = (v: number) => Math.round(v * 100) / 100;

export function ConceptPot({
  size = "M",
  finish = "porcelain",
  plantId,
  top,
  face = "glow",
  mood = "happy",
  lightOn = true,
  night = false,
  className,
}: ConceptPotProps) {
  const uid = `cp${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fin = getFinish(finish) ?? { color: "#ECE7DF", shade: "#C9C1B4" };
  const { color, shade } = fin;
  const light = luminance(color) > 0.5;
  const spec = SIZES[size];
  const { w, h } = spec;
  const u = w / 126;

  // ── body: a rounded cup on a small wooden foot ──
  const a = w / 2;
  const bf = a * 0.6;
  const baseH = 11 * u;
  const B = GROUND - baseH;
  const T = B - h;
  const ryT = a * ELL;
  const ryB = bf * ELL * 0.9;
  const b0 = a * 0.92;
  const body =
    `M${r(CX - a)} ${r(T)} ` +
    `C${r(CX - a * 1.09)} ${r(T + h * 0.44)} ${r(CX - a * 0.94)} ${r(B + ryB * 0.55)} ${r(CX - bf)} ${r(B + ryB)} ` +
    `Q${r(CX)} ${r(B + ryB * 1.7)} ${r(CX + bf)} ${r(B + ryB)} ` +
    `C${r(CX + a * 0.94)} ${r(B + ryB * 0.55)} ${r(CX + a * 1.09)} ${r(T + h * 0.44)} ${r(CX + a)} ${r(T)} ` +
    `A${r(a)} ${r(ryT)} 0 0 1 ${r(CX - a)} ${r(T)}Z`;
  const pb = bf * 1.02;
  const base =
    `M${r(CX - pb)} ${r(B - 4)} L${r(CX - pb)} ${r(GROUND - pb * ELL * 0.3)} ` +
    `A${r(pb)} ${r(pb * ELL)} 0 0 0 ${r(CX + pb)} ${r(GROUND - pb * ELL * 0.3)} L${r(CX + pb)} ${r(B - 4)}Z`;
  const rimW = w * 0.05;
  const openA = a - rimW;
  const openY = T + 0.4;
  const soilY = openY + 4 * u;

  const pal = {
    edge: mix(shade, "#000000", 0.26),
    hi: mix(color, "#ffffff", light ? 0.55 : 0.2),
    mid: mix(color, shade, 0.6),
    rim: mix(color, "#ffffff", light ? 0.35 : 0.14),
    inner: mix(shade, "#000000", 0.6),
    innerLow: mix(shade, "#000000", 0.38),
    part: mix(color, "#ffffff", light ? 0.2 : 0.16),
    partHi: mix(color, "#ffffff", 0.7),
    partLo: mix(shade, "#000000", 0.12),
  };
  const brass = { fill: "#c9a56c", hi: "#f3dfb4", lo: "#a8834d", edge: "#7c5e34" };

  // ── plant ──
  const meta = plantId ? getPlantMeta(plantId) : null;
  const headroom = top === "none" ? 14 : 64;
  const boost = meta ? Math.min(1.18, Math.max(1, 150 / meta.height)) : 1;
  const plantScale = meta ? Math.min(spec.plant * boost, 124 / meta.halfWidth, (soilY - headroom) / meta.height) : spec.plant;
  const plantTop = soilY - (meta ? meta.height * plantScale : 70);
  const canopyY = soilY - (meta ? meta.canopy * plantScale : 50);
  const plantHalf = meta ? meta.halfWidth * plantScale : 50;
  const plantLayer = () =>
    plantId ? <PlantGraphic plantId={plantId} x={CX} y={r(soilY)} scale={r(plantScale)} animated={false} variant="potted" /> : null;

  // ── face ──
  const fw = w * 0.62;
  const fs = fw / 100;
  const faceY = T + h * 0.47;
  const eyeCore = face === "glass" ? "#ffe8b6" : light ? "#ef9a2c" : "#ffd58a";
  const eyeGlow = "#f4a63c";

  // ── top structure anchors ──
  const lift = top === "arch" ? 22 : top === "periscope" ? 12 : top === "sprout" ? 26 : 38;
  const headY = Math.max(22, plantTop - lift);
  const mastX = CX + a * 0.6;
  const mastBase = T - ryT * 0.62;
  const warm = "#ffefc2";
  const beam = night ? 0.6 : 0.42;

  // lamp
  const armR = 20 * u;
  const lampCx = CX + 2;
  const hubX = lampCx + 3 * u;
  const joint = mastBase - (mastBase - headY) * 0.5;
  const lampRx = 39 * u;
  const lampRy = lampRx * 0.22;
  const lampY = headY + 10 * u;
  const lampDome =
    `M${r(lampCx - lampRx)} ${r(lampY)} C${r(lampCx - lampRx)} ${r(lampY - 13 * u)} ${r(lampCx + lampRx)} ${r(lampY - 13 * u)} ${r(lampCx + lampRx)} ${r(lampY)} ` +
    `A${r(lampRx)} ${r(lampRy)} 0 0 1 ${r(lampCx - lampRx)} ${r(lampY)}Z`;
  const lampCone =
    `M${r(lampCx - lampRx * 0.9)} ${r(lampY + 1)} L${r(lampCx - Math.max(plantHalf * 0.95, a * 0.9))} ${r(soilY)} ` +
    `L${r(lampCx + Math.max(plantHalf * 0.95, a * 0.9))} ${r(soilY)} L${r(lampCx + lampRx * 0.9)} ${r(lampY + 1)}Z`;

  // light column: a telescoping cylinder with the camera at its top and a light strip down its plant-facing side
  const periX = CX + a * 0.62;
  const colW = 14 * u;
  const upW = colW * 0.8;
  const periTop = headY;
  const periJoint = mastBase - (mastBase - periTop) * 0.4;
  const stripX = periX - upW * 0.2;
  const stripTop = periTop + 15 * u;
  const stripLen = Math.min(54 * u, periJoint - stripTop - 8 * u);
  const periCone =
    `M${r(periX - upW / 2)} ${r(stripTop - 2)} L${r(CX - plantHalf * 0.98)} ${r(Math.max(periTop, canopyY - 60 * u))} ` +
    `L${r(CX - plantHalf * 0.75)} ${r(soilY - 6)} L${r(periX - upW / 2)} ${r(stripTop + stripLen + 4)}Z`;

  // arch
  const legX = a * 0.9;
  const archR = Math.min(legX, 54 * u);
  const archTop = Math.min(headY, T - archR - 22);
  const archD =
    `M${r(CX - legX)} ${r(T)} L${r(CX - legX)} ${r(archTop + archR)} A${r(archR)} ${r(archR)} 0 0 1 ${r(CX - legX + archR)} ${r(archTop)} ` +
    `L${r(CX + legX - archR)} ${r(archTop)} A${r(archR)} ${r(archR)} 0 0 1 ${r(CX + legX)} ${r(archTop + archR)} L${r(CX + legX)} ${r(T)}`;
  const ledIn = 3.4;
  const ledR = archR - ledIn;
  const ledA = 0.9; // radians of each corner arc that carry LEDs
  const archLed =
    `M${r(CX - legX + ledIn + ledR * (1 - Math.sin(ledA)))} ${r(archTop + ledIn + ledR * (1 - Math.cos(ledA)))} ` +
    `A${r(ledR)} ${r(ledR)} 0 0 1 ${r(CX - legX + archR)} ${r(archTop + ledIn)} L${r(CX + legX - archR)} ${r(archTop + ledIn)} ` +
    `A${r(ledR)} ${r(ledR)} 0 0 1 ${r(CX + legX - ledIn - ledR * (1 - Math.sin(ledA)))} ${r(archTop + ledIn + ledR * (1 - Math.cos(ledA)))}`;
  const archCone = `M${r(CX - legX * 0.72)} ${r(archTop + 6)} L${r(CX - a * 0.95)} ${r(soilY)} L${r(CX + a * 0.95)} ${r(soilY)} L${r(CX + legX * 0.72)} ${r(archTop + 6)}Z`;

  // sprout
  const tipX = mastX - 24 * u;
  const tipY = headY + 6;
  const sproutD = `M${r(mastX)} ${r(mastBase)} C${r(mastX + 16 * u)} ${r(mastBase - (mastBase - tipY) * 0.5)} ${r(mastX + 10 * u)} ${r(tipY + 26 * u)} ${r(tipX)} ${r(tipY)}`;
  const leafL = 78 * u;
  const leafW = 17 * u;
  const leafCx = tipX - leafL / 2 + 4 * u;
  const leafD = (hw: number) =>
    `M${r(leafL / 2)} 0 C${r(leafL * 0.22)} ${r(-hw)} ${r(-leafL * 0.2)} ${r(-hw * 1.05)} ${r(-leafL / 2)} 0 C${r(-leafL * 0.2)} ${r(hw * 0.75)} ${r(leafL * 0.22)} ${r(hw * 0.7)} ${r(leafL / 2)} 0Z`;
  const budT = 0.46;
  const budX = mastX + 12.4 * u * (3 * budT * (1 - budT) * (1 - budT) * 1.29 + 3 * budT * budT * (1 - budT) * 0.8);
  const budY = mastBase - (mastBase - tipY) * 0.47;
  const sproutCone = `M${r(leafCx - leafL * 0.42)} ${r(tipY + 4)} L${r(CX - Math.max(plantHalf * 0.9, a * 0.85))} ${r(soilY)} L${r(CX + a * 0.8)} ${r(soilY)} L${r(leafCx + leafL * 0.42)} ${r(tipY + 4)}Z`;

  const cone = top === "lamp" ? lampCone : top === "periscope" ? periCone : top === "arch" ? archCone : top === "sprout" ? sproutCone : null;
  const coneTop = top === "lamp" ? lampY : top === "periscope" ? stripTop : top === "arch" ? archTop : tipY;
  const litCx = top === "periscope" ? CX + plantHalf * 0.45 : top === "sprout" ? leafCx : CX;
  const litCy = top === "periscope" ? stripTop + stripLen * 0.6 : Math.min(canopyY, coneTop + 70 * u);

  /** A tube drawn as outline + fill + highlight. */
  const tube = (d: string, width: number, key: string, metal = true) => (
    <g key={key} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={metal ? brass.edge : pal.edge} strokeWidth={r(width + 1.3)} />
      <path d={d} stroke={metal ? brass.fill : pal.part} strokeWidth={r(width)} />
      <path
        d={d}
        stroke={metal ? brass.hi : pal.partHi}
        strokeWidth={r(Math.max(0.7, width * 0.24))}
        opacity={0.85}
        transform={`translate(${r(-width * 0.2)} 0)`}
      />
    </g>
  );
  const collar = (x: number, y: number, width: number) => (
    <rect
      x={r(x - width / 2 - 1.5)}
      y={r(y - 3.2 * u)}
      width={r(width + 3)}
      height={r(6.4 * u)}
      rx={r(2 * u)}
      fill={brass.lo}
      stroke={brass.edge}
      strokeWidth={0.6}
    />
  );
  const lens = (x: number, y: number, s = 1) => (
    <g transform={`translate(${r(x)} ${r(y)}) scale(${r(s)})`}>
      <circle r={3.9} fill={pal.edge} />
      <circle r={3} fill="#10171a" />
      <circle r={1.5} fill="#1d3f4d" />
      <circle cx={-0.8} cy={-0.9} r={0.65} fill="#bfeaff" />
    </g>
  );

  return (
    <div className={className} style={{ aspectRatio: "3 / 4", position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} role="img" aria-label={`concept ${top}`}>
        <defs>
          <linearGradient id={`${uid}-body`} x1={0} y1={0} x2={1} y2={0}>
            <stop offset={0} stopColor={mix(shade, "#000000", 0.1)} />
            <stop offset={0.12} stopColor={mix(color, shade, 0.55)} />
            <stop offset={0.3} stopColor={color} />
            <stop offset={0.4} stopColor={mix(color, "#ffffff", light ? 0.45 : 0.14)} />
            <stop offset={0.58} stopColor={color} />
            <stop offset={0.86} stopColor={mix(color, shade, 0.7)} />
            <stop offset={1} stopColor={mix(shade, "#000000", 0.14)} />
          </linearGradient>
          <linearGradient id={`${uid}-ao`} x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor="#000" stopOpacity={0.1} />
            <stop offset={0.12} stopColor="#000" stopOpacity={0} />
            <stop offset={0.62} stopColor="#000" stopOpacity={0} />
            <stop offset={1} stopColor="#000" stopOpacity={0.22} />
          </linearGradient>
          <linearGradient id={`${uid}-wood`} x1={0} y1={0} x2={1} y2={0}>
            <stop offset={0} stopColor="#8a5f36" />
            <stop offset={0.3} stopColor="#c99a63" />
            <stop offset={0.45} stopColor="#dcb27c" />
            <stop offset={0.8} stopColor="#b08150" />
            <stop offset={1} stopColor="#7d5630" />
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
          <radialGradient id={`${uid}-shadow`}>
            <stop offset={0} stopColor="#3a2a12" stopOpacity={0.5} />
            <stop offset={0.6} stopColor="#3a2a12" stopOpacity={0.18} />
            <stop offset={1} stopColor="#3a2a12" stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${uid}-cone`} gradientUnits="userSpaceOnUse" x1={0} y1={r(coneTop)} x2={0} y2={r(soilY)}>
            <stop offset={0} stopColor="#ffd98a" stopOpacity={beam} />
            <stop offset={0.55} stopColor="#ffe2a6" stopOpacity={beam * 0.42} />
            <stop offset={1} stopColor="#ffe9bd" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${uid}-coneH`} gradientUnits="userSpaceOnUse" x1={r(periX)} y1={0} x2={r(CX - plantHalf)} y2={0}>
            <stop offset={0} stopColor="#ffd98a" stopOpacity={beam} />
            <stop offset={0.5} stopColor="#ffe2a6" stopOpacity={beam * 0.4} />
            <stop offset={1} stopColor="#ffe9bd" stopOpacity={0} />
          </linearGradient>
          <radialGradient id={`${uid}-lit`}>
            <stop offset={0} stopColor="#fff6d6" stopOpacity={night ? 0.75 : 0.6} />
            <stop offset={0.5} stopColor="#fff0c0" stopOpacity={0.2} />
            <stop offset={1} stopColor="#fff0c0" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${uid}-halo`}>
            <stop offset={0} stopColor="#ffd98a" stopOpacity={night ? 0.5 : 0.34} />
            <stop offset={1} stopColor="#ffd98a" stopOpacity={0} />
          </radialGradient>
          <filter id={`${uid}-soft`} x={-0.5} y={-2} width={2} height={5}>
            <feGaussianBlur stdDeviation={2.6} />
          </filter>
          <filter id={`${uid}-eye`} x={-1} y={-1} width={3} height={3}>
            <feGaussianBlur stdDeviation={face === "glass" ? 2.4 : 3.2} />
          </filter>
          <filter id={`${uid}-beam`} x={-0.2} y={-0.1} width={1.4} height={1.2}>
            <feGaussianBlur stdDeviation={5} />
          </filter>
          <clipPath id={`${uid}-opening`}>
            <ellipse cx={CX} cy={r(openY)} rx={r(openA)} ry={r(openA * ELL)} />
          </clipPath>
          {plantId && (
            <mask id={`${uid}-plant`} maskUnits="userSpaceOnUse" x={0} y={0} width={VB_W} height={VB_H} style={{ maskType: "alpha" }}>
              {plantLayer()}
            </mask>
          )}
        </defs>

        <ellipse cx={CX} cy={GROUND + 1} rx={r(b0 * 1.6)} ry={r(b0 * 0.3)} fill={`url(#${uid}-shadow)`} />

        {/* light falling on the plant (behind it) */}
        {lightOn && cone && <path d={cone} fill={`url(#${uid}-${top === "periscope" ? "coneH" : "cone"})`} filter={`url(#${uid}-beam)`} />}

        {/* arch sits in the plant's plane: draw it behind the foliage */}
        {top === "arch" && (
          <g>
            {tube(archD, 4.6 * u, "arch")}
            {lightOn && <path d={archLed} fill="none" stroke="#ffd98a" strokeWidth={8} strokeLinecap="round" opacity={0.6} filter={`url(#${uid}-soft)`} />}
            <path d={archLed} fill="none" stroke={lightOn ? warm : "#8b8b84"} strokeWidth={r(1.9 * u)} strokeLinecap="round" />
            <rect x={r(CX - 7 * u)} y={r(archTop - 4.4 * u)} width={r(14 * u)} height={r(9.4 * u)} rx={r(4.4 * u)} fill={brass.fill} stroke={brass.edge} strokeWidth={0.6} />
            {lens(CX, archTop + 0.6 * u, 0.7 * u)}
          </g>
        )}

        {/* body */}
        <path d={base} fill={`url(#${uid}-wood)`} />
        <path d={body} fill={`url(#${uid}-body)`} />
        <path d={body} fill={`url(#${uid}-ao)`} />

        {/* face */}
        <g transform={`translate(${CX} ${r(faceY)}) scale(${r(fs)})`}>
          {face === "glass" && (
            <rect x={-50} y={-29} width={100} height={58} rx={25} fill="#1c1813" stroke={pal.edge} strokeWidth={1.2} />
          )}
          {face === "glass" && <path d="M-36 -22 Q0 -27 36 -22" fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.12} strokeLinecap="round" />}
          <g filter={`url(#${uid}-eye)`} opacity={face === "glass" ? 0.75 : light ? 0.5 : 0.8} fill="none" stroke={eyeGlow} strokeWidth={8} strokeLinecap="round">
            <FaceMarks mood={mood} />
          </g>
          <g fill="none" stroke={eyeCore} strokeWidth={6.4} strokeLinecap="round">
            <FaceMarks mood={mood} />
          </g>
          {face !== "glass" && (
            <>
              <ellipse cx={-35} cy={11} rx={6} ry={3.6} fill="#f08a6a" opacity={light ? 0.34 : 0.16} />
              <ellipse cx={35} cy={11} rx={6} ry={3.6} fill="#f08a6a" opacity={light ? 0.34 : 0.16} />
            </>
          )}
        </g>

        {/* rim, opening, soil */}
        <ellipse cx={CX} cy={r(T + 1.6)} rx={r(a + 0.6)} ry={r(ryT + 1)} fill={pal.edge} opacity={0.28} />
        <ellipse cx={CX} cy={r(T)} rx={r(a + 0.4)} ry={r(ryT)} fill={`url(#${uid}-rim)`} />
        <ellipse cx={CX} cy={r(openY)} rx={r(openA)} ry={r(openA * ELL)} fill={`url(#${uid}-inner)`} />
        <g clipPath={`url(#${uid}-opening)`}>
          <ellipse cx={CX} cy={r(soilY)} rx={r(openA - 0.5)} ry={r((openA - 0.5) * ELL)} fill={`url(#${uid}-soil)`} />
        </g>

        {/* structures that stand behind the plant */}
        {top === "lamp" && (
          <g>
            {tube(`M${r(mastX)} ${r(mastBase)} L${r(mastX)} ${r(joint)}`, 5.4 * u, "lower")}
            {tube(
              `M${r(mastX)} ${r(joint)} L${r(mastX)} ${r(headY + armR)} A${r(armR)} ${r(armR)} 0 0 0 ${r(mastX - armR)} ${r(headY)} L${r(hubX)} ${r(headY)}`,
              3.6 * u,
              "upper",
            )}
            {collar(mastX, joint, 5.4 * u)}
            <ellipse cx={r(mastX)} cy={r(mastBase + 0.6)} rx={r(5.4 * u)} ry={r(2 * u)} fill={brass.lo} stroke={brass.edge} strokeWidth={0.5} />
          </g>
        )}
        {top === "periscope" && (
          <g>
            {tube(`M${r(periX)} ${r(mastBase)} L${r(periX)} ${r(periJoint)}`, colW, "lower", false)}
            {tube(`M${r(periX)} ${r(periJoint)} L${r(periX)} ${r(periTop + upW / 2)}`, upW, "upper", false)}
            {collar(periX, periJoint, colW)}
            <ellipse cx={r(periX)} cy={r(mastBase + 1.4)} rx={r(colW * 0.62)} ry={r(colW * 0.2)} fill={brass.lo} stroke={brass.edge} strokeWidth={0.5} />
          </g>
        )}
        {top === "periscope" && (
          <g>
            {lightOn && (
              <rect
                x={r(stripX - 7 * u)}
                y={r(stripTop - 5 * u)}
                width={r(14 * u)}
                height={r(stripLen + 10 * u)}
                rx={r(7 * u)}
                fill="#ffd98a"
                opacity={0.7}
                filter={`url(#${uid}-soft)`}
              />
            )}
            <rect x={r(stripX - 1.9 * u)} y={r(stripTop)} width={r(3.8 * u)} height={r(stripLen)} rx={r(1.9 * u)} fill={lightOn ? warm : "#a9a79d"} />
            {lens(periX - upW * 0.08, periTop + 6.4 * u, 0.74 * u)}
          </g>
        )}
        {top === "sprout" && (
          <g>
            {tube(sproutD, 3.4 * u, "stalk")}
            <path d={`M${r(budX)} ${r(budY)} q${r(-7 * u)} ${r(-3 * u)} ${r(-10 * u)} ${r(-9 * u)}`} fill="none" stroke={brass.edge} strokeWidth={r(2.8 * u)} strokeLinecap="round" />
            <path d={`M${r(budX)} ${r(budY)} q${r(-7 * u)} ${r(-3 * u)} ${r(-10 * u)} ${r(-9 * u)}`} fill="none" stroke={brass.fill} strokeWidth={r(1.7 * u)} strokeLinecap="round" />
            <ellipse cx={r(mastX)} cy={r(mastBase + 0.6)} rx={r(4.6 * u)} ry={r(1.9 * u)} fill={brass.lo} stroke={brass.edge} strokeWidth={0.5} />
          </g>
        )}

        {/* plant */}
        {plantLayer()}
        {plantId && lightOn && top !== "none" && (
          <g mask={`url(#${uid}-plant)`} style={{ mixBlendMode: night ? "screen" : "soft-light" }}>
            <ellipse cx={r(litCx)} cy={r(litCy)} rx={r(Math.max(plantHalf, 60) * 1.05)} ry={r(Math.max(60, (soilY - coneTop) * 0.5))} fill={`url(#${uid}-lit)`} />
          </g>
        )}

        {/* heads, in front of the foliage */}
        {top === "lamp" && (
          <g>
            {lightOn && <ellipse cx={r(lampCx)} cy={r(lampY + 5)} rx={r(lampRx * 1.5)} ry={r(lampRx * 0.62)} fill={`url(#${uid}-halo)`} />}
            <path d={lampDome} fill={`url(#${uid}-body)`} stroke={pal.edge} strokeWidth={0.7} />
            <path
              d={`M${r(lampCx - lampRx * 0.62)} ${r(lampY - 6.6 * u)} Q${r(lampCx)} ${r(lampY - 10.4 * u)} ${r(lampCx + lampRx * 0.3)} ${r(lampY - 8 * u)}`}
              fill="none"
              stroke="#fff"
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.5}
            />
            {lightOn && (
              <path
                d={`M${r(lampCx - lampRx * 0.93)} ${r(lampY + lampRy * 0.36)} A${r(lampRx)} ${r(lampRy)} 0 0 0 ${r(lampCx + lampRx * 0.93)} ${r(lampY + lampRy * 0.36)}`}
                fill="none"
                stroke="#ffd98a"
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.7}
                filter={`url(#${uid}-soft)`}
              />
            )}
            <path
              d={`M${r(lampCx - lampRx * 0.93)} ${r(lampY + lampRy * 0.36)} A${r(lampRx)} ${r(lampRy)} 0 0 0 ${r(lampCx + lampRx * 0.93)} ${r(lampY + lampRy * 0.36)}`}
              fill="none"
              stroke={lightOn ? warm : "#8b8b84"}
              strokeWidth={r(1.7 * u)}
              strokeLinecap="round"
            />
            <circle cx={r(hubX)} cy={r(headY)} r={r(3.4 * u)} fill={brass.fill} stroke={brass.edge} strokeWidth={0.6} />
            {lens(lampCx, lampY + lampRy * 0.8, 0.62 * u)}
          </g>
        )}
        {top === "sprout" && (
          <g>
            {lightOn && <ellipse cx={r(leafCx)} cy={r(tipY + 6)} rx={r(leafL * 0.75)} ry={r(leafL * 0.3)} fill={`url(#${uid}-halo)`} />}
            <g transform={`translate(${r(leafCx)} ${r(tipY)}) rotate(-7)`}>
              {lightOn && <path d={leafD(leafW)} transform="translate(0 3.4)" fill="#ffd98a" opacity={0.75} filter={`url(#${uid}-soft)`} />}
              <path d={leafD(leafW)} transform="translate(0 2.2)" fill={lightOn ? warm : "#8b8b84"} />
              <path d={leafD(leafW)} fill={`url(#${uid}-body)`} stroke={pal.edge} strokeWidth={0.7} />
              <path d={`M${r(leafL / 2 - 3)} 0 Q0 ${r(-leafW * 0.34)} ${r(-leafL / 2 + 4)} 0`} fill="none" stroke={pal.edge} strokeWidth={0.7} opacity={0.5} />
            </g>
            <circle cx={r(budX - 11 * u)} cy={r(budY - 10 * u)} r={r(5 * u)} fill={pal.part} stroke={pal.edge} strokeWidth={0.6} />
            {lens(budX - 11.6 * u, budY - 9.6 * u, 0.82 * u)}
          </g>
        )}
        {top === "arch" && (
          <g>
            {collar(CX - legX, T - 24 * u, 4.6 * u)}
            {collar(CX + legX, T - 24 * u, 4.6 * u)}
          </g>
        )}
      </svg>
    </div>
  );
}

function FaceMarks({ mood }: { mood: ConceptMood }) {
  if (mood === "sleepy") {
    return (
      <>
        <path d="M-27 -3 Q-19 3 -11 -3" />
        <path d="M11 -3 Q19 3 27 -3" />
        <path d="M-4 13 Q0 15 4 13" strokeWidth={4.4} />
      </>
    );
  }
  if (mood === "calm") {
    return (
      <>
        <path d="M-19 -9 L-19 1" strokeWidth={9} />
        <path d="M19 -9 L19 1" strokeWidth={9} />
        <path d="M-6 13 Q0 17.5 6 13" strokeWidth={4.4} />
      </>
    );
  }
  return (
    <>
      <path d="M-27 0 Q-19 -11 -11 0" />
      <path d="M11 0 Q19 -11 27 0" />
      <path d="M-6 12 Q0 18 6 12" strokeWidth={4.4} />
    </>
  );
}
