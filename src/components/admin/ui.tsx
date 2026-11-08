import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Badge, Card } from "@/components/ui/primitives";
import type { OrderStatus, PartnerStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_TONE, PARTNER_STATUS_TONE } from "./order-status";

/** Shared server-rendered building blocks for the admin pages. */

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <div className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0 text-sm">{action}</div>}
        </div>
      )}
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  accent?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-2 font-mono text-3xl font-semibold tracking-tight", accent ? "text-leaf-200" : "text-fg")}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-line bg-surface p-5 transition-colors";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-line-strong hover:bg-surface-2/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function OrderStatusBadge({ status, label, className }: { status: OrderStatus; label: string; className?: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} className={cn("whitespace-nowrap", className)}>
      {label}
    </Badge>
  );
}

export function PartnerStatusBadge({ status, label, className }: { status: PartnerStatus; label: string; className?: string }) {
  return (
    <Badge tone={PARTNER_STATUS_TONE[status]} className={cn("whitespace-nowrap", className)}>
      {label}
    </Badge>
  );
}

/** Ranked horizontal bars, one hue; values in text colour at the end. */
export function BarList({
  items,
  emptyText,
}: {
  items: { key: string; label: React.ReactNode; value: number; display?: string; href?: string }[];
  emptyText: string;
}) {
  if (items.length === 0) return <EmptyState>{emptyText}</EmptyState>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{item.display ?? item.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3/70">
              <div
                className="h-full rounded-full bg-leaf-400/80"
                style={{ width: `${item.value === 0 ? 0 : Math.max(2, (item.value / max) * 100)}%` }}
              />
            </div>
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/70">
                {inner}
              </Link>
            ) : (
              <div className="px-2 py-1.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-faint", className)}>
      {children}
    </div>
  );
}

/** Pill links used as a status filter, with counts. */
export function FilterPills({
  items,
  label,
}: {
  items: { key: string; label: string; count?: number; href: string; active: boolean }[];
  label: string;
}) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
                item.active
                  ? "border-leaf-300/50 bg-leaf-300/10 text-leaf-100"
                  : "border-line text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className={cn("font-mono text-xs", item.active ? "text-leaf-200" : "text-faint")}>{item.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({
  page,
  pages,
  hrefFor,
  labels,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  labels: { nav: string; prev: string; next: string; page: string };
}) {
  if (pages <= 1) return null;
  const linkCls =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg";
  const disabledCls = "inline-flex h-9 items-center gap-1 rounded-lg border border-line/50 px-3 text-sm text-faint/60";
  return (
    <nav aria-label={labels.nav} className="mt-4 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkCls} rel="prev">
          <ChevronLeft className="h-4 w-4" aria-hidden /> {labels.prev}
        </Link>
      ) : (
        <span className={disabledCls}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> {labels.prev}
        </span>
      )}
      <span className="text-sm text-muted">{labels.page}</span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={linkCls} rel="next">
          {labels.next} <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={disabledCls}>
          {labels.next} <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}

/** Table shell: horizontal scroll on small screens, consistent styling. */
export function DataTable({ className, children, bare, ...props }: ComponentProps<"table"> & { bare?: boolean }) {
  return (
    <div className={cn("overflow-x-auto", !bare && "rounded-2xl border border-line bg-surface")}>
      <table
        className={cn(
          "w-full border-collapse text-sm",
          "[&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:tracking-wide [&_th]:text-faint [&_th]:uppercase",
          "[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle",
          "[&_tbody_tr]:border-t [&_tbody_tr]:border-line",
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

/** Make a whole table row clickable via a stretched link in its first cell. */
export const rowLinkClass =
  "font-medium text-fg outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-leaf-300/60";
export const clickableRowClass = "relative transition-colors hover:bg-surface-2/60";

/** Definition list row for detail pages. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,35%)_1fr] gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
