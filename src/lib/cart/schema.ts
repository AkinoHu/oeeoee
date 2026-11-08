import { z } from "zod";
import { locales } from "@/i18n/config";
import { MAX_LINE_QTY, MAX_LINES, MIN_LINE_QTY } from "./types";

const id = z.string().trim().min(1).max(64);

export const cartLineSchema = z.object({
  potSku: id,
  finish: id,
  plantId: id.nullable(),
  previewPlantId: id.nullable().optional(),
  quantity: z.number().int().min(MIN_LINE_QTY).max(MAX_LINE_QTY),
});

export const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/)
  .transform((v) => v.toUpperCase());

export const cartStateSchema = z.object({
  countryCode: countryCodeSchema.nullable(),
  lines: z.array(z.unknown()).max(MAX_LINES * 2),
});

export const checkoutRequestSchema = z.object({
  countryCode: countryCodeSchema,
  lines: z.array(cartLineSchema).min(1).max(MAX_LINES),
  locale: z.enum(locales).catch("en"),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const waitlistRequestSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  countryCode: countryCodeSchema,
  locale: z.enum(locales).optional(),
  /** Honeypot: real people never fill this hidden field. */
  website: z.string().max(200).optional(),
});
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
