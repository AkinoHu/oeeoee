"use client";

/*
 * Dev-only gallery (404 in production). Labels here are developer-facing and
 * intentionally not translated.
 */

import { useState, type ReactNode } from "react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { EXPRESSIONS, type Expression } from "@/components/companion-face/types";
import { PlantArt } from "@/components/plant-art/PlantArt";
import { PotPreview } from "@/components/pot/PotPreview";
import { getPlant, PLANT_IDS, type PotFinishId, type PotSize } from "@/data";
import { cn } from "@/lib/utils";

const SIZES: PotSize[] = ["S", "M", "L"];
const FINISHES: PotFinishId[] = ["porcelain", "sage", "graphite"];
const POT_PLANTS = ["pothos", "monstera", "snake-plant", "calathea", "fiddle-leaf-fig", "echeveria", "peace-lily", "money-tree", "phalaenopsis"];

function Section({ id, title, children, aside }: { id: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} data-testid={`section-${id}`} className="border-t border-line py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold text-fg">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        on ? "border-leaf-300/50 bg-leaf-300/15 text-leaf-200" : "border-line bg-surface-2 text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-medium transition",
            o === value ? "bg-leaf-300 text-bg" : "text-muted hover:text-fg",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

const plantLabel = (id: string) => getPlant(id)?.name.en ?? id;

export function ArtGallery() {
  const [animated, setAnimated] = useState(true);
  const [talkingAll, setTalkingAll] = useState(false);

  const [size, setSize] = useState<PotSize>("M");
  const [finish, setFinish] = useState<PotFinishId>("porcelain");
  const [plant, setPlant] = useState<string>("monstera");
  const [expression, setExpression] = useState<Expression>("happy");
  const [rotating, setRotating] = useState(true);
  const [light, setLight] = useState(true);
  const [annotated, setAnnotated] = useState(false);
  const [talking, setTalking] = useState(false);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <header className="py-10">
        <p className="eyebrow">dev · pot-art</p>
        <h1 className="mt-2 text-3xl font-semibold text-fg">Pot, plant art &amp; companion face</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Review page for PlantArt, CompanionFace and PotPreview. Not available in production.
        </p>
      </header>

      <Section id="interactive" title="Interactive pot">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
          <div className="rounded-3xl border border-line bg-surface/40 p-4" data-testid="interactive-pot">
            <PotPreview
              size={size}
              finish={finish}
              plantId={plant === "none" ? null : plant}
              expression={expression}
              ringRotating={rotating}
              lightOn={light}
              annotated={annotated}
              talking={talking}
            />
          </div>
          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <p className="text-muted">Size</p>
              <Seg value={size} options={SIZES} onChange={setSize} />
            </div>
            <div className="space-y-2">
              <p className="text-muted">Finish</p>
              <Seg value={finish} options={FINISHES} onChange={setFinish} />
            </div>
            <div className="space-y-2">
              <p className="text-muted">Plant</p>
              <Seg value={plant} options={[...PLANT_IDS, "none", "mystery-fern"] as string[]} onChange={setPlant} />
            </div>
            <div className="space-y-2">
              <p className="text-muted">Expression</p>
              <Seg value={expression} options={EXPRESSIONS} onChange={setExpression} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Toggle on={rotating} onChange={setRotating}>
                ring rotating
              </Toggle>
              <Toggle on={light} onChange={setLight}>
                light on
              </Toggle>
              <Toggle on={annotated} onChange={setAnnotated}>
                annotated
              </Toggle>
              <Toggle on={talking} onChange={setTalking}>
                talking
              </Toggle>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="plants"
        title={`Plants (${PLANT_IDS.length} + fallback)`}
        aside={
          <Toggle on={animated} onChange={setAnimated}>
            animated
          </Toggle>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...PLANT_IDS, "mystery-fern"].map((id) => (
            <figure key={id} className="rounded-2xl border border-line bg-surface p-3" data-testid={`plant-${id}`}>
              <div className="rounded-xl bg-surface-2/60">
                <PlantArt plantId={id} animated={animated} />
              </div>
              <figcaption className="mt-2 truncate text-xs text-muted">
                <span className="text-fg">{plantLabel(id)}</span> · {id}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section
        id="faces"
        title="Companion face"
        aside={
          <Toggle on={talkingAll} onChange={setTalkingAll}>
            talking
          </Toggle>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {EXPRESSIONS.map((e) => (
            <figure key={e} className="flex flex-col items-center rounded-2xl border border-line bg-surface p-4" data-testid={`face-${e}`}>
              <CompanionFace expression={e} talking={talkingAll} size={160} className="h-auto max-w-full" />
              <figcaption className="mt-2 text-xs text-muted">{e}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="pots" title="Sizes × finishes">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FINISHES.flatMap((f, fi) =>
            SIZES.map((s, si) => {
              const id = POT_PLANTS[(fi * 3 + si) % POT_PLANTS.length];
              return (
                <figure key={`${f}-${s}`} className="rounded-2xl border border-line bg-surface p-3" data-testid={`pot-${f}-${s}`}>
                  <PotPreview size={s} finish={f} plantId={id} expression={EXPRESSIONS[(fi * 3 + si) % EXPRESSIONS.length]} />
                  <figcaption className="mt-1 text-center text-xs text-muted">
                    {s} · {f} · {id}
                  </figcaption>
                </figure>
              );
            }),
          )}
        </div>
      </Section>

      <Section id="extremes" title="Extreme widths (240 / 640) + empty pot">
        <div className="flex flex-wrap items-end gap-6">
          <div style={{ width: 240 }} className="rounded-2xl border border-line bg-surface p-2" data-testid="pot-240">
            <PotPreview size="S" finish="sage" plantId="spider-plant" expression="curious" annotated />
          </div>
          <div style={{ width: 640, maxWidth: "100%" }} className="rounded-2xl border border-line bg-surface p-2" data-testid="pot-640">
            <PotPreview size="L" finish="graphite" plantId="fiddle-leaf-fig" expression="love" annotated />
          </div>
          <div style={{ width: 300 }} className="rounded-2xl border border-line bg-surface p-2" data-testid="pot-empty">
            <PotPreview size="M" finish="porcelain" plantId={null} expression="sleepy" lightOn={false} />
          </div>
        </div>
      </Section>
    </main>
  );
}
