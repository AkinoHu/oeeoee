import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

// Pill-shaped and soft: buttons should feel like something you'd want to press.
const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-[background,color,box-shadow,transform,border-color] duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer";

const variants: Record<Variant, string> = {
  primary: "bg-leaf-300 text-bg shadow-[0_8px_20px_-10px_rgb(var(--accent)/0.7)] hover:bg-leaf-200 hover:shadow-glow hover:-translate-y-px",
  secondary: "bg-surface text-fg border border-line-strong/70 shadow-sm hover:bg-surface-2 hover:border-line-strong",
  outline: "border border-line-strong text-fg hover:border-leaf-300/60 hover:text-leaf-200",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-rose/10 text-rose border border-rose/30 hover:bg-rose/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
  icon: "h-10 w-10",
};

export function buttonVariants({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}
