import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tail = "left" | "right" | "bottom-left" | "bottom-right" | "none";

const tails: Record<Tail, string> = {
  left: "rounded-bl-md",
  right: "rounded-br-md",
  "bottom-left": "rounded-bl-md",
  "bottom-right": "rounded-br-md",
  none: "",
};

/**
 * Something the companion says. The squared-off corner points at the speaker
 * (put the face on that side). Use for greetings, hints and empty states so the
 * product talks in its own voice instead of in UI labels.
 */
export function SpeechBubble({
  tail = "left",
  tone = "paper",
  className,
  ...props
}: ComponentProps<"div"> & { tail?: Tail; tone?: "paper" | "leaf" }) {
  return (
    <div
      className={cn(
        "relative inline-block max-w-prose rounded-3xl px-4 py-2.5 text-sm leading-relaxed font-semibold shadow-soft",
        tone === "paper" ? "border border-line bg-surface text-fg" : "bg-leaf-300 text-bg",
        tails[tail],
        className,
      )}
      {...props}
    />
  );
}
