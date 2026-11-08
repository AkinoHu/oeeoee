"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import { updatePartnerStatus } from "@/app/admin/partners/actions";
import { Button } from "@/components/ui/button";
import type { OrderStatus, PartnerStatus } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  DESTRUCTIVE_STATUSES,
  PARTNER_STATUSES,
  idleActionState,
  nextOrderStatuses,
  type AdminActionState,
} from "./order-status";

function ActionMessage({ state }: { state: AdminActionState }) {
  if (state.status === "idle") return null;
  const ok = state.status === "ok";
  return (
    <p
      key={state.at}
      role={ok ? "status" : "alert"}
      className={cn("mt-3 flex items-start gap-2 text-sm", ok ? "text-leaf-200" : "text-rose")}
    >
      {ok ? (
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      {state.message}
    </p>
  );
}

/** Buttons for the allowed next statuses of an order. */
export function OrderStatusActions({ orderId, current }: { orderId: string; current: OrderStatus }) {
  const t = useT("partners");
  const [state, action, pending] = useActionState(updateOrderStatus, idleActionState);
  const options = nextOrderStatuses(current);
  const forward = options.filter((s) => !DESTRUCTIVE_STATUSES.includes(s));
  const destructive = options.filter((s) => DESTRUCTIVE_STATUSES.includes(s));

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const next = submitter?.value;
        if (next === "CANCELED" && !window.confirm(t("admin.order.confirmCancel"))) event.preventDefault();
        if (next === "REFUNDED" && !window.confirm(t("admin.order.confirmRefund"))) event.preventDefault();
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="from" value={current} />
      {options.length === 0 ? (
        <p className="text-sm text-muted">{t("admin.order.final")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {forward.map((status) => (
            <Button key={status} type="submit" name="next" value={status} disabled={pending} className="w-full">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t(`admin.order.action.${status as "FULFILLING" | "SHIPPED" | "DELIVERED"}`)}
            </Button>
          ))}
          {destructive.length > 0 && (
            <div className={cn("grid gap-2", destructive.length > 1 && "sm:grid-cols-2", forward.length > 0 && "mt-1")}>
              {destructive.map((status) => (
                <Button key={status} type="submit" name="next" value={status} variant="danger" disabled={pending}>
                  {t(`admin.order.action.${status as "CANCELED" | "REFUNDED"}`)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      <ActionMessage state={state} />
    </form>
  );
}

/** Segmented control to move an application through the pipeline. */
export function PartnerStatusControl({ applicationId, current }: { applicationId: string; current: PartnerStatus }) {
  const t = useT("partners");
  const [state, action, pending] = useActionState(updatePartnerStatus, idleActionState);

  return (
    <form action={action}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="grid grid-cols-2 gap-2">
        {PARTNER_STATUSES.map((status) => {
          const active = status === current;
          return (
            <button
              key={status}
              type="submit"
              name="status"
              value={status}
              disabled={pending || active}
              aria-pressed={active}
              className={cn(
                "inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors disabled:cursor-default",
                active
                  ? "border-leaf-300/60 bg-leaf-300/12 text-leaf-100"
                  : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg disabled:opacity-60",
              )}
            >
              {t(`partnerStatus.${status}`)}
            </button>
          );
        })}
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
