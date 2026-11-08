import type { MessageKey } from "@/i18n/messages";

/**
 * Partner application field names, option lists and form state. Client-safe
 * (no zod, no catalog) so the form component can import it cheaply.
 */

/** Inbox for partnership enquiries, shown on the page and in error messages. */
export const PARTNERS_EMAIL = "partners@oeeoee.com";

export const BUSINESS_TYPES = ["nursery", "grower", "florist", "distributor", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** Monthly capacity buckets (plants per month). Stored as-is in `monthlyCapacity`. */
export const CAPACITY_OPTIONS = ["lt100", "100-500", "500-2000", "gt2000"] as const;
export type Capacity = (typeof CAPACITY_OPTIONS)[number];

export const APPLICATION_FIELDS = [
  "company",
  "contactName",
  "email",
  "phone",
  "countryCode",
  "city",
  "website",
  "businessType",
  "monthlyCapacity",
  "speciesNotes",
  "message",
  "consent",
] as const;
export type ApplicationField = (typeof APPLICATION_FIELDS)[number];

/** Hidden trap field. Humans never see it; naive bots fill every input. */
export const HONEYPOT_FIELD = "url";

type PartnersKey = MessageKey<"partners">;

export const FORM_ERRORS = {
  required: "form.error.required",
  tooShort: "form.error.tooShort",
  tooLong: "form.error.tooLong",
  email: "form.error.email",
  phone: "form.error.phone",
  url: "form.error.url",
  country: "form.error.country",
  businessType: "form.error.businessType",
  capacity: "form.error.capacity",
  consent: "form.error.consent",
  summary: "form.error.summary",
  rateLimited: "form.error.rateLimited",
  server: "form.error.server",
} as const satisfies Record<string, PartnersKey>;

export type FormErrorKey = (typeof FORM_ERRORS)[keyof typeof FORM_ERRORS];

export type ApplicationValues = Partial<Record<ApplicationField, string>>;

export type ApplicationFormState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: Partial<Record<ApplicationField, FormErrorKey>>;
      formError: FormErrorKey;
      values: ApplicationValues;
    }
  | {
      status: "success";
      /** Short human-friendly reference shown to the applicant. */
      ref: string;
      contactName: string;
      company: string;
      email: string;
    };

export const initialApplicationState: ApplicationFormState = { status: "idle" };
