import { easeCubicInOut, easeCubicOut, easeQuadOut } from "d3-ease";
import { interpolateZoom, type ZoomInterpolator } from "d3-interpolate";
import type { SalesMode } from "@/data/types";
import { getDotField, lodLevel, lowerBound, MAX_LEVEL, type DotField } from "./field";
import { toRef, toScreen, type View } from "./view";

/** Colour class of every land dot, chosen per feature by the React layer. */
export const DOT_CLASS = {
  OUT: 0, // land outside the focused region
  LAND: 1, // neutral land
  REGION: 2, // land of the hovered / focused region
  SOON: 3, // coming_soon market
  POT: 4, // pot_only market
  FULL: 5, // full market
  HOVER: 6,
  SELECTED: 7,
} as const;
const CLASS_COUNT = 8;

/** Which mood the map is drawn in (see docs/DESIGN.md). */
export type MapTone = "day" | "night";

interface Palette {
  /** How light effects are composited: additive glow only works on a dark ground. */
  blend: GlobalCompositeOperation;
  /** Dot colour / opacity per DOT_CLASS. */
  classRgb: string[];
  classAlpha: number[];
  /** Strength of the soft bloom drawn under each class (0 = none). */
  classBloom: number[];
  /** Bloom colour; null = the class's own colour. */
  bloomRgb: string | null;
  /** Market accent: ripples, beams, reveal ring. */
  accent: string;
  /** Lamp light: halos, region glow. */
  warm: string;
  /** "You are here" beacon. */
  visitor: string;
  sparkle: string;
  /** Reticles around the hovered / selected market. */
  ink: string;
  /** Ground colour (outline around the beacon dot). */
  paper: string;
  /** Sweeping highlight over the land (additive, night only). */
  shimmer: boolean;
  /** Dot radius as a share of the grid spacing, and its cap in px. */
  dotRatio: number;
  dotMax: number;
  haloAlpha: number;
  /** Extra factor for the halo of pot-only markets (many sit close together in Europe). */
  potHalo: number;
  beamAlpha: number;
}

const PALETTES: Record<MapTone, Palette> = {
  // Soft sage land on oat paper; markets in leaf green sitting in honey light.
  day: {
    blend: "source-over",
    classRgb: ["150,158,146", "138,150,136", "111,174,134", "111,174,134", "74,140,99", "46,116,70", "36,92,56", "27,67,44"],
    classAlpha: [0.2, 0.5, 0.8, 0.72, 0.95, 1, 1, 1],
    classBloom: [0, 0, 0, 0, 0.14, 0.4, 0.45, 0.55],
    bloomRgb: "244,184,96",
    accent: "46,116,70",
    warm: "244,184,96",
    visitor: "200,104,60",
    sparkle: "244,184,96",
    ink: "37,51,43",
    paper: "251,246,236",
    shimmer: false,
    dotRatio: 0.31,
    dotMax: 2.1,
    haloAlpha: 0.75,
    potHalo: 0.4,
    beamAlpha: 1.9,
  },
  // A lamp-lit room: warm parchment land, sprout-green markets that glow.
  night: {
    blend: "lighter",
    classRgb: ["150,140,120", "172,162,140", "169,213,104", "169,213,104", "195,230,133", "214,239,166", "233,246,204", "246,251,233"],
    classAlpha: [0.12, 0.36, 0.55, 0.5, 0.8, 1, 1, 1],
    classBloom: [0, 0, 0, 0.16, 0.42, 0.85, 0.9, 1],
    bloomRgb: null,
    accent: "195,230,133",
    warm: "255,196,110",
    visitor: "240,162,116",
    sparkle: "255,226,170",
    ink: "246,239,223",
    paper: "26,25,21",
    shimmer: true,
    dotRatio: 0.26,
    dotMax: 1.75,
    haloAlpha: 1,
    potHalo: 1,
    beamAlpha: 1,
  },
};

const TAU = Math.PI * 2;
const TWINKLES = 70;
const BLOOM_SCALE = 0.25;

export interface SceneMarket {
  /** Reference-space anchor. */
  x: number;
  y: number;
  mode: SalesMode;
  state: "idle" | "dim" | "hover" | "selected";
  /** Draw a centre marker (markets too small to show as dots). */
  marker: boolean;
  interactive: boolean;
}

export interface Scene {
  /** DOT_CLASS per feature index. */
  featureClass: Uint8Array;
  /** Market index per feature index (-1 = none). */
  featureMarket: Int16Array;
  markets: SceneMarket[];
  /** Market the beams start from (-1 = none). */
  hub: number;
  arcTargets: number[];
  /** Visitor beacon in reference units. */
  beacon: [number, number] | null;
  /** Soft glow centre for the hovered / focused region (reference units). */
  regionGlow: [number, number] | null;
  /** World stage extras: beams, shimmer. */
  ambient: boolean;
}

export interface EngineOptions {
  reducedMotion: boolean;
  /** Colour mood; defaults to "day". */
  tone?: MapTone;
  /** Called whenever the camera moves (every frame while flying). */
  onView?: (view: View, animating: boolean) => void;
}

interface Flight {
  from: View;
  to: View;
  interp: ZoomInterpolator;
  span: number;
  start: number;
  duration: number;
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return [c, ctx];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Canvas renderer for the dot-matrix world. Land dots are drawn into a cached
 * layer that is rebuilt only when the camera or colours change; beams,
 * halos, beacon, shimmer and sparkles are composed on top every frame.
 */
export class WorldMapEngine {
  private readonly field: DotField = getDotField();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly dots: HTMLCanvasElement;
  private readonly dctx: CanvasRenderingContext2D;
  private readonly bloomA: HTMLCanvasElement;
  private readonly bctxA: CanvasRenderingContext2D;
  private readonly bloomB: HTMLCanvasElement;
  private readonly bctxB: CanvasRenderingContext2D;
  private readonly shimmer: HTMLCanvasElement;
  private readonly sctx: CanvasRenderingContext2D;
  private readonly filterSupported: boolean;
  private readonly pal: Palette;

  private width = 0;
  private height = 0;
  private dpr = 1;
  private minSpacing = 3;
  private view: View = { cx: 500, cy: 200, k: 1, ax: 0, ay: 0 };
  private hasView = false;
  private flight: Flight | null = null;
  private scene: Scene | null = null;
  private dotsDirty = true;
  private raf = 0;
  private active = true;
  private destroyed = false;
  private introStart = -1;
  private lastTime = 0;
  private arcsAlpha = 0;
  private glowAlpha = 0;
  private glowAt: [number, number] | null = null;
  private twinkles = new Float32Array(TWINKLES * 4);
  private twinkleCount = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: EngineOptions,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    [this.dots, this.dctx] = makeCanvas();
    [this.bloomA, this.bctxA] = makeCanvas();
    [this.bloomB, this.bctxB] = makeCanvas();
    [this.shimmer, this.sctx] = makeCanvas();
    this.filterSupported = typeof this.bctxB.filter === "string";
    this.pal = PALETTES[opts.tone ?? "day"];
  }

  // ── public API ───────────────────────────────────────────────────────────
  resize(width: number, height: number, devicePixelRatio: number) {
    if (width <= 0 || height <= 0) return;
    // Cap the backing store at ~6 MP so huge retina screens stay smooth.
    const maxDpr = Math.sqrt(6_000_000 / (width * height));
    const dpr = clamp(Math.min(devicePixelRatio || 1, 2, maxDpr), 1, 2);
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.minSpacing = width < 640 ? 2.8 : 3;
    for (const c of [this.canvas, this.dots]) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
    for (const c of [this.bloomA, this.bloomB]) {
      c.width = Math.ceil(width * BLOOM_SCALE);
      c.height = Math.ceil(height * BLOOM_SCALE);
    }
    this.shimmer.height = Math.round(height * dpr);
    this.dotsDirty = true;
    this.requestFrame();
  }

  setScene(scene: Scene) {
    const prev = this.scene;
    if (!prev || !sameBytes(prev.featureClass, scene.featureClass)) this.dotsDirty = true;
    if (scene.regionGlow) this.glowAt = scene.regionGlow;
    this.scene = scene;
    this.requestFrame();
  }

  getView(): View {
    return this.view;
  }

  isFlying(): boolean {
    return this.flight !== null;
  }

  /** Moves the camera; animated with a smooth zoom unless reduced motion is on. */
  setView(target: View, animate: boolean) {
    if (!animate || !this.hasView || this.opts.reducedMotion || this.width === 0) {
      this.hasView = true;
      this.flight = null;
      this.view = target;
      this.dotsDirty = true;
      this.opts.onView?.(target, false);
      this.requestFrame();
      return;
    }
    const from = this.view;
    const span = Math.max(this.width, 1);
    const interp = interpolateZoom([from.cx, from.cy, span / from.k], [target.cx, target.cy, span / target.k]);
    this.flight = {
      from,
      to: target,
      interp,
      span,
      start: performance.now(),
      duration: clamp(interp.duration * 0.55, 700, 1150),
    };
    this.requestFrame();
  }

  /** Radial "boot" reveal from the hub market. */
  playIntro() {
    if (this.opts.reducedMotion) return;
    this.introStart = performance.now();
    this.requestFrame();
  }

  /** Pause / resume the animation loop (off-screen or hidden tab). */
  setActive(active: boolean) {
    this.active = active;
    if (active) this.requestFrame();
    else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  /** Market index under a screen point, or -1. */
  pick(sx: number, sy: number): number {
    const s = this.scene;
    if (!s) return -1;
    const v = this.view;
    let best = -1;
    let bestD = Infinity;

    s.markets.forEach((m, i) => {
      if (!m.interactive || !m.marker) return;
      const [mx, my] = toScreen(v, m.x, m.y);
      const d = Math.hypot(mx - sx, my - sy);
      if (d < 16 && d < bestD) {
        best = i;
        bestD = d;
      }
    });

    const f = this.field;
    const [rx, ry] = toRef(v, sx, sy);
    const radius = Math.max(8, this.minSpacing * 1.2) / v.k;
    const j0 = Math.max(0, Math.floor((ry - radius) / f.spacing));
    const j1 = Math.min(f.rows - 1, Math.ceil((ry + radius) / f.spacing));
    for (let j = j0; j <= j1; j++) {
      const end = f.rowStart[j + 1];
      for (let idx = lowerBound(f.xs, f.rowStart[j], end, rx - radius); idx < end; idx++) {
        const x = f.xs[idx];
        if (x > rx + radius) break;
        const mi = s.featureMarket[f.fs[idx]];
        if (mi < 0 || !s.markets[mi]?.interactive) continue;
        const d = Math.hypot(x - rx, f.ys[idx] - ry) * v.k;
        if (d < bestD) {
          best = mi;
          bestD = d;
        }
      }
    }
    return best;
  }

  destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ── loop ─────────────────────────────────────────────────────────────────
  private requestFrame() {
    if (this.destroyed || this.raf) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (this.destroyed || this.width === 0 || !this.hasView) return;
    const dt = this.lastTime ? clamp((now - this.lastTime) / 1000, 0, 0.1) : 1 / 60;
    this.lastTime = now;

    if (this.flight) {
      const fl = this.flight;
      const p = clamp((now - fl.start) / fl.duration, 0, 1);
      const e = easeCubicInOut(p);
      const [cx, cy, w] = fl.interp(e);
      this.view =
        p >= 1
          ? fl.to
          : { cx, cy, k: fl.span / w, ax: lerp(fl.from.ax, fl.to.ax, e), ay: lerp(fl.from.ay, fl.to.ay, e) };
      if (p >= 1) this.flight = null;
      this.dotsDirty = true;
      this.opts.onView?.(this.view, this.flight !== null);
    }

    const s = this.scene;
    const reduced = this.opts.reducedMotion;
    const arcsTarget = s?.ambient ? 1 : 0;
    const glowTarget = s?.regionGlow ? 1 : 0;
    const rate = reduced ? 1 : clamp(dt * 4, 0, 1);
    this.arcsAlpha = Math.abs(arcsTarget - this.arcsAlpha) < 0.01 ? arcsTarget : lerp(this.arcsAlpha, arcsTarget, rate);
    this.glowAlpha = Math.abs(glowTarget - this.glowAlpha) < 0.01 ? glowTarget : lerp(this.glowAlpha, glowTarget, rate);

    if (this.dotsDirty) this.renderDots();
    this.compose(reduced ? 0 : now / 1000, now);

    const tweening = this.arcsAlpha !== arcsTarget || this.glowAlpha !== glowTarget;
    const introRunning = this.introStart >= 0 && now - this.introStart < 3200;
    if (this.active && (!reduced || this.flight || tweening || introRunning)) this.requestFrame();
  };

  // ── dots layer ───────────────────────────────────────────────────────────
  private renderDots() {
    this.dotsDirty = false;
    const s = this.scene;
    const ctx = this.dctx;
    const { width: W, height: H, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const bctx = this.bctxA;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, this.bloomA.width, this.bloomA.height);
    this.twinkleCount = 0;
    if (!s) return;

    const f = this.field;
    const v = this.view;
    const sp = f.spacing * v.k; // screen px between fine dots
    const minSp = this.minSpacing;
    // Pick the LOD whose grid spacing on screen is in [minSp, 2·minSp). While flying, the
    // next finer level fades in over a narrow window so zooming never "pops"; at rest the
    // fade snaps so the grid is always a single crisp density.
    const level = clamp(Math.ceil(Math.log2(minSp / sp) - 1e-6), 0, MAX_LEVEL);
    const gridSp = sp * 2 ** level;
    const rawFade = level > 0 ? clamp((gridSp / 2 - minSp * 0.85) / (minSp * 0.15), 0, 1) : 0;
    const fadeT = this.flight ? rawFade : rawFade > 0.5 ? 1 : 0;
    const minLevel = fadeT > 0.02 ? level - 1 : level;
    const effSp = gridSp * (1 - fadeT / 2);
    const pal = this.pal;
    const r = clamp(effSp * pal.dotRatio, 0.75, pal.dotMax);
    const useArc = r >= 1;
    const br = Math.max(0.8, r * 1.5 * BLOOM_SCALE);
    // Glow is strongest on the world view and fades as big countries fill the screen.
    const zoomRatio = (v.k * f.width) / W;
    const bloomScale = clamp(1.25 / zoomRatio, 0.3, 1) * clamp(effSp / 5, 0.5, 1);

    const paths: (Path2D | null)[] = new Array(CLASS_COUNT * 2).fill(null);
    const bloomPaths: (Path2D | null)[] = new Array(CLASS_COUNT).fill(null);
    const fc = s.featureClass;
    const [rx0, ry0] = toRef(v, -r * 2, -r * 2);
    const [rx1, ry1] = toRef(v, W + r * 2, H + r * 2);
    const j0 = Math.max(0, Math.floor(ry0 / f.spacing));
    const j1 = Math.min(f.rows - 1, Math.ceil(ry1 / f.spacing));
    let seen = 0;

    for (let j = j0; j <= j1; j++) {
      if (lodLevel(j) < minLevel) continue;
      const end = f.rowStart[j + 1];
      let idx = f.rowStart[j];
      if (idx === end) continue;
      idx = lowerBound(f.xs, idx, end, rx0);
      const sy = (j * f.spacing - v.cy) * v.k + v.ay;
      for (; idx < end; idx++) {
        const x = f.xs[idx];
        if (x > rx1) break;
        const l = f.lv[idx];
        if (l < minLevel) continue;
        const cls = fc[f.fs[idx]];
        const tier = l >= level ? 0 : 1;
        const sx = (x - v.cx) * v.k + v.ax;
        const key = cls * 2 + tier;
        const p = paths[key] ?? (paths[key] = new Path2D());
        if (useArc) {
          p.moveTo(sx + r, sy);
          p.arc(sx, sy, r, 0, TAU);
        } else {
          p.rect(sx - r, sy - r, r * 2, r * 2);
        }
        if (pal.classBloom[cls] > 0) {
          const bp = bloomPaths[cls] ?? (bloomPaths[cls] = new Path2D());
          bp.rect(sx * BLOOM_SCALE - br, sy * BLOOM_SCALE - br, br * 2, br * 2);
        } else if (tier === 0 && cls <= DOT_CLASS.REGION && cls >= DOT_CLASS.LAND) {
          // reservoir-sample a few neutral dots for the sparkle effect
          seen++;
          let slot = -1;
          if (this.twinkleCount < TWINKLES) slot = this.twinkleCount++;
          else if (Math.random() * seen < TWINKLES) slot = Math.floor(Math.random() * TWINKLES);
          if (slot >= 0) {
            const o = slot * 4;
            this.twinkles[o] = sx;
            this.twinkles[o + 1] = sy;
            this.twinkles[o + 2] = Math.random() * TAU;
            this.twinkles[o + 3] = 0.25 + Math.random() * 0.6;
          }
        }
      }
    }

    // Bloom first: glow-class dots on a quarter-resolution canvas, blurred and scaled
    // up *beneath* the crisp dots, so dots keep their colour and the glow fills the gaps.
    let anyBloom = false;
    for (let cls = 0; cls < CLASS_COUNT; cls++) {
      const bp = bloomPaths[cls];
      if (!bp) continue;
      anyBloom = true;
      bctx.fillStyle = `rgba(${pal.bloomRgb ?? pal.classRgb[cls]},${pal.classBloom[cls] * bloomScale})`;
      bctx.fill(bp);
    }
    if (anyBloom) {
      let src: HTMLCanvasElement = this.bloomA;
      if (this.filterSupported) {
        const b = this.bctxB;
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.clearRect(0, 0, this.bloomB.width, this.bloomB.height);
        b.filter = "blur(1.6px)";
        b.drawImage(this.bloomA, 0, 0);
        b.filter = "none";
        src = this.bloomB;
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, 0, 0, src.width / BLOOM_SCALE, src.height / BLOOM_SCALE);
      ctx.restore();
    }

    for (let cls = 0; cls < CLASS_COUNT; cls++) {
      for (let tier = 0; tier < 2; tier++) {
        const p = paths[cls * 2 + tier];
        if (!p) continue;
        const a = pal.classAlpha[cls] * (tier ? fadeT : 1);
        if (a <= 0.003) continue;
        ctx.fillStyle = `rgba(${pal.classRgb[cls]},${a})`;
        ctx.fill(p);
      }
    }
  }

  // ── per-frame composition ─────────────────────────────────────────────────
  private compose(t: number, now: number) {
    const ctx = this.ctx;
    const { width: W, height: H, dpr } = this;
    const s = this.scene;
    const v = this.view;
    const pal = this.pal;
    const LEAF = pal.accent;
    const WARM = pal.warm;
    const YOU = pal.visitor;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!s) return;

    // Halo size: grows gently with zoom, shrinks on small screens.
    const zf = clamp(Math.sqrt((v.k * this.field.width) / W), 1, 2.2) * clamp(W / 1100, 0.55, 1);
    const hub = s.hub >= 0 ? s.markets[s.hub] : null;
    const [hx, hy] = hub ? toScreen(v, hub.x, hub.y) : [W / 2, H / 2];

    // Intro reveal radius (seconds since start).
    const introT = this.introStart >= 0 ? (now - this.introStart) / 1000 : Infinity;
    const revealP = clamp(introT / 1.7, 0, 1);
    const maxR = Math.hypot(Math.max(hx, W - hx), Math.max(hy, H - hy));
    const revealR = easeCubicOut(revealP) * maxR;

    if (revealP < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(0.1, revealR), 0, TAU);
      ctx.clip();
    }
    ctx.drawImage(this.dots, 0, 0, W, H);
    if (pal.shimmer && s.ambient && !this.opts.reducedMotion) this.drawShimmer(t);
    if (revealP < 1) {
      ctx.restore();
      const ring = ctx.createRadialGradient(hx, hy, Math.max(0, revealR - 60), hx, hy, revealR + 2);
      ring.addColorStop(0, `rgba(${LEAF},0)`);
      ring.addColorStop(0.85, `rgba(${LEAF},${0.12 * (1 - revealP)})`);
      ring.addColorStop(1, `rgba(${LEAF},${0.55 * (1 - revealP)})`);
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(hx, hy, revealR + 2, 0, TAU);
      ctx.fill();
    }

    ctx.globalCompositeOperation = pal.blend;

    // Sparkles on neutral land.
    if (!this.opts.reducedMotion && revealP >= 1) {
      for (let n = 0; n < this.twinkleCount; n++) {
        const o = n * 4;
        const a = Math.pow(Math.max(0, Math.sin(t * this.twinkles[o + 3] + this.twinkles[o + 2])), 14);
        if (a < 0.02) continue;
        ctx.fillStyle = `rgba(${pal.sparkle},${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(this.twinkles[o], this.twinkles[o + 1], 1.5, 0, TAU);
        ctx.fill();
      }
    }

    // Region glow.
    if (this.glowAlpha > 0.01 && this.glowAt) {
      const [gx, gy] = toScreen(v, this.glowAt[0], this.glowAt[1]);
      const gr = Math.min(W, H) * 0.42;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, `rgba(${WARM},${0.16 * pal.haloAlpha * this.glowAlpha})`);
      g.addColorStop(1, `rgba(${WARM},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }

    // Halos + sonar ripples.
    s.markets.forEach((m, i) => {
      const highlighted = m.state === "hover" || m.state === "selected";
      if (m.mode === "coming_soon" && !highlighted) return;
      const [mx, my] = toScreen(v, m.x, m.y);
      if (mx < -120 || my < -120 || mx > W + 120 || my > H + 120) return;
      const dim = m.state === "dim" ? 0.3 : 1;
      const reveal = revealP >= 1 ? 1 : clamp((revealR - Math.hypot(mx - hx, my - hy)) / 80, 0, 1);
      if (reveal <= 0) return;
      const full = m.mode === "full";
      const radius = (full ? 34 : 22) * zf * (highlighted ? 1.25 : 1);
      const alpha =
        (full ? 0.3 + 0.1 * Math.sin(t * 2 + i) : (0.17 + 0.05 * Math.sin(t * 1.3 + i)) * (highlighted ? 1 : pal.potHalo)) *
        dim *
        reveal;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, radius);
      g.addColorStop(0, `rgba(${WARM},${Math.min(1, alpha * pal.haloAlpha)})`);
      g.addColorStop(1, `rgba(${WARM},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(mx - radius, my - radius, radius * 2, radius * 2);

      if (full && !this.opts.reducedMotion) {
        for (let wave = 0; wave < 2; wave++) {
          const p = ((t + i * 0.7 + wave * 1.4) % 2.8) / 2.8;
          const rr = 4 + 42 * zf * easeQuadOut(p);
          ctx.strokeStyle = `rgba(${LEAF},${(1 - p) * 0.5 * dim * reveal})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(mx, my, rr, 0, TAU);
          ctx.stroke();
        }
      }
    });

    // Beams from the hub.
    if (hub && this.arcsAlpha > 0.01) {
      const grow = this.introStart >= 0 ? clamp((introT - 0.6) / 1.3, 0, 1) : 1;
      const targets: { x: number; y: number; color: string; strong: boolean }[] = s.arcTargets.map((i) => {
        const m = s.markets[i];
        const [x, y] = toScreen(v, m.x, m.y);
        return { x, y, color: LEAF, strong: m.mode !== "coming_soon" };
      });
      if (s.beacon) {
        const [bx, by] = toScreen(v, s.beacon[0], s.beacon[1]);
        if (Math.hypot(bx - hx, by - hy) > 24) targets.push({ x: bx, y: by, color: YOU, strong: true });
      }
      targets.forEach((tg, i) => this.drawBeam(hx, hy, tg.x, tg.y, tg.color, tg.strong, i, t, grow));
    }

    // Centre markers for small markets.
    s.markets.forEach((m) => {
      if (!m.marker) return;
      const [mx, my] = toScreen(v, m.x, m.y);
      if (mx < -20 || my < -20 || mx > W + 20 || my > H + 20) return;
      const cls =
        m.state === "selected"
          ? DOT_CLASS.SELECTED
          : m.state === "hover"
            ? DOT_CLASS.HOVER
            : m.mode === "full"
              ? DOT_CLASS.FULL
              : m.mode === "pot_only"
                ? DOT_CLASS.POT
                : DOT_CLASS.SOON;
      const dim = m.state === "dim" ? 0.35 : 1;
      ctx.fillStyle = `rgba(${pal.classRgb[cls]},${pal.classAlpha[cls] * dim})`;
      ctx.beginPath();
      ctx.arc(mx, my, 2.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(${pal.classRgb[cls]},${0.45 * dim})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, 5.5, 0, TAU);
      ctx.stroke();
    });

    // Visitor beacon.
    if (s.beacon) {
      const [bx, by] = toScreen(v, s.beacon[0], s.beacon[1]);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 22);
      g.addColorStop(0, `rgba(${YOU},0.45)`);
      g.addColorStop(1, `rgba(${YOU},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(bx - 22, by - 22, 44, 44);
      if (!this.opts.reducedMotion) {
        for (let wave = 0; wave < 2; wave++) {
          const p = ((t + wave) % 2) / 2;
          ctx.strokeStyle = `rgba(${YOU},${(1 - p) * 0.7})`;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(bx, by, 4 + 22 * easeQuadOut(p), 0, TAU);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgb(${YOU})`;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(${pal.paper},0.95)`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.globalCompositeOperation = pal.blend;
    }

    // Focus reticles.
    s.markets.forEach((m) => {
      if (m.state !== "selected" && m.state !== "hover") return;
      const [mx, my] = toScreen(v, m.x, m.y);
      const sel = m.state === "selected";
      const rr = sel ? 17 : 11;
      ctx.strokeStyle = `rgba(${pal.ink},${sel ? 0.85 : 0.55})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash(sel ? [4, 4] : [2, 3]);
      ctx.lineDashOffset = -t * 10;
      ctx.beginPath();
      ctx.arc(mx, my, rr, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      if (sel) {
        ctx.beginPath();
        for (let q = 0; q < 4; q++) {
          const ang = (q * Math.PI) / 2 + t * 0.4;
          ctx.moveTo(mx + Math.cos(ang) * (rr + 3), my + Math.sin(ang) * (rr + 3));
          ctx.lineTo(mx + Math.cos(ang) * (rr + 8), my + Math.sin(ang) * (rr + 8));
        }
        ctx.stroke();
      }
    });

    ctx.globalCompositeOperation = "source-over";
  }

  private drawBeam(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    strong: boolean,
    index: number,
    t: number,
    grow: number,
  ) {
    const ctx = this.ctx;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 8 || grow <= 0) return;
    // Control point lifted "north" of the chord.
    let nx = -dy / dist;
    let ny = dx / dist;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const lift = Math.min(dist * 0.32, 220);
    const cx = (x0 + x1) / 2 + nx * lift;
    const cy = (y0 + y1) / 2 + ny * lift;
    const at = (u: number): [number, number] => {
      const a = (1 - u) * (1 - u);
      const b = 2 * (1 - u) * u;
      const c = u * u;
      return [a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1];
    };

    const alpha = Math.min(1, this.arcsAlpha * this.pal.beamAlpha);
    const g = easeCubicInOut(clamp(grow - index * 0.05, 0, 1));
    if (g <= 0) return;
    ctx.strokeStyle = `rgba(${color},${(strong ? 0.2 : 0.09) * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const steps = 32;
    for (let q = 1; q <= steps; q++) {
      const [px, py] = at((q / steps) * g);
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (this.opts.reducedMotion || g < 1) {
      if (g < 1) {
        const [px, py] = at(g);
        ctx.fillStyle = `rgba(${color},${0.9 * alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, TAU);
        ctx.fill();
      }
      return;
    }
    // Light pulse travelling along the beam.
    const period = 3.4 + (index % 3) * 0.6;
    const u = ((t / period + index * 0.37) % 1) * 1.15;
    if (u > 1) return;
    for (let q = 0; q < 14; q++) {
      const uu = u - q * 0.012;
      if (uu < 0) break;
      const [px, py] = at(uu);
      const fall = 1 - q / 14;
      ctx.fillStyle = `rgba(${color},${fall * fall * 0.85 * alpha * (strong ? 1 : 0.5)})`;
      ctx.beginPath();
      ctx.arc(px, py, 0.6 + 1.5 * fall, 0, TAU);
      ctx.fill();
    }
  }

  private drawShimmer(t: number) {
    const { width: W, height: H, dpr } = this;
    const period = 10;
    const band = Math.min(220, W * 0.22);
    const bx = ((t % period) / period) * (W + band * 4) - band * 2;
    const x0 = Math.max(0, Math.floor(bx - band));
    const x1 = Math.min(W, Math.ceil(bx + band));
    if (x1 - x0 < 2) return;
    const sw = Math.round((x1 - x0) * dpr);
    const sh = Math.round(H * dpr);
    if (this.shimmer.width < sw) this.shimmer.width = Math.round(band * 2 * dpr) + 4;
    const s = this.sctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = "copy";
    s.drawImage(this.dots, x0 * dpr, 0, sw, sh, 0, 0, sw, sh);
    s.globalCompositeOperation = "source-in";
    const g = s.createLinearGradient((bx - band - x0) * dpr, 0, (bx + band - x0) * dpr, 0);
    g.addColorStop(0, "rgba(201,247,156,0)");
    g.addColorStop(0.5, "rgba(214,255,170,0.85)");
    g.addColorStop(1, "rgba(201,247,156,0)");
    s.fillStyle = g;
    s.fillRect(0, 0, sw, sh);
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.45 * this.arcsAlpha;
    ctx.drawImage(this.shimmer, 0, 0, sw, sh, x0, 0, x1 - x0, H);
    ctx.restore();
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
