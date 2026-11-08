"use client";

import { Brain, Cpu, LayoutDashboard, MessagesSquare, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/console", key: "nav.overview", icon: LayoutDashboard },
  { href: "/console/companion", key: "nav.companion", icon: Sparkles },
  { href: "/console/memories", key: "nav.memories", icon: Brain },
  { href: "/console/devices", key: "nav.devices", icon: Cpu },
  { href: "/console/playground", key: "nav.playground", icon: MessagesSquare },
  { href: "/console/orders", key: "nav.orders", icon: Package },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/console" ? pathname === "/console" : pathname === href || pathname.startsWith(`${href}/`));
}

/** Desktop: vertical sidebar. */
export function ConsoleSidebar() {
  const t = useT("console");
  const isActive = useActive();
  return (
    <nav aria-label={t("nav.label")} className="sticky top-24 flex flex-col gap-1">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active ? "bg-surface-2 font-medium text-fg shadow-[inset_2px_0_0_var(--color-leaf-300)]" : "text-muted hover:bg-surface hover:text-fg",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-leaf-300" : "text-faint group-hover:text-muted")} aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: horizontally scrolling tab bar under the header. */
export function ConsoleTabs() {
  const t = useT("console");
  const isActive = useActive();
  return (
    <nav aria-label={t("nav.label")} className="-mb-px flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
              active ? "border-leaf-300 font-medium text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-leaf-300" : "text-faint")} aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
