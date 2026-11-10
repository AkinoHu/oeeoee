import type { SalesMode } from "@/data/types";
import { cn } from "@/lib/utils";

/** Small glowing dot that mirrors how a market is drawn on the map. */
export function StatusDot({ mode, className }: { mode: SalesMode | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        mode === "full" && "bg-leaf-300 shadow-[0_0_0_3px_rgb(var(--accent)/0.18),0_0_12px_rgb(var(--accent)/0.9)]",
        mode === "pot_only" && "bg-leaf-400/90 shadow-[0_0_8px_rgb(var(--glow)/0.55)]",
        mode === "coming_soon" && "bg-leaf-600/70",
        mode === null && "bg-faint/60",
        className,
      )}
    />
  );
}

/** Pill with the short status label. */
export function StatusBadge({ mode, label, className }: { mode: SalesMode; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        mode === "full" && "border-leaf-300/30 bg-leaf-300/12 text-leaf-200",
        mode === "pot_only" && "border-leaf-500/25 bg-leaf-500/8 text-leaf-300",
        mode === "coming_soon" && "border-line-strong bg-surface-2/60 text-muted",
        className,
      )}
    >
      <StatusDot mode={mode} className="size-1.5" />
      {label}
    </span>
  );
}
