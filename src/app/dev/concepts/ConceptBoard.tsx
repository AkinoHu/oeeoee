"use client";

/* Dev-only board (review material for the founders, intentionally not translated). */

import type { ReactNode } from "react";
import { PotPreview } from "@/components/pot/PotPreview";
import { cn } from "@/lib/utils";
import { ConceptPot, type ConceptTop } from "./ConceptPot";

function Card({
  tag,
  title,
  note,
  pick,
  night,
  children,
}: {
  tag?: string;
  title: string;
  note: string;
  pick?: boolean;
  night?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[28px] border bg-surface px-4 pt-4 pb-5",
        night && "theme-night bg-bg",
        pick ? "border-leaf-300 shadow-[0_0_0_3px_rgb(var(--accent)/0.18)]" : "border-line",
      )}
    >
      {pick && (
        <span className="absolute top-3 right-3 z-10 rounded-full bg-leaf-300 px-3 py-1 text-[15px] font-extrabold text-bg">推荐</span>
      )}
      <div className="mx-auto w-[88%]">{children}</div>
      <div className="mt-2 flex items-baseline gap-2">
        {tag && <span className="text-[26px] leading-none font-extrabold text-clay">{tag}</span>}
        <span className="text-[23px] leading-tight font-extrabold text-fg">{title}</span>
      </div>
      <p className="mt-1.5 text-[17px] leading-snug font-semibold text-muted">{note}</p>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-[30px] leading-tight font-extrabold text-fg">{children}</h2>;
}

const OPTIONS: { top: ConceptTop; tag: string; title: string; note: string; pick?: boolean }[] = [
  { top: "lamp", tag: "A", title: "小台灯", note: "伸缩杆 + 小灯罩，光从正上方照下来，摄像头藏在灯罩里", pick: true },
  { top: "periscope", tag: "B", title: "灯柱", note: "只有一根伸缩柱：摄像头在柱顶，灯带在柱子侧面" },
  { top: "arch", tag: "C", title: "光拱", note: "像提篮的把手，灯在拱的内侧，两条腿一起升降" },
  { top: "sprout", tag: "D", title: "嫩芽灯", note: "一根可以掰弯的细茎，叶片是灯，花苞是摄像头" },
];

export function ConceptBoard() {
  return (
    <main className="mx-auto w-full max-w-[780px] px-0 py-6">
      <section id="s1" className="bg-bg p-6">
        <Heading>现在的样子 → 新方向</Heading>
        <div className="grid grid-cols-2 gap-4">
          <Card title="现在" note="直筒盆身、黑色方屏、细铁丝一样的光圈">
            <PotPreview size="M" finish="porcelain" plantId="monstera" expression="happy" ringRotating={false} animated={false} />
          </Card>
          <Card title="新方向" note="圆润的陶瓷杯形、脸直接亮在盆身上、一盏会伸缩的小灯" pick>
            <ConceptPot top="lamp" plantId="monstera" />
          </Card>
        </div>
      </section>

      <section id="s2" className="mt-6 bg-bg p-6">
        <Heading>光圈换成什么：四个方案</Heading>
        <div className="grid grid-cols-2 gap-4">
          {OPTIONS.map((o) => (
            <Card key={o.top} tag={o.tag} title={o.title} note={o.note} pick={o.pick}>
              <ConceptPot top={o.top} plantId="monstera" />
            </Card>
          ))}
        </div>
      </section>

      <section id="s3" className="mt-6 bg-bg p-6">
        <Heading>方案 A：跟着植物长高，晚上是一盏小夜灯</Heading>
        <div className="grid grid-cols-3 gap-3">
          <Card title="植物矮" note="灯杆收短">
            <ConceptPot top="lamp" plantId="echeveria" finish="sage" size="S" />
          </Card>
          <Card title="植物高" note="灯杆拉长">
            <ConceptPot top="lamp" plantId="fiddle-leaf-fig" finish="graphite" size="L" />
          </Card>
          <Card title="夜里" note="给你留着灯" night>
            <ConceptPot top="lamp" plantId="snake-plant" mood="sleepy" night />
          </Card>
        </div>
      </section>
    </main>
  );
}
