"use client";

import { Check, LoaderCircle, Sprout } from "lucide-react";
import { startTransition, useActionState, useOptimistic, useState, useSyncExternalStore } from "react";
import { saveCompanionSettings, type FormState } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { Card, Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { COMPANION_LANGUAGES, COMPANION_MODELS, VOICE_PRESETS, type ReminderSettings } from "@/lib/companion/settings";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./PageHeader";

export interface CompanionSettingsValues {
  name: string;
  persona: string;
  language: string;
  voice: string;
  model: string;
  temperature: number;
  maxTokens: number;
  reminders: ReminderSettings;
}

const subscribeNoop = () => () => {};

function useBrowserTimeZone(): string | null {
  return useSyncExternalStore(
    subscribeNoop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    () => null,
  );
}

const NO_ZONES: string[] = [];
let browserZones: string[] | null = null;

/**
 * The browser's time-zone list, client-only: Node's list differs from Firefox's
 * and Safari's, so rendering it on the server breaks hydration.
 */
function useTimeZoneList(): string[] {
  return useSyncExternalStore(
    subscribeNoop,
    () => {
      if (!browserZones) {
        try {
          browserZones = Intl.supportedValuesOf("timeZone");
        } catch {
          browserZones = NO_ZONES;
        }
      }
      return browserZones;
    },
    () => NO_ZONES,
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-rose">{message}</p> : null;
}

/** Translated message per field; the server's zod messages are English-only. */
const FIELD_ERROR: Partial<Record<string, MessageKey<"console">>> = {
  name: "companion.invalid.name",
  maxTokens: "companion.invalid.maxTokens",
  sedentaryMinutes: "companion.invalid.sedentaryMinutes",
  hydrationMinutes: "companion.invalid.hydrationMinutes",
  workStart: "companion.invalid.workHours",
  workEnd: "companion.invalid.workHours",
  quietStart: "companion.invalid.quietHours",
  quietEnd: "companion.invalid.quietHours",
  timezone: "companion.invalid.timezone",
};

export function CompanionSettingsForm({ initial, plantPersonality }: { initial: CompanionSettingsValues; plantPersonality: string | null }) {
  const t = useT("console");
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveCompanionSettings, { ok: null });
  const [optimistic, setOptimistic] = useOptimistic<FormState, FormState>(state, (_s, next) => next);
  const browserTz = useBrowserTimeZone();
  const zones = useTimeZoneList();

  // Controlled fields so a failed save never wipes the user's edits.
  const [v, setV] = useState({
    ...initial,
    ...initial.reminders,
    timezone: initial.reminders.timezone ?? "",
  });
  const set = <K extends keyof typeof v>(key: K) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }));
  const errors = optimistic.ok === false ? (optimistic.errors ?? {}) : {};
  const invalid = (key: string) => (errors[key] ? "border-rose/60 focus:border-rose/60" : undefined);
  const errorText = (key: string) => (errors[key] ? t(FIELD_ERROR[key] ?? "companion.invalid") : undefined);

  return (
    <form
      // onSubmit, not `action`: React resets a form after an action, which snaps
      // controlled <select>s and radios back to their first-render values (and the
      // next save would send those). While saving, clear the old status instead of
      // claiming "Saved" before the server has answered.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          setOptimistic({ ok: null });
          formAction(fd);
        });
      }}
      className="space-y-5"
      noValidate
    >
      {/* Identity */}
      <Card className="p-5 sm:p-6">
        <SectionTitle>{t("companion.identity")}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">{t("companion.name")}</Label>
            <Input id="name" name="name" value={v.name} onChange={set("name")} maxLength={40} required className={invalid("name")} />
            <FieldError message={errorText("name")} />
          </div>
          <div>
            <Label htmlFor="language">{t("companion.language")}</Label>
            <Select id="language" name="language" value={v.language} onChange={set("language")}>
              {COMPANION_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {t(`companion.language.${l}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="persona">{t("companion.persona")}</Label>
            <Textarea
              id="persona"
              name="persona"
              value={v.persona}
              onChange={set("persona")}
              rows={4}
              maxLength={2000}
              placeholder={t("companion.personaPlaceholder")}
              aria-describedby="persona-hint"
              className={invalid("persona")}
            />
            <p id="persona-hint" className="mt-1.5 text-xs text-muted">
              {t("companion.personaHint")}
            </p>
            {plantPersonality && (
              <p className="mt-2 flex items-start gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-xs text-muted">
                <Sprout className="mt-px h-3.5 w-3.5 shrink-0 text-leaf-300" aria-hidden />
                {t("companion.plantPersonality", { text: plantPersonality })}
              </p>
            )}
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium text-fg/90">{t("companion.voice")}</legend>
            <div className="flex flex-wrap gap-2">
              {VOICE_PRESETS.map((voice) => (
                <label
                  key={voice}
                  className={cn(
                    "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-leaf-300",
                    v.voice === voice ? "border-leaf-300/60 bg-leaf-300/12 text-leaf-100" : "border-line text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  <input type="radio" name="voice" value={voice} checked={v.voice === voice} onChange={set("voice")} className="sr-only" />
                  {t(`companion.voice.${voice}`)}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t("companion.voiceHint")}</p>
          </fieldset>
        </div>
      </Card>

      {/* Brain */}
      <Card className="p-5 sm:p-6">
        <SectionTitle>{t("companion.brain")}</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="model">{t("companion.model")}</Label>
            <Select id="model" name="model" value={v.model} onChange={set("model")} aria-describedby="model-hint">
              {COMPANION_MODELS.map((m) => (
                <option key={m} value={m}>
                  {t(`companion.model.${m}`)}
                </option>
              ))}
            </Select>
            <p id="model-hint" className="mt-1.5 text-xs text-muted">
              {t("companion.modelHint")}
            </p>
          </div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label htmlFor="temperature" className="mb-0">
                {t("companion.temperature")}
              </Label>
              <output htmlFor="temperature" className="font-mono text-sm text-leaf-200">
                {Number(v.temperature).toFixed(2)}
              </output>
            </div>
            <input
              id="temperature"
              name="temperature"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={v.temperature}
              onChange={set("temperature")}
              aria-describedby="temperature-hint"
              className="w-full cursor-pointer accent-[var(--color-leaf-300)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-faint">
              <span>{t("companion.temperature.low")}</span>
              <span>{t("companion.temperature.high")}</span>
            </div>
            <p id="temperature-hint" className="mt-1.5 text-xs text-muted">
              {t("companion.temperatureHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="maxTokens">{t("companion.maxTokens")}</Label>
            <Input
              id="maxTokens"
              name="maxTokens"
              type="number"
              min={64}
              max={2048}
              step={1}
              value={v.maxTokens}
              onChange={set("maxTokens")}
              aria-describedby="maxTokens-hint"
              className={invalid("maxTokens")}
            />
            <FieldError message={errorText("maxTokens")} />
            <p id="maxTokens-hint" className="mt-1.5 text-xs text-muted">
              {t("companion.maxTokensHint")}
            </p>
          </div>
        </div>
      </Card>

      {/* Reminders */}
      <Card className="p-5 sm:p-6">
        <SectionTitle hint={t("companion.remindersHint")}>{t("companion.reminders")}</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          {(["sedentaryMinutes", "hydrationMinutes"] as const).map((key) => (
            <div key={key}>
              <Label htmlFor={key}>{t(key === "sedentaryMinutes" ? "companion.sedentary" : "companion.hydration")}</Label>
              <div className="relative">
                <Input
                  id={key}
                  name={key}
                  type="number"
                  min={0}
                  max={key === "sedentaryMinutes" ? 240 : 480}
                  step={5}
                  value={v[key]}
                  onChange={set(key)}
                  className={cn("pr-14", invalid(key))}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
                  {t("companion.minutes")}
                </span>
              </div>
              <FieldError message={errorText(key)} />
            </div>
          ))}
          {(
            [
              ["workHours", "workStart", "workEnd", null],
              ["quietHours", "quietStart", "quietEnd", "companion.quietHint"],
            ] as const
          ).map(([label, from, to, hint]) => (
            <fieldset key={label}>
              <legend className="mb-1.5 text-sm font-medium text-fg/90">{t(`companion.${label}`)}</legend>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  name={from}
                  aria-label={`${t(`companion.${label}`)} ${t("companion.from")}`}
                  value={v[from]}
                  onChange={set(from)}
                  className={invalid(from)}
                />
                <span className="text-faint" aria-hidden>
                  –
                </span>
                <Input
                  type="time"
                  name={to}
                  aria-label={`${t(`companion.${label}`)} ${t("companion.to")}`}
                  value={v[to]}
                  onChange={set(to)}
                  className={invalid(to)}
                />
              </div>
              <FieldError message={errorText(from) ?? errorText(to)} />
              {hint && <p className="mt-1.5 text-xs text-muted">{t(hint)}</p>}
            </fieldset>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="timezone">{t("companion.timezone")}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="timezone"
                name="timezone"
                list="tz-list"
                value={v.timezone}
                onChange={set("timezone")}
                placeholder="Asia/Shanghai"
                autoComplete="off"
                className={invalid("timezone")}
              />
              {browserTz && browserTz !== v.timezone && (
                <Button variant="secondary" className="shrink-0" onClick={() => setV((p) => ({ ...p, timezone: browserTz }))}>
                  {t("companion.timezoneUse", { tz: browserTz })}
                </Button>
              )}
            </div>
            <datalist id="tz-list">
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <FieldError message={errorText("timezone")} />
            <p className="mt-1.5 text-xs text-muted">{t("companion.timezoneHint")}</p>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-line bg-surface/90 p-3 backdrop-blur">
        <p role="status" aria-live="polite" className="mr-auto pl-2 text-sm">
          {optimistic.ok === true && (
            <span key={optimistic.at} className="inline-flex items-center gap-1.5 text-leaf-200">
              <Check className="h-4 w-4" aria-hidden /> {t("companion.saved")}
            </span>
          )}
          {optimistic.ok === false && <span className="text-rose">{t("companion.error")}</span>}
        </p>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? t("companion.saving") : t("companion.save")}
        </Button>
      </div>
    </form>
  );
}
