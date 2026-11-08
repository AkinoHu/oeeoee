import { cn } from "@/lib/utils";

/** Mark: a little screen-face with a sprout on top. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <path d="M16 9.5c0-3 1.8-5.2 5-5.6-.2 3.1-2.2 5.2-5 5.6Z" fill="var(--color-leaf-300)" />
      <path d="M16 9.5c0-2.2-1.4-3.9-3.8-4.2.1 2.3 1.6 3.9 3.8 4.2Z" fill="var(--color-leaf-500)" />
      <rect x="4" y="10" width="24" height="18" rx="7" fill="var(--color-surface-3)" stroke="var(--color-leaf-300)" strokeWidth="1.5" />
      <circle cx="11.5" cy="18" r="2" fill="var(--color-leaf-300)" />
      <circle cx="20.5" cy="18" r="2" fill="var(--color-leaf-300)" />
      <path d="M13 22.5c1.8 1.4 4.2 1.4 6 0" stroke="var(--color-leaf-300)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
