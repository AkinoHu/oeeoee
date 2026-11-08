"use client";

import { Handshake, LayoutDashboard, ListChecks, ShoppingBag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; key: "overview" | "orders" | "partners" | "waitlist"; icon: LucideIcon }[] = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
  { href: "/admin/orders", key: "orders", icon: ShoppingBag },
  { href: "/admin/partners", key: "partners", icon: Handshake },
  { href: "/admin/waitlist", key: "waitlist", icon: ListChecks },
];

/** Admin section navigation. `compact` renders a 4-up tab bar for small screens. */
export function AdminNav({ className, compact = false }: { className?: string; compact?: boolean }) {
  const t = useT("partners");
  const pathname = usePathname();
  return (
    <nav aria-label={t("admin.nav.label")} className={className}>
      <ul className={cn(compact ? "grid grid-cols-4 gap-1" : "flex items-center gap-1")}>
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg transition-colors",
                  compact
                    ? "flex flex-col items-center gap-1 px-0.5 py-1.5 text-[0.68rem]"
                    : "inline-flex h-9 items-center gap-2 px-3 text-sm",
                  active ? "bg-surface-2 text-fg ring-1 ring-line-strong" : "text-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-leaf-300" : "text-faint")} aria-hidden />
                <span className="max-w-full truncate">{t(`admin.nav.${key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
