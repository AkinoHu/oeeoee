"use client";

import { BellRing, Mic } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import type { Expression } from "@/components/companion-face/types";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Mood = "happy" | "curious" | "excited" | "love" | "focused" | "sleepy";

const SEQUENCE: { expression: Expression & Mood; talking: boolean }[] = [
  { expression: "happy", talking: false },
  { expression: "curious", talking: false },
  { expression: "excited", talking: true },
  { expression: "love", talking: false },
  { expression: "focused", talking: false },
  { expression: "sleepy", talking: false },
];

/** The companion's face cycling through moods, with a tiny voice conversation. */
export function CompanionDemo() {
  const t = useT("landing");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setStep((s) => (s + 1) % SEQUENCE.length), 2400);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const current = SEQUENCE[step];

  return (
    <div ref={ref} className="relative flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
      <div className="relative">
        <div aria-hidden className="absolute -inset-10 rounded-full bg-leaf-300/10 blur-3xl" />
        <div className="relative rounded-[2rem] border border-fg/10 bg-screen p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_30px_60px_-20px_rgb(40_28_10/0.45)]">
          <CompanionFace expression={current.expression} talking={current.talking} size={176} />
        </div>
        <span className="absolute -right-3 -bottom-3 inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-surface-2/90 px-2.5 py-1 font-bold tabular-nums text-[10px] tracking-wider text-muted uppercase backdrop-blur">
          <span className="size-1.5 rounded-full bg-leaf-300 shadow-[0_0_8px_var(--color-leaf-300)]" />
          {t(`mood.${current.expression}`)}
        </span>
      </div>

      <div className="w-full max-w-sm space-y-2.5 text-sm">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-fg/[0.07] px-3.5 py-2.5 text-fg/90">
          {t("companion.chat.user")}
        </div>
        <div className="flex items-end gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-leaf-300/15 text-leaf-300">
            <Mic className="size-3.5" aria-hidden />
          </span>
          <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-md border border-leaf-300/20 bg-leaf-300/10 px-3.5 py-2.5 text-leaf-50">
            {t("companion.chat.bot")}
            <span aria-hidden className="mt-2 flex h-3 items-end gap-0.5">
              {Array.from({ length: 18 }, (_, i) => (
                <span
                  key={i}
                  className={cn("w-0.5 rounded-full bg-leaf-300/70", current.talking && "animate-[voice-bar_0.9s_ease-in-out_infinite]")}
                  style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 6) * 0.08}s` }}
                />
              ))}
            </span>
          </div>
        </div>
        <div className="flex justify-center pt-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-sun/25 bg-sun/10 px-3 py-1 text-xs text-sun">
            <BellRing className="size-3.5" aria-hidden />
            {t("companion.chat.remind")}
          </span>
        </div>
      </div>
      <style>{`@keyframes voice-bar{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}`}</style>
    </div>
  );
}
