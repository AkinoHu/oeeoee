"use client";

import { ArrowDown, ChevronRight, Globe2 } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import type { RegionId, SalesMode } from "@/data/types";
import { useLocale, useT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { refineGuess, type GeoGuess, type GeoSource } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { ABSORBED_FEATURE_IDS, absorbedNear, absorbingMarket } from "./compliance";
import { getDotField } from "./engine/field";
import { DOT_CLASS, WorldMapEngine, type Scene } from "./engine/renderer";
import {
  computeLayout,
  countryView,
  lonLatToRef,
  regionView,
  toScreen,
  worldView,
  type MapLayout,
  type View,
} from "./engine/view";
import { CompanionGreeter, type LocateState, type VisitorView } from "./CompanionGreeter";
import { distanceKm, featureIdAt, refineForSmallMarkets, requestPosition } from "./locate";
import { MapPanel } from "./MapPanel";
import { RegionChips, type RegionStat } from "./RegionChips";
import { StatusDot } from "./StatusDot";
import type { MapMarket, MapRegion, Stage } from "./types";

interface WorldExplorerProps {
  regions: MapRegion[];
  markets: MapMarket[];
  /** Server-side guess from request headers (src/lib/geo.ts). */
  guess: GeoGuess | null;
}

interface Visitor {
  /** ISO alpha-2, or null when only the position is known. */
  country: string | null;
  source: GeoSource;
  /** [lon, lat] from the Geolocation API. */
  coords?: [number, number];
}

const MODE_CLASS: Record<SalesMode, number> = {
  full: DOT_CLASS.FULL,
  pot_only: DOT_CLASS.POT,
  coming_soon: DOT_CLASS.SOON,
};
const MODE_RANK: Record<SalesMode, number> = { full: 0, pot_only: 1, coming_soon: 2 };
/** Markets whose land covers fewer fine dots than this also get a centre marker. */
const SMALL_MARKET_DOTS = 40;
/** Hero buttons: size "md" on phones, "lg" from the lg breakpoint. */
const HERO_BUTTON_LG = "lg:h-13 lg:px-7 lg:text-base";

const noopSubscribe = () => () => {};

function useTimeZone(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        return null;
      }
    },
    () => null,
  );
}

function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function countryDisplayName(code: string, locale: Locale): string | null {
  try {
    const name = new Intl.DisplayNames([locale], { type: "region" }).of(code);
    return name && name !== code ? name : null;
  } catch {
    return null;
  }
}

/**
 * The landing hero: a cinematic dot-matrix world map.
 * Stage 1 world → pick a region → Stage 2 region panel → pick a country →
 * Stage 3 country card with a CTA to /c/<code>.
 */
export function WorldExplorer({ regions, markets, guess }: WorldExplorerProps) {
  const t = useT("landing");
  const locale = useLocale();
  const mounted = useMounted();
  const timeZone = useTimeZone();
  const field = getDotField();

  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const engineRef = useRef<WorldMapEngine | null>(null);
  const visibleRef = useRef(true);
  const chipEls = useRef(new Map<RegionId, HTMLButtonElement>());
  const focusNext = useRef<"panel" | RegionId | null>(null);
  const lastLayout = useRef<MapLayout | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  /** Measured height of the hero copy; the world map starts below it. */
  const [heroHeight, setHeroHeight] = useState(0);
  const layout = useMemo<MapLayout | null>(
    () => (size ? computeLayout(size.width, size.height, heroHeight) : null),
    [size, heroHeight],
  );
  const [stage, setStage] = useState<Stage>({ level: "world" });
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null);
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const [deviceVisitor, setDeviceVisitor] = useState<Visitor | null>(null);
  const [locState, setLocState] = useState<LocateState>("idle");
  const [pulseChips, setPulseChips] = useState(0);

  // ── Catalog ↔ dot-field lookups ─────────────────────────────────────────
  const model = useMemo(() => {
    const featureMarket = new Int16Array(field.features.length).fill(-1);
    const marketDots = markets.map(() => 0);
    markets.forEach((m, i) => {
      for (const id of m.featureIds) {
        const f = field.byId.get(id);
        if (f === undefined) continue;
        featureMarket[f] = i;
        marketDots[i] += field.features[f].n;
      }
    });
    const featureRegion = field.features.map((f, i) =>
      featureMarket[i] >= 0 ? markets[featureMarket[i]].region : f.region,
    );
    // Alpha-2 code of each absorbed territory → the market it belongs to (TW/HK/MO → CN).
    const absorbedA2 = new Map<string, string>();
    for (const id of ABSORBED_FEATURE_IDS) {
      const f = field.byId.get(id);
      const owner = absorbingMarket(id);
      if (f !== undefined && field.features[f].a2 && owner) absorbedA2.set(field.features[f].a2, owner);
    }
    const regionMarkets = new Map<RegionId, MapMarket[]>();
    const regionStats = new Map<RegionId, RegionStat>();
    for (const r of regions) {
      const list = markets.filter((m) => m.region === r.id);
      regionMarkets.set(r.id, list);
      const best = list.reduce<SalesMode | null>(
        (acc, m) => (acc === null || MODE_RANK[m.salesMode] < MODE_RANK[acc] ? m.salesMode : acc),
        null,
      );
      regionStats.set(r.id, { count: list.length, best });
    }
    return {
      featureMarket,
      marketDots,
      featureRegion,
      absorbedA2,
      regionMarkets,
      regionStats,
      marketRef: markets.map((m) => lonLatToRef(m.center)),
      byCode: new Map(markets.map((m, i) => [m.code, i])),
      regionById: new Map(regions.map((r) => [r.id, r])),
      hub: markets.findIndex((m) => m.salesMode === "full"),
    };
  }, [field, markets, regions]);

  // ── Visitor location ────────────────────────────────────────────────────
  const visitor: Visitor | null = useMemo(() => {
    if (deviceVisitor) return deviceVisitor;
    const refined = refineGuess(guess, timeZone);
    return refined ? { country: refined.country, source: refined.source } : null;
  }, [deviceVisitor, guess, timeZone]);

  const visitorInfo = useMemo(() => {
    if (!visitor) return null;
    const code = visitor.country ? (model.absorbedA2.get(visitor.country) ?? visitor.country) : null;
    if (!code && !visitor.coords) return null;
    const mi = code ? model.byCode.get(code) : undefined;
    const market = mi !== undefined ? markets[mi] : null;
    const fi = code ? field.byA2.get(code) : undefined;
    const regionId = (market?.region ?? (fi !== undefined ? model.featureRegion[fi] : "")) as RegionId | "";
    const region = regionId ? (model.regionById.get(regionId) ?? null) : null;
    const point: [number, number] | null = visitor.coords
      ? lonLatToRef(visitor.coords)
      : mi !== undefined
        ? model.marketRef[mi]
        : fi !== undefined
          ? field.features[fi].c
          : null;
    const name = market?.name ?? (code && mounted ? countryDisplayName(code, locale) : null);
    return { code, market, region, point, name };
  }, [visitor, model, markets, field, mounted, locale]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const navigate = useCallback((next: Stage, focus: "panel" | RegionId | null = "panel") => {
    focusNext.current = focus;
    setHoverCode(null);
    setHoverRegion(null);
    setStage(next);
  }, []);

  const goRegion = useCallback((id: RegionId) => navigate({ level: "region", region: id }), [navigate]);
  const goCountry = useCallback(
    (code: string) => {
      const i = model.byCode.get(code);
      if (i === undefined) return;
      navigate({ level: "country", region: markets[i].region, code });
    },
    [markets, model, navigate],
  );
  const goBack = useCallback(() => {
    setStage((s) => {
      focusNext.current = s.level === "region" ? s.region : s.level === "country" ? "panel" : null;
      if (s.level === "country") return { level: "region", region: s.region };
      return { level: "world" };
    });
    setHoverCode(null);
  }, []);
  const goWorld = useCallback(() => {
    setStage((s) => {
      focusNext.current = s.level === "world" ? null : s.region;
      return { level: "world" };
    });
    setHoverCode(null);
  }, []);

  const stageRef = useRef(stage);
  const goBackRef = useRef(goBack);
  useEffect(() => {
    stageRef.current = stage;
    goBackRef.current = goBack;
  });

  // Move focus after a user-driven stage change (panel heading or the region chip we came from).
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (!target) return;
    const id = requestAnimationFrame(() => {
      if (target === "panel") headingRef.current?.focus({ preventScroll: true });
      else chipEls.current.get(target)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [stage]);

  // Esc goes back one level while the map is on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !visibleRef.current) return;
      if (stageRef.current.level === "world") return;
      const active = document.activeElement;
      if (active && active !== document.body && !sectionRef.current?.contains(active)) return;
      e.preventDefault();
      goBackRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Overlay positioning (pins, tooltip, visitor tag) ────────────────────
  const placeOverlays = useCallback((view: View, settled: boolean) => {
    const root = overlayRef.current;
    if (!root) return;
    const nodes = root.querySelectorAll<HTMLElement>("[data-rx]");
    nodes.forEach((el) => {
      const [sx, sy] = toScreen(view, Number(el.dataset.rx), Number(el.dataset.ry));
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    });
    if (!settled) return;
    // Hide labels that would collide with a higher-priority one (forced = hovered /
    // selected first, then DOM order) or that fall outside the visible map (behind the
    // panel / off screen).
    const bounds = root.getBoundingClientRect();
    const maxX = bounds.left + Number(root.dataset.maxX || bounds.width);
    const maxY = bounds.top + Number(root.dataset.maxY || bounds.height);
    const placed: DOMRect[] = [];
    const labels = [...root.querySelectorAll<HTMLElement>("[data-label]")];
    labels.sort((a, b) => Number(b.dataset.force === "true") - Number(a.dataset.force === "true"));
    labels.forEach((label) => {
      const forced = label.dataset.force === "true";
      const r = label.getBoundingClientRect();
      const outside = r.left < bounds.left + 4 || r.right > maxX - 4 || r.top < bounds.top + 56 || r.bottom > maxY - 4;
      const hit = placed.some((p) => r.left < p.right + 4 && r.right > p.left - 4 && r.top < p.bottom + 2 && r.bottom > p.top - 2);
      const show = !outside && (forced || !hit);
      label.style.opacity = show ? "" : "0";
      if (show) placed.push(r);
    });
  }, []);
  const placeOverlaysRef = useRef(placeOverlays);

  // ── Engine lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let engine: WorldMapEngine;
    try {
      engine = new WorldMapEngine(canvas, {
        tone: "day",
        reducedMotion: reduced,
        onView: (v, animating) => placeOverlaysRef.current(v, !animating),
      });
    } catch {
      return; // no 2D canvas: the overlays (chips, panel) still work
    }
    engineRef.current = engine;

    let size = { width: 0, height: 0 };
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      size = { width, height };
      engine.resize(width, height, window.devicePixelRatio);
      setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    });
    ro.observe(host);

    // devicePixelRatio can change without a resize (window dragged to another screen,
    // OS scaling): re-rasterize at the new density instead of staying blurry.
    let dprQuery: MediaQueryList | null = null;
    const onDprChange = () => {
      engine.resize(size.width, size.height, window.devicePixelRatio);
      watchDpr();
    };
    const watchDpr = () => {
      dprQuery?.removeEventListener("change", onDprChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", onDprChange);
    };
    watchDpr();

    const sync = () => engine.setActive(visibleRef.current && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      sync();
    });
    io.observe(host);
    document.addEventListener("visibilitychange", sync);
    engine.playIntro();

    return () => {
      ro.disconnect();
      dprQuery?.removeEventListener("change", onDprChange);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      engine.destroy();
      engineRef.current = null;
      lastLayout.current = null;
    };
  }, []);

  // The hero copy differs in height per language and screen: measure it so the world
  // map always starts below the text instead of under it.
  const heroVisible = stage.level === "world";
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !heroVisible) return;
    const ro = new ResizeObserver(() => setHeroHeight(Math.round(el.offsetHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [heroVisible]);

  // Camera follows the stage; layout changes (resize) jump instead of flying.
  const targetView = useMemo(() => {
    if (!layout) return null;
    if (stage.level === "world") return worldView(layout);
    const region = model.regionById.get(stage.region);
    if (!region) return worldView(layout);
    const rv = regionView(layout, region.center, region.zoom);
    if (stage.level === "region") return rv;
    const i = model.byCode.get(stage.code);
    return i === undefined ? rv : countryView(layout, markets[i].center, model.marketDots[i], rv);
  }, [layout, stage, model, markets]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !targetView) return;
    const animate = lastLayout.current === layout;
    lastLayout.current = layout;
    engine.setView(targetView, animate);
  }, [targetView, layout]);

  // Scene: colours, halos, beams, beacon.
  const focusRegion = stage.level === "world" ? null : stage.region;
  const selectedCode = stage.level === "country" ? stage.code : null;
  const hoverMarketRegion = hoverCode ? markets[model.byCode.get(hoverCode) ?? -1]?.region : undefined;
  const glowRegion = focusRegion ?? hoverRegion ?? hoverMarketRegion ?? null;

  const scene = useMemo<Scene>(() => {
    const featureClass = new Uint8Array(field.features.length);
    for (let f = 0; f < featureClass.length; f++) {
      const mi = model.featureMarket[f];
      const region = model.featureRegion[f];
      if (mi >= 0) {
        const m = markets[mi];
        if (m.code === selectedCode) featureClass[f] = DOT_CLASS.SELECTED;
        else if (m.code === hoverCode) featureClass[f] = DOT_CLASS.HOVER;
        else if ((focusRegion ?? hoverRegion) && m.region !== (focusRegion ?? hoverRegion)) featureClass[f] = DOT_CLASS.SOON;
        else featureClass[f] = MODE_CLASS[m.salesMode];
      } else if (focusRegion) {
        featureClass[f] = region === focusRegion ? DOT_CLASS.LAND : DOT_CLASS.OUT;
      } else {
        featureClass[f] = glowRegion && region === glowRegion ? DOT_CLASS.REGION : DOT_CLASS.LAND;
      }
    }
    const sceneMarkets = markets.map((m, i) => {
      const [x, y] = model.marketRef[i];
      const state =
        m.code === selectedCode
          ? ("selected" as const)
          : m.code === hoverCode
            ? ("hover" as const)
            : (focusRegion && m.region !== focusRegion) || (!focusRegion && hoverRegion && m.region !== hoverRegion)
              ? ("dim" as const)
              : ("idle" as const);
      return { x, y, mode: m.salesMode, state, marker: model.marketDots[i] < SMALL_MARKET_DOTS, interactive: true };
    });
    const regionCenter = !focusRegion && hoverRegion ? model.regionById.get(hoverRegion)?.center : undefined;
    return {
      featureClass,
      featureMarket: model.featureMarket,
      markets: sceneMarkets,
      hub: model.hub,
      arcTargets: markets
        .map((m, i) => i)
        .filter((i) => i !== model.hub)
        .sort((a, b) => MODE_RANK[markets[a].salesMode] - MODE_RANK[markets[b].salesMode])
        .slice(0, 16),
      beacon: visitorInfo?.point ?? null,
      regionGlow: regionCenter ? lonLatToRef(regionCenter) : null,
      ambient: stage.level === "world",
    };
  }, [field, model, markets, selectedCode, hoverCode, focusRegion, glowRegion, hoverRegion, visitorInfo, stage.level]);

  useEffect(() => {
    engineRef.current?.setScene(scene);
  }, [scene]);

  // Re-place overlays after every render (new pins mount with the current camera).
  useLayoutEffect(() => {
    const engine = engineRef.current;
    if (engine) placeOverlays(engine.getView(), !engine.isFlying());
  });

  // ── Pointer interaction on the canvas ───────────────────────────────────
  const pickAt = (e: ReactPointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    const host = hostRef.current;
    if (!engine || !host) return -1;
    const rect = host.getBoundingClientRect();
    return engine.pick(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const i = pickAt(e);
    const code = i >= 0 ? markets[i].code : null;
    if (code !== hoverCode) setHoverCode(code);
    e.currentTarget.style.cursor = code ? "pointer" : "";
  };

  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const i = pickAt(e);
    if (i < 0) return;
    const m = markets[i];
    if (stage.level === "world") goRegion(m.region);
    else goCountry(m.code);
  };

  // ── Geolocation (only on click) ─────────────────────────────────────────
  const locate = async () => {
    setLocState("locating");
    try {
      const coords = await requestPosition();
      const fid = await refineForSmallMarkets(
        coords,
        await featureIdAt(coords),
        markets.filter((_, i) => model.marketDots[i] < SMALL_MARKET_DOTS),
      );
      let country: string | null = null;
      const owner = fid ? absorbingMarket(fid) : null;
      if (owner) {
        country = owner;
      } else if (fid) {
        const market = markets.find((m) => m.isoNumeric === fid);
        const fi = field.byId.get(fid);
        country = market?.code ?? (fi !== undefined ? field.features[fi].a2 || null : null);
      } else if (!fid && absorbedNear(coords)) {
        // A grouped territory too small for the atlas (Macao is not in it at all).
        country = absorbedNear(coords);
      } else if (!fid) {
        // At sea, or on a coast too fine for the atlas: nearest market centre.
        let best: MapMarket | null = null;
        let bestKm = 150;
        for (const m of markets) {
          const d = distanceKm(coords, m.center);
          if (d < bestKm) {
            best = m;
            bestKm = d;
          }
        }
        country = best?.code ?? null;
      }
      setDeviceVisitor({ country, source: "device", coords });
      setLocState("idle");
      const mi = country ? model.byCode.get(country) : undefined;
      if (mi !== undefined) {
        navigate({ level: "country", region: markets[mi].region, code: markets[mi].code });
      } else if (country) {
        const fi = field.byA2.get(country);
        const region = fi !== undefined ? (model.featureRegion[fi] as RegionId | "") : "";
        if (region && model.regionById.has(region)) navigate({ level: "region", region });
      }
    } catch (err) {
      setLocState(err instanceof Error && err.message === "denied" ? "denied" : "unavailable");
    }
  };

  const exploreVisitor = () => {
    if (!visitorInfo) return;
    if (visitorInfo.market) goCountry(visitorInfo.market.code);
    else if (visitorInfo.region) goRegion(visitorInfo.region.id);
  };

  // "Choose your region": replay the chip pulse (remounts the chips), then focus the first one.
  const focusChips = () => setPulseChips((n) => n + 1);
  useEffect(() => {
    if (!pulseChips) return;
    chipEls.current.get(regions[0]?.id)?.focus({ preventScroll: true });
  }, [pulseChips, regions]);

  const chipRef = useCallback(
    (id: RegionId) => (el: HTMLButtonElement | null) => {
      if (el) chipEls.current.set(id, el);
      else chipEls.current.delete(id);
    },
    [],
  );

  // ── Derived UI data ─────────────────────────────────────────────────────
  const desktop = layout?.desktop ?? true;
  const activeRegion = focusRegion ? model.regionById.get(focusRegion) : undefined;
  const regionMarkets = focusRegion ? (model.regionMarkets.get(focusRegion) ?? []) : [];
  // Pin labels in collision priority order (placeOverlays keeps the first of two that
  // overlap): best status first, then the larger country, so Germany / the UK keep
  // their labels over Belgium / Ireland in a crowded Europe.
  const labelMarkets = [...regionMarkets].sort(
    (a, b) =>
      MODE_RANK[a.salesMode] - MODE_RANK[b.salesMode] ||
      (model.marketDots[model.byCode.get(b.code) ?? -1] ?? 0) - (model.marketDots[model.byCode.get(a.code) ?? -1] ?? 0),
  );
  const selected = selectedCode ? (markets[model.byCode.get(selectedCode) ?? -1] ?? null) : null;
  const hovered = hoverCode ? (markets[model.byCode.get(hoverCode) ?? -1] ?? null) : null;
  const hoveredIndex = hoverCode ? (model.byCode.get(hoverCode) ?? -1) : -1;

  const visitorView: VisitorView | null = visitorInfo
    ? {
        name: visitorInfo.name,
        isMarket: !!visitorInfo.market,
        regionName: visitorInfo.region?.name ?? null,
      }
    : null;

  const announcement =
    stage.level === "world"
      ? t("announce.world")
      : stage.level === "region" && activeRegion
        ? t("announce.region", {
            region: activeRegion.name,
            count:
              regionMarkets.length === 1
                ? t("map.regionCountOne")
                : t("map.regionCount", { n: regionMarkets.length }),
          })
        : selected
          ? t("announce.country", { country: selected.name, status: t(`status.${selected.salesMode}`) })
          : "";

  // reducedMotion="user": panels / hero / chips only fade (no slide) for prefers-reduced-motion.
  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        id="explore"
        aria-label={t("map.label")}
        className="relative isolate h-[calc(100svh-4rem)] min-h-[720px] scroll-mt-16 overflow-hidden bg-bg lg:min-h-[680px]"
      >
        <style>{`@keyframes region-chip-pulse{0%{box-shadow:0 0 0 0 rgb(var(--accent)/.45);border-color:rgb(var(--accent)/.6)}100%{box-shadow:0 0 0 14px rgb(var(--accent)/0)}}`}</style>

        {/* Backdrop: warm paper with patches of lamp light */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 right-[4%] h-[30rem] w-[30rem] rounded-full bg-honey/25 blur-[110px]" />
          <div className="absolute bottom-[-12rem] left-[-8rem] h-[30rem] w-[36rem] rounded-full bg-leaf-700/45 blur-[120px]" />
        </div>

        {/* Map canvas + pointer layer */}
        <div
          ref={hostRef}
          className="absolute inset-0"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHoverCode(null)}
          onClick={onMapClick}
        >
          <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />
        </div>

        {/* Bottom fade so the map melts into the next section */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg to-transparent" />

        {/* Pins / labels positioned over the canvas */}
        <div
          ref={overlayRef}
          aria-hidden
          data-max-x={layout && focusRegion ? layout.focusArea.x + layout.focusArea.w + 16 : undefined}
          data-max-y={layout && focusRegion && !layout.desktop ? layout.height - layout.sheetHeight : undefined}
          className="pointer-events-none absolute inset-0 z-10"
        >
          {focusRegion &&
            labelMarkets.map((m) => {
              const i = model.byCode.get(m.code)!;
              const [rx, ry] = model.marketRef[i];
              const isSel = m.code === selectedCode;
              const isHover = m.code === hoverCode;
              return (
                <div key={m.code} data-rx={rx.toFixed(2)} data-ry={ry.toFixed(2)} className="absolute top-0 left-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      goCountry(m.code);
                    }}
                    onMouseEnter={() => setHoverCode(m.code)}
                    onMouseLeave={() => setHoverCode(null)}
                    className="pointer-events-auto absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
                  />
                  <span
                    data-label
                    data-force={isSel || isHover ? "true" : "false"}
                    className={cn(
                      "absolute top-0 left-3 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap backdrop-blur-md transition-[opacity,background,border-color,color] duration-200",
                      isSel
                        ? "border-leaf-200/60 bg-leaf-300 text-bg shadow-[0_6px_18px_-6px_rgb(var(--accent)/0.7)]"
                        : isHover
                          ? "border-leaf-300/50 bg-surface text-fg shadow-sm"
                          : "border-fg/10 bg-surface/80 text-fg/85 shadow-sm",
                    )}
                  >
                    {!isSel && <StatusDot mode={m.salesMode} className="size-1.5" />}
                    {m.name}
                  </span>
                </div>
              );
            })}

          {stage.level === "world" && hovered && hoveredIndex >= 0 && (
            <div data-rx={model.marketRef[hoveredIndex][0].toFixed(2)} data-ry={model.marketRef[hoveredIndex][1].toFixed(2)} className="absolute top-0 left-0">
              <div className="glass absolute bottom-5 left-0 -translate-x-1/2 rounded-2xl px-3.5 py-2.5 text-left whitespace-nowrap shadow-lg">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <StatusDot mode={hovered.salesMode} />
                  {hovered.name}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {model.regionById.get(hovered.region)?.name} · {t(`statusShort.${hovered.salesMode}`)}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-leaf-300">{t("map.hint")}</p>
              </div>
            </div>
          )}

          {visitorInfo?.point && (
            <div data-rx={visitorInfo.point[0].toFixed(2)} data-ry={visitorInfo.point[1].toFixed(2)} className="absolute top-0 left-0">
              <span className="absolute top-2 right-3 rounded-full border border-clay/30 bg-surface/90 px-1.5 py-px text-[10px] font-extrabold whitespace-nowrap text-clay shadow-sm backdrop-blur-sm">
                {t("loc.you")}
              </span>
            </div>
          )}
        </div>

        {/* Stage 1: hero copy */}
        <AnimatePresence initial={false}>
          {stage.level === "world" && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="pointer-events-none absolute inset-x-0 top-0 z-20"
            >
              <Container ref={heroRef} className="flex items-end justify-between gap-8 pt-6 sm:pt-8 lg:pt-9">
                <div className="max-w-[34rem] min-w-0">
                  <p className="eyebrow">{t("hero.eyebrow")}</p>
                  <h1 className="mt-2.5 text-[2.15rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:mt-3 lg:text-[3.25rem]">
                    {t("hero.titleLead")} <span className="text-gradient pb-1">{t("hero.titleAccent")}</span>
                  </h1>
                  <p className="mt-3 max-w-[31rem] text-sm leading-relaxed text-muted text-pretty sm:text-[15px] lg:mt-4">
                    {t("hero.body")}
                  </p>
                  <div className="pointer-events-auto mt-4 flex flex-wrap items-center gap-2 sm:gap-3 lg:mt-5">
                    {/* Sized with CSS breakpoints (not the measured layout) so the server HTML doesn't jump on phones. */}
                    <Button size="md" className={HERO_BUTTON_LG} onClick={focusChips}>
                      <Globe2 className="size-4" aria-hidden />
                      {t("hero.cta")}
                    </Button>
                    <ButtonLink href="#product" variant="ghost" size="md" className={cn(HERO_BUTTON_LG, "hidden sm:inline-flex")}>
                      {t("hero.secondary")}
                      <ArrowDown className="size-4" aria-hidden />
                    </ButtonLink>
                  </div>
                  {/* Phones: the companion says hello under the buttons. Both variants are always
                      rendered and switched by CSS, so the server HTML matches (no pop-in / shift). */}
                  <CompanionGreeter
                    variant="face"
                    visitor={visitorView}
                    state={locState}
                    precise={visitor?.source === "device"}
                    onExplore={exploreVisitor}
                    onLocate={locate}
                    className="pointer-events-auto mt-4 lg:hidden"
                  />
                </div>
                <CompanionGreeter
                  variant="pot"
                  visitor={visitorView}
                  state={locState}
                  precise={visitor?.source === "device"}
                  onExplore={exploreVisitor}
                  onLocate={locate}
                  className="pointer-events-auto hidden shrink-0 lg:flex"
                />
              </Container>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 2/3: breadcrumb */}
        <AnimatePresence>
          {stage.level !== "world" && activeRegion && (
            <motion.nav
              key="crumbs"
              aria-label={t("map.breadcrumb")}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="absolute top-4 left-4 z-30 sm:left-6"
            >
              <ol className="glass flex h-10 items-center gap-0.5 rounded-full px-1.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={goWorld}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-muted transition hover:bg-fg/5 hover:text-fg"
                  >
                    <Globe2 className="size-3.5" aria-hidden />
                    {t("map.world")}
                  </button>
                </li>
                <li aria-hidden>
                  <ChevronRight className="size-3.5 text-faint" />
                </li>
                <li>
                  {stage.level === "country" ? (
                    <button
                      type="button"
                      onClick={() => navigate({ level: "region", region: activeRegion.id })}
                      className="inline-flex h-7 items-center rounded-full px-2.5 text-muted transition hover:bg-fg/5 hover:text-fg"
                    >
                      {activeRegion.name}
                    </button>
                  ) : (
                    <span aria-current="page" className="inline-flex h-7 items-center px-2.5 font-medium text-fg">
                      {activeRegion.name}
                    </span>
                  )}
                </li>
                {selected && (
                  <>
                    <li aria-hidden>
                      <ChevronRight className="size-3.5 text-faint" />
                    </li>
                    <li>
                      <span aria-current="page" className="inline-flex h-7 max-w-[9rem] items-center truncate px-2.5 font-medium text-leaf-200 sm:max-w-none">
                        {selected.name}
                      </span>
                    </li>
                  </>
                )}
              </ol>
              <p className="mt-2 hidden pl-3 text-[11px] font-bold text-faint lg:block">
                {t("map.escHint")}
              </p>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* Stage 1: region chips + legend (+ location on mobile) */}
        <AnimatePresence initial={false}>
          {stage.level === "world" && (
            <motion.div
              key="chips"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-x-0 bottom-0 z-20 pb-4 sm:pb-6"
            >
              <Container>
                <div className="lg:mx-auto lg:w-fit">
                  <div className="mb-2.5 flex items-center justify-between gap-4 px-1">
                    <p id="region-chips-label" className="eyebrow">
                      {t("map.chooseRegion")}
                    </p>
                    <ul aria-label={t("map.legend")} className="hidden items-center gap-4 text-xs text-muted sm:flex">
                      {(["full", "pot_only", "coming_soon"] as const).map((mode) => (
                        <li key={mode} className="flex items-center gap-1.5 whitespace-nowrap">
                          <StatusDot mode={mode} />
                          {t(`statusShort.${mode}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <RegionChips
                    key={pulseChips}
                    regions={regions}
                    stats={model.regionStats}
                    activeRegion={hoverRegion}
                    pulse={pulseChips > 0}
                    chipRef={chipRef}
                    onHover={setHoverRegion}
                    onSelect={goRegion}
                  />
                </div>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 2/3: region panel / country card */}
        <AnimatePresence>
          {activeRegion && layout && (
            <motion.div
              key="panel"
              initial={desktop ? { opacity: 0, x: 24 } : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={desktop ? { opacity: 0, x: 24 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-0 z-20"
            >
              <MapPanel
                region={activeRegion}
                markets={regionMarkets}
                selected={selected}
                hoverCode={hoverCode}
                desktop={desktop}
                sheetHeight={layout.sheetHeight}
                headingRef={headingRef}
                onHover={setHoverCode}
                onSelect={goCountry}
                onClose={goWorld}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </section>
    </MotionConfig>
  );
}
