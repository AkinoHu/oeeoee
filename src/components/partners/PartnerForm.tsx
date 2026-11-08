"use client";

import { Building2, Check, CircleAlert, Flower2, LoaderCircle, Sprout, Store, Truck, type LucideIcon } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { submitPartnerApplication } from "@/app/(site)/partners/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  BUSINESS_TYPES,
  CAPACITY_OPTIONS,
  HONEYPOT_FIELD,
  initialApplicationState,
  type ApplicationField,
  type ApplicationFormState,
  type BusinessType,
} from "./application-fields";

export interface CountryOptionGroup {
  label: string;
  options: { code: string; name: string }[];
}

const BUSINESS_ICONS: Record<BusinessType, LucideIcon> = {
  nursery: Sprout,
  grower: Flower2,
  florist: Store,
  distributor: Truck,
  other: Building2,
};

const invalidField = "border-rose/60 focus:border-rose/70 focus:ring-rose/20";

/** Public partner application form. Validation happens on the server (zod). */
export function PartnerForm({
  countryGroups,
  defaultCountry,
}: {
  countryGroups: CountryOptionGroup[];
  defaultCountry?: string;
}) {
  const t = useT("partners");
  const [state, formAction, pending] = useActionState(submitPartnerApplication, initialApplicationState);
  const [dismissedRef, setDismissedRef] = useState<string | null>(null);
  // Fields the user has edited since the last response: their stale error is hidden.
  const [edited, setEdited] = useState<{ for: ApplicationFormState; names: Set<string> }>({
    for: state,
    names: new Set(),
  });
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      (firstInvalid ?? summaryRef.current)?.focus();
    } else if (state.status === "success") {
      successRef.current?.focus();
    }
  }, [state]);

  if (state.status === "success" && dismissedRef !== state.ref) {
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          ref={successRef}
          tabIndex={-1}
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center px-2 py-10 text-center outline-none sm:py-14"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-300/15 text-leaf-300 ring-1 ring-leaf-300/30 shadow-glow">
            <Check className="h-8 w-8" aria-hidden />
          </span>
          <h3 className="mt-6 text-2xl font-semibold tracking-tight">{t("form.success.title")}</h3>
          <p className="mt-3 max-w-md text-pretty text-muted">
            {t("form.success.body", { name: state.contactName, company: state.company, email: state.email })}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-1.5 text-sm">
            <span className="text-muted">{t("form.success.ref")}</span>
            <span className="font-mono font-medium tracking-wide text-leaf-200">{state.ref}</span>
          </p>
          <Button variant="ghost" className="mt-6" onClick={() => setDismissedRef(state.ref)}>
            {t("form.success.again")}
          </Button>
        </motion.div>
      </MotionConfig>
    );
  }

  const values = state.status === "error" ? state.values : {};
  const editedNames = edited.for === state ? edited.names : new Set<string>();
  const errorFor = (field: ApplicationField) =>
    state.status === "error" && !editedNames.has(field) ? state.fieldErrors[field] : undefined;

  const fieldProps = (field: ApplicationField) => {
    const error = errorFor(field);
    return {
      id: `pa-${field}`,
      name: field,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `pa-${field}-error` : undefined,
      className: error ? invalidField : undefined,
    };
  };

  const fieldError = (field: ApplicationField) => {
    const error = errorFor(field);
    if (!error) return null;
    return (
      <p id={`pa-${field}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs text-rose">
        <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t(error)}
      </p>
    );
  };

  const label = (field: ApplicationField, text: string, optional = false) => (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <Label htmlFor={`pa-${field}`} className="mb-0">
        {text}
        {!optional && (
          <span className="ml-0.5 text-leaf-300" aria-hidden>
            *
          </span>
        )}
      </Label>
      {optional && <span className="text-xs text-faint">{t("form.optional")}</span>}
    </div>
  );

  const typeError = errorFor("businessType");
  const consentError = errorFor("consent");
  const formError = state.status === "error" ? state.formError : null;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={(event) => {
        // Submit in a transition ourselves so React doesn't reset the fields.
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      onChange={(event) => {
        const name = (event.target as EventTarget & { name?: unknown }).name;
        if (typeof name !== "string") return;
        if (!name || state.status !== "error" || !state.fieldErrors[name as ApplicationField]) return;
        setEdited((prev) => ({ for: state, names: new Set(prev.for === state ? prev.names : []).add(name) }));
      }}
      className="relative space-y-8"
      aria-busy={pending}
    >
      {/* Honeypot: invisible to people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="pa-hp">{t("form.honeypot")}</label>
        <input id="pa-hp" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <fieldset className="space-y-4">
        <legend className="eyebrow mb-4">{t("form.section.business")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {label("company", t("form.company"))}
            <Input
              {...fieldProps("company")}
              autoComplete="organization"
              placeholder={t("form.company.placeholder")}
              defaultValue={values.company}
              required
              maxLength={120}
            />
            {fieldError("company")}
          </div>
          <div>
            {label("website", t("form.website"), true)}
            <Input
              {...fieldProps("website")}
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder={t("form.website.placeholder")}
              defaultValue={values.website}
              maxLength={300}
            />
            {fieldError("website")}
          </div>
          <div>
            {label("countryCode", t("form.country"))}
            <Select
              {...fieldProps("countryCode")}
              defaultValue={values.countryCode ?? defaultCountry ?? ""}
              required
              className={cn(errorFor("countryCode") && invalidField)}
            >
              <option value="" disabled>
                {t("form.country.placeholder")}
              </option>
              {countryGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {fieldError("countryCode")}
          </div>
          <div>
            {label("city", t("form.city"), true)}
            <Input
              {...fieldProps("city")}
              autoComplete="address-level2"
              placeholder={t("form.city.placeholder")}
              defaultValue={values.city}
              maxLength={120}
            />
            {fieldError("city")}
          </div>
        </div>

        <fieldset aria-describedby={typeError ? "pa-businessType-error" : undefined}>
          <legend className="mb-2 text-sm font-medium text-fg/90">
            {t("form.businessType")}
            <span className="ml-0.5 text-leaf-300" aria-hidden>
              *
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((type) => {
              const Icon = BUSINESS_ICONS[type];
              return (
                <label key={type} className="relative">
                  <input
                    type="radio"
                    name="businessType"
                    value={type}
                    defaultChecked={values.businessType === type}
                    data-invalid={typeError ? true : undefined}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-surface-2 px-3.5 text-sm text-muted transition",
                      "hover:border-line-strong hover:text-fg",
                      "peer-checked:border-leaf-300/60 peer-checked:bg-leaf-300/10 peer-checked:text-leaf-200",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf-300",
                      typeError ? "border-rose/50" : "border-line",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {t(`business.${type}`)}
                  </span>
                </label>
              );
            })}
          </div>
          {fieldError("businessType")}
        </fieldset>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="eyebrow mb-4">{t("form.section.contact")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {label("contactName", t("form.contactName"))}
            <Input
              {...fieldProps("contactName")}
              autoComplete="name"
              placeholder={t("form.contactName.placeholder")}
              defaultValue={values.contactName}
              required
              maxLength={120}
            />
            {fieldError("contactName")}
          </div>
          <div>
            {label("email", t("form.email"))}
            <Input
              {...fieldProps("email")}
              type="email"
              autoComplete="email"
              placeholder={t("form.email.placeholder")}
              defaultValue={values.email}
              required
              maxLength={200}
            />
            {fieldError("email")}
          </div>
          <div>
            {label("phone", t("form.phone"), true)}
            <Input
              {...fieldProps("phone")}
              type="tel"
              autoComplete="tel"
              placeholder={t("form.phone.placeholder")}
              defaultValue={values.phone}
              maxLength={40}
            />
            {fieldError("phone")}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="eyebrow mb-4">{t("form.section.supply")}</legend>
        <div>
          {label("monthlyCapacity", t("form.capacity"), true)}
          <Select
            {...fieldProps("monthlyCapacity")}
            defaultValue={values.monthlyCapacity ?? ""}
            className={cn("sm:max-w-xs", errorFor("monthlyCapacity") && invalidField)}
          >
            <option value="">{t("form.capacity.placeholder")}</option>
            {CAPACITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`capacity.${option}`)}
              </option>
            ))}
          </Select>
          {fieldError("monthlyCapacity")}
        </div>
        <div>
          {label("speciesNotes", t("form.species"), true)}
          <Textarea
            {...fieldProps("speciesNotes")}
            rows={3}
            placeholder={t("form.species.placeholder")}
            defaultValue={values.speciesNotes}
            maxLength={2000}
          />
          {fieldError("speciesNotes")}
        </div>
        <div>
          {label("message", t("form.message"), true)}
          <Textarea
            {...fieldProps("message")}
            rows={4}
            placeholder={t("form.message.placeholder")}
            defaultValue={values.message}
            maxLength={4000}
          />
          {fieldError("message")}
        </div>
      </fieldset>

      <div className="space-y-5 border-t border-line pt-6">
        <div>
          <label htmlFor="pa-consent" className="flex cursor-pointer items-start gap-3 text-sm text-muted">
            <input
              id="pa-consent"
              type="checkbox"
              name="consent"
              defaultChecked={values.consent === "on"}
              aria-invalid={consentError ? true : undefined}
              aria-describedby={consentError ? "pa-consent-error" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-leaf-300"
            />
            <span>{t("form.consent")}</span>
          </label>
          {fieldError("consent")}
        </div>

        {formError && (
          <p
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose outline-none"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t(formError)}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> {t("form.submitting")}
            </>
          ) : (
            t("form.submit")
          )}
        </Button>
      </div>
    </form>
  );
}
