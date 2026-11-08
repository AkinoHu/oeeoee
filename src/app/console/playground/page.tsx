import type { Metadata } from "next";
import { PageHeader } from "@/components/console/PageHeader";
import { Playground, type ChatItem } from "@/components/console/Playground";
import { tileTexts } from "@/components/console/vitals-text";
import { isExpression } from "@/components/companion-face/types";
import { getPlant, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { companionClock, getOrCreateCompanion, potState, primaryDevice } from "@/lib/companion/queries";
import { prisma } from "@/lib/db";
import { features } from "@/lib/env";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("console"))("playground.title") };
}

export default async function PlaygroundPage() {
  const user = await requireUser("/console/playground");
  const [t, locale, companion] = await Promise.all([getT("console"), getLocale(), getOrCreateCompanion(user.id)]);
  const clock = companionClock(companion);
  const now = new Date();
  const [device, recent] = await Promise.all([
    primaryDevice(user.id),
    prisma.chatMessage.findMany({ where: { companionId: companion.id }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const state = device ? await potState(device, now, clock.vitalsOptions) : null;
  const plant = getPlant(device?.plantId);

  const history: ChatItem[] = recent.reverse().map((m) => ({
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
    expression: m.expression,
    channel: m.channel,
  }));

  const vitals = state
    ? tileTexts(state.vitals, state.snapshot?.growLightOn, t, locale).map((tile) => ({
        ...tile,
        severity: state.vitals.metrics[tile.metric].severity,
        hasValue: state.vitals.metrics[tile.metric].value !== null,
      }))
    : [];

  const lastExpression = recent.find((m) => m.role === "assistant")?.expression;

  return (
    <>
      <PageHeader title={t("playground.title")} description={t("playground.subtitle")} />
      <Playground
        name={companion.name}
        initialExpression={state?.vitals.expression ?? (isExpression(lastExpression) ? lastExpression : "happy")}
        history={history}
        fallbackMode={!features.anthropic}
        livingIn={plant && device ? `${t("overview.livesIn", { plant: lt(plant.name, locale) })} · ${device.name}` : device?.name ?? null}
        vitals={vitals}
        deviceId={device?.id ?? null}
      />
    </>
  );
}
