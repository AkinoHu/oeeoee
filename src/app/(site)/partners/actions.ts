"use server";

import { headers } from "next/headers";
import {
  FORM_ERRORS,
  HONEYPOT_FIELD,
  applicationRef,
  readApplicationForm,
  validateApplication,
  type ApplicationFormState,
} from "@/components/partners/application";
import { clientIp, createRateLimiter, type RateLimiter } from "@/components/partners/rate-limit";
import { prisma } from "@/lib/db";

/** 5 saved applications per IP per 15 minutes. Kept on globalThis to survive dev HMR. */
const store = globalThis as unknown as { __partnerApplicationLimiter?: RateLimiter };
const limiter = (store.__partnerApplicationLimiter ??= createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 }));

export async function submitPartnerApplication(
  _prev: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const values = readApplicationForm(formData);

  // Honeypot: pretend everything went fine so bots don't retry, but store nothing.
  const trap = formData.get(HONEYPOT_FIELD);
  if (typeof trap === "string" && trap.trim() !== "") {
    return {
      status: "success",
      ref: applicationRef(crypto.randomUUID().replace(/-/g, "")),
      contactName: values.contactName ?? "",
      company: values.company ?? "",
      email: values.email ?? "",
    };
  }

  const result = validateApplication(values);
  if (!result.ok) {
    return { status: "error", fieldErrors: result.fieldErrors, formError: FORM_ERRORS.summary, values };
  }

  if (!limiter.hit(clientIp(await headers())).ok) {
    return { status: "error", fieldErrors: {}, formError: FORM_ERRORS.rateLimited, values };
  }

  const data = result.data;
  try {
    const row = await prisma.partnerApplication.create({
      data: {
        company: data.company,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone ?? null,
        countryCode: data.countryCode,
        city: data.city ?? null,
        website: data.website ?? null,
        businessType: data.businessType,
        speciesNotes: data.speciesNotes ?? null,
        monthlyCapacity: data.monthlyCapacity ?? null,
        message: data.message ?? null,
      },
      select: { id: true },
    });
    return {
      status: "success",
      ref: applicationRef(row.id),
      contactName: data.contactName,
      company: data.company,
      email: data.email,
    };
  } catch (error) {
    console.error("[partners] failed to save application", error);
    return { status: "error", fieldErrors: {}, formError: FORM_ERRORS.server, values };
  }
}
