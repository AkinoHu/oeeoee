import { z } from "zod";
import { getCountry } from "@/data";
import {
  APPLICATION_FIELDS,
  BUSINESS_TYPES,
  CAPACITY_OPTIONS,
  FORM_ERRORS,
  type ApplicationField,
  type ApplicationValues,
  type FormErrorKey,
} from "./application-fields";

export * from "./application-fields";

/*
 * Partner application validation (zod). Used by the server action and tests;
 * pure, no server-only imports.
 */

/**
 * Accepts "nursery.com", "www.nursery.com/shop" or a full http(s) URL and
 * returns a normalised absolute URL, or null when it isn't a plausible website.
 */
export function normalizeWebsite(input: string): string | null {
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  // Require a dotted hostname whose TLD is letters (or punycode for IDNs) — no IPs / localhost.
  if (!/^[^.]+(\.[^.]+)*\.(?:[a-z]{2,}|xn--[a-z\d-]+)$/i.test(url.hostname)) return null;
  const out = url.toString();
  return url.pathname === "/" && !url.search && !url.hash ? out.replace(/\/$/, "") : out;
}

const PHONE_RE = /^\+?[\d\s().-]{5,30}$/;

const requiredText = (max: number) =>
  z
    .string({ error: FORM_ERRORS.required })
    .min(2, { error: FORM_ERRORS.tooShort })
    .max(max, { error: FORM_ERRORS.tooLong });

const optionalText = (max: number) => z.string().max(max, { error: FORM_ERRORS.tooLong }).optional();

export const applicationSchema = z.object({
  company: requiredText(120),
  contactName: requiredText(120),
  email: z
    .email({ error: (issue) => (issue.input === undefined ? FORM_ERRORS.required : FORM_ERRORS.email) })
    .max(200, { error: FORM_ERRORS.tooLong })
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .max(40, { error: FORM_ERRORS.tooLong })
    .refine((v) => PHONE_RE.test(v) && (v.match(/\d/g)?.length ?? 0) >= 5, { error: FORM_ERRORS.phone })
    .optional(),
  countryCode: z
    .string({ error: FORM_ERRORS.country })
    .toUpperCase()
    .refine((code) => getCountry(code) !== undefined, { error: FORM_ERRORS.country }),
  city: optionalText(120),
  website: z
    .string()
    .max(300, { error: FORM_ERRORS.tooLong })
    .refine((v) => normalizeWebsite(v) !== null, { error: FORM_ERRORS.url })
    .transform((v) => normalizeWebsite(v) as string)
    .optional(),
  businessType: z.enum(BUSINESS_TYPES, { error: FORM_ERRORS.businessType }),
  monthlyCapacity: z.enum(CAPACITY_OPTIONS, { error: FORM_ERRORS.capacity }).optional(),
  speciesNotes: optionalText(2000),
  message: optionalText(4000),
  consent: z.literal("on", { error: FORM_ERRORS.consent }),
});

export type ApplicationInput = z.output<typeof applicationSchema>;

/**
 * Reads the known fields from FormData: trims strings and turns blanks into
 * undefined. Drops NUL characters, which Postgres rejects in text columns.
 */
export function readApplicationForm(formData: FormData): ApplicationValues {
  const values: ApplicationValues = {};
  for (const field of APPLICATION_FIELDS) {
    const value = formData.get(field);
    if (typeof value !== "string") continue;
    const trimmed = value.replaceAll("\0", "").trim();
    if (trimmed) values[field] = trimmed;
  }
  return values;
}

export type ValidationResult =
  | { ok: true; data: ApplicationInput }
  | { ok: false; fieldErrors: Partial<Record<ApplicationField, FormErrorKey>> };

export function validateApplication(values: ApplicationValues): ValidationResult {
  const result = applicationSchema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<ApplicationField, FormErrorKey>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || !(APPLICATION_FIELDS as readonly string[]).includes(field)) continue;
    const key = field as ApplicationField;
    if (fieldErrors[key]) continue;
    const message = Object.values(FORM_ERRORS).includes(issue.message as FormErrorKey)
      ? (issue.message as FormErrorKey)
      : FORM_ERRORS.required;
    fieldErrors[key] = message;
  }
  return { ok: false, fieldErrors };
}

/** Short reference derived from the row id, e.g. "PA-7K2M9QXD". */
export function applicationRef(id: string): string {
  return `PA-${id.slice(-8).toUpperCase()}`;
}
