"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import type { TokenReveal as Reveal } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function CopyButton({ text, className, compact }: { text: string; className?: string; compact?: boolean }) {
  const t = useT("console");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn("shrink-0", className)}
      aria-label={compact ? t("token.copy") : undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check className="h-4 w-4 text-leaf-300" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {!compact && (copied ? t("token.copied") : t("token.copy"))}
      <span className="sr-only" aria-live="polite">
        {copied ? t("token.copied") : ""}
      </span>
    </Button>
  );
}

export function curlExamples(baseUrl: string, token: string) {
  const auth = `-H "Authorization: Bearer ${token}"`;
  return {
    telemetry: [
      `curl -X POST ${baseUrl}/api/device/telemetry \\`,
      `  ${auth} \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"soilMoisture":31.5,"airTemp":22.8,"airHumidity":55,"lightLux":420,"waterLevel":72,"firmwareVersion":"0.1.0"}'`,
    ].join("\n"),
    config: [`curl ${baseUrl}/api/device/config \\`, `  ${auth}`].join("\n"),
    chat: [
      `curl -X POST ${baseUrl}/api/device/chat \\`,
      `  ${auth} \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{"text":"How are you feeling?"}'`,
    ].join("\n"),
  };
}

/** Shows a freshly issued device token once, with ready-to-run curl examples. */
export function TokenReveal({ reveal, baseUrl, onDone }: { reveal: Reveal; baseUrl: string; onDone?: () => void }) {
  const t = useT("console");
  const examples = curlExamples(baseUrl, reveal.token);
  return (
    <div role="region" aria-label={t("token.title", { name: reveal.name })} className="rounded-2xl border border-leaf-300/30 bg-leaf-300/[0.04] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf-300/15 text-leaf-300">
          <KeyRound className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">{t("token.title", { name: reveal.name })}</h3>
          <p className="mt-0.5 text-sm text-muted">{t("token.once")}</p>
          <p className="mt-1 font-mono text-xs text-faint">{t("token.serial", { serial: reveal.serial })}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-bg p-2 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-leaf-200" data-testid="device-token">
          {reveal.token}
        </code>
        <CopyButton text={reveal.token} />
      </div>

      <p className="mt-5 mb-2 text-sm font-medium">{t("token.examples")}</p>
      <div className="space-y-3">
        {(["telemetry", "config", "chat"] as const).map((key) => (
          <div key={key} className="overflow-hidden rounded-xl border border-line bg-bg">
            <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
              <span className="text-xs text-muted">{t(`token.example.${key}`)}</span>
              <CopyButton text={examples[key]} compact className="h-7 px-2" />
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-fg/80">{examples[key]}</pre>
          </div>
        ))}
      </div>
      {onDone && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onDone}>
            <Check className="h-4 w-4" aria-hidden /> {t("token.done")}
          </Button>
        </div>
      )}
    </div>
  );
}
