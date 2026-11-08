import type { Metadata } from "next";
import { MemoryManager } from "@/components/console/MemoryManager";
import { PageHeader } from "@/components/console/PageHeader";
import { getT } from "@/i18n/server";
import { getOrCreateCompanion } from "@/lib/companion/queries";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("console"))("memories.title") };
}

export default async function MemoriesPage() {
  const user = await requireUser("/console/memories");
  const [t, companion] = await Promise.all([getT("console"), getOrCreateCompanion(user.id)]);
  const memories = await prisma.memory.findMany({
    where: { companionId: companion.id },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    select: { id: true, kind: true, content: true, importance: true, source: true },
  });

  return (
    <>
      <PageHeader
        title={t("memories.title")}
        description={t("memories.subtitle")}
        actions={<span className="text-sm text-muted">{t("memories.count", { n: memories.length })}</span>}
      />
      <MemoryManager memories={memories} />
    </>
  );
}
