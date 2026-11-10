import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-3xl border border-line bg-surface shadow-soft", className)} {...props} />;
}

type BadgeTone = "leaf" | "sky" | "sun" | "rose" | "neutral";
const badgeTones: Record<BadgeTone, string> = {
  leaf: "bg-leaf-300/10 text-leaf-200 border-leaf-300/20",
  sky: "bg-sky/10 text-sky border-sky/20",
  sun: "bg-sun/10 text-sun border-sun/25",
  rose: "bg-rose/10 text-rose border-rose/20",
  neutral: "bg-surface-2 text-muted border-line",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

const field =
  "w-full rounded-2xl border border-line-strong/70 bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-leaf-300/60 focus:ring-4 focus:ring-leaf-300/15 disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-11 py-0", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "h-11 py-0 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-bold text-fg/90", className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base text-muted text-pretty sm:text-lg">{description}</p>}
    </div>
  );
}
