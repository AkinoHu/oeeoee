"use client";

import { motion } from "motion/react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { PARK, r2, ringPoint, VB_H, VB_W, type PotLayout } from "./geometry";
import "./pot.css";

const styles = {
  label: "oe-pot-label",
  labelLeft: "oe-pot-label-left",
  labelTitle: "oe-pot-label-title",
  labelDesc: "oe-pot-label-desc",
} as const;

export type CalloutId = "light" | "camera" | "screen" | "sensors" | "tank";

export interface CalloutSpec {
  id: CalloutId;
  anchor: readonly [number, number];
  side: "left" | "right";
  /** Label baseline (centre) in viewBox units. */
  y: number;
}

const END_LEFT = 62;
const END_RIGHT = VB_W - 62;
const GAP = 30;

/** Where each callout points, for the current pot layout (carriage parked). */
export function calloutSpecs(L: PotLayout): CalloutSpec[] {
  const depth = 0.86 + 0.14 * Math.sin(PARK);
  const [cx, cy] = ringPoint(L.ring, PARK, 1.02);
  const cam: [number, number] = [cx, cy + 5.2 * depth];
  const led = ringPoint(L.ring, PARK - 0.3 * 0.55, 0.965);
  const screen: [number, number] = [L.screen.x - 3 * L.u, L.screen.y + L.screen.h / 2];
  const probe: [number, number] = [L.probe.x, L.probe.top - 3 * L.u];
  const tank: [number, number] = [L.water.x + L.water.w + 1, L.water.y + L.water.h * 0.45];

  // left column: grow light, camera, screen — keep them apart
  const screenY = screen[1];
  const camY = Math.min(cam[1] + 20, screenY - GAP);
  const lightY = Math.max(18, Math.min(led[1] - 30, camY - GAP));
  // right column: sensors, tank
  const tankY = tank[1];
  const probeY = Math.min(probe[1] - 22, tankY - GAP * 1.6);

  return [
    { id: "light", anchor: led, side: "left", y: lightY },
    { id: "camera", anchor: cam, side: "left", y: camY },
    { id: "screen", anchor: screen, side: "left", y: screenY },
    { id: "sensors", anchor: probe, side: "right", y: probeY },
    { id: "tank", anchor: tank, side: "right", y: tankY },
  ];
}

function leader(s: CalloutSpec) {
  const [ax, ay] = s.anchor;
  const end = s.side === "left" ? END_LEFT : END_RIGHT;
  const dir = s.side === "left" ? -1 : 1;
  const dy = Math.abs(s.y - ay);
  const room = Math.abs(ax - end) - 8;
  const kneeX = ax + dir * Math.max(0, Math.min(dy, room));
  return `M${r2(ax)} ${r2(ay)} L${r2(kneeX)} ${r2(s.y)} L${r2(end)} ${r2(s.y)}`;
}

/** Leader lines + anchor dots, drawn inside the pot SVG. */
export function Callouts({ specs }: { specs: CalloutSpec[] }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      pointerEvents="none"
    >
      {specs.map((s) => (
        <g key={s.id}>
          <path
            d={leader(s)}
            fill="none"
            stroke="#e9f0ea"
            strokeOpacity={0.5}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={r2(s.anchor[0])} cy={r2(s.anchor[1])} r={3.6} fill="none" stroke="#b6f36b" strokeOpacity={0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <circle cx={r2(s.anchor[0])} cy={r2(s.anchor[1])} r={1.7} fill="#b6f36b" />
        </g>
      ))}
    </motion.g>
  );
}

/** HTML labels laid over the SVG, sized from the container width. */
export function CalloutLabels({ specs }: { specs: CalloutSpec[] }) {
  const t = useT("pot");
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {specs.map((s) => {
        const top = `${(s.y / VB_H) * 100}%`;
        const pos =
          s.side === "left"
            ? { right: `${(1 - (END_LEFT - 4) / VB_W) * 100}%`, top }
            : { left: `${((END_RIGHT + 4) / VB_W) * 100}%`, top };
        return (
          <span key={s.id} className={cn(styles.label, s.side === "left" && styles.labelLeft)} style={pos}>
            <span className={styles.labelTitle}>{t(`callout.${s.id}`)}</span>
            <span className={styles.labelDesc}>{t(`callout.${s.id}.desc`)}</span>
          </span>
        );
      })}
    </motion.div>
  );
}
