"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminActionState } from "@/components/admin/order-status";
import { PartnerStatus } from "@/generated/prisma/enums";
import { getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const input = z.object({
  applicationId: z.string().min(1).max(64),
  /** Status the admin saw when clicking; guards against overwriting another admin's change. */
  from: z.enum(PartnerStatus),
  status: z.enum(PartnerStatus),
});

/** Sets a partner application's pipeline status (NEW / CONTACTED / APPROVED / REJECTED). */
export async function updatePartnerStatus(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const t = await getT("partners");
  const at = Date.now();

  const parsed = input.safeParse({
    applicationId: formData.get("applicationId"),
    from: formData.get("from"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: t("admin.partner.error"), at };
  const { applicationId, from, status } = parsed.data;

  // Conditional update so a stale page can't silently undo a change made meanwhile.
  const { count } = await prisma.partnerApplication.updateMany({ where: { id: applicationId, status: from }, data: { status } });
  if (count === 0) {
    const exists = await prisma.partnerApplication.findUnique({ where: { id: applicationId }, select: { id: true } });
    return { status: "error", message: t(exists ? "admin.partner.conflict" : "admin.partner.error"), at };
  }

  revalidatePath("/admin", "layout");
  return { status: "ok", message: t("admin.partner.updated"), at };
}
