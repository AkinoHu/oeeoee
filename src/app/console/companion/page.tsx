import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { CompanionSettingsForm } from "@/components/console/CompanionSettingsForm";
import { PageHeader } from "@/components/console/PageHeader";
import { Card } from "@/components/ui/primitives";
import { getPlant, lt } from "@/data";
import { getLocale, getT } from "@/i18n/server";
import { loadBrainContext } from "@/lib/companion/brain";
import { buildSystemPrompt } from "@/lib/companion/prompt";
import { readReminders } from "@/lib/companion/settings";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("console"))("companion.title") };
}

export default async function CompanionPage() {
  const user = await requireUser("/console/companion");
  const [t, locale, { ctx, companion, device }] = await Promise.all([getT("console"), getLocale(), loadBrainContext(user.id)]);
  const plant = getPlant(device?.plantId);
  const prompt = buildSystemPrompt(ctx);

  return (
    <>
      <PageHeader
        title={t("companion.title")}
        description={t("companion.subtitle")}
        actions={<CompanionFace expression={ctx.vitals?.expression ?? "happy"} size={96} className="hidden sm:block" />}
      />
      <div className="grid gap-6">
        <CompanionSettingsForm
          initial={{
            name: companion.name,
            persona: companion.persona,
            language: companion.language,
            voice: companion.voice,
            model: companion.model,
            temperature: companion.temperature,
            maxTokens: companion.maxTokens,
            reminders: readReminders(companion.reminders),
          }}
          plantPersonality={plant ? lt(plant.personality, locale) : null}
        />

        <Card className="p-0">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="h-4 w-4 text-muted transition-transform group-open:rotate-90" aria-hidden />
              {t("companion.preview")}
              <span className="ml-2 hidden font-normal text-muted sm:inline">{t("companion.previewHint")}</span>
            </summary>
            <pre className="mx-5 mb-5 max-h-[28rem] overflow-auto rounded-xl border border-line bg-bg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg/80">
              {prompt}
            </pre>
          </details>
        </Card>
      </div>
    </>
  );
}
