import { describe, expect, it } from "vitest";
import {
  APPLICATION_FIELDS,
  applicationRef,
  normalizeWebsite,
  readApplicationForm,
  validateApplication,
  type ApplicationValues,
} from "./application";

const valid: ApplicationValues = {
  company: "Green Leaf Nursery",
  contactName: "Alex Morgan",
  email: "Alex@Nursery.com",
  countryCode: "us",
  businessType: "nursery",
  consent: "on",
};

describe("normalizeWebsite", () => {
  it("adds https:// and drops a bare trailing slash", () => {
    expect(normalizeWebsite("nursery.com")).toBe("https://nursery.com");
    expect(normalizeWebsite("www.nursery.co.uk/")).toBe("https://www.nursery.co.uk");
    expect(normalizeWebsite("http://shop.nursery.com/plants?x=1")).toBe("http://shop.nursery.com/plants?x=1");
  });

  it("accepts internationalised domains", () => {
    expect(normalizeWebsite("植物.中国")).not.toBeNull();
  });

  it("rejects non-web schemes, credentials and junk", () => {
    expect(normalizeWebsite("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsite("ftp://nursery.com")).toBeNull();
    expect(normalizeWebsite("https://user:pass@nursery.com")).toBeNull();
    expect(normalizeWebsite("not a url")).toBeNull();
    expect(normalizeWebsite("localhost")).toBeNull();
    expect(normalizeWebsite("")).toBeNull();
  });
});

describe("readApplicationForm", () => {
  it("trims values, drops blanks and ignores unknown fields", () => {
    const fd = new FormData();
    fd.set("company", "  Leafy Co  ");
    fd.set("city", "   ");
    fd.set("unknown", "x");
    fd.set("url", "bot");
    expect(readApplicationForm(fd)).toEqual({ company: "Leafy Co" });
  });

  it("only reads the declared fields", () => {
    const fd = new FormData();
    for (const f of APPLICATION_FIELDS) fd.set(f, "v");
    expect(Object.keys(readApplicationForm(fd)).sort()).toEqual([...APPLICATION_FIELDS].sort());
  });
});

describe("validateApplication", () => {
  it("accepts a minimal valid application and normalises it", () => {
    const result = validateApplication(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.email).toBe("alex@nursery.com");
    expect(result.data.countryCode).toBe("US");
    expect(result.data.website).toBeUndefined();
  });

  it("accepts all optional fields", () => {
    const result = validateApplication({
      ...valid,
      phone: "+1 (555) 010-0200",
      city: "Portland",
      website: "nursery.com",
      monthlyCapacity: "100-500",
      speciesNotes: "Pothos, Monstera",
      message: "Hello",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.website).toBe("https://nursery.com");
  });

  it("reports required fields with i18n keys", () => {
    const result = validateApplication({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toEqual({
      company: "form.error.required",
      contactName: "form.error.required",
      email: "form.error.required",
      countryCode: "form.error.country",
      businessType: "form.error.businessType",
      consent: "form.error.consent",
    });
  });

  it("flags malformed values", () => {
    const result = validateApplication({
      ...valid,
      company: "A",
      email: "nope",
      phone: "call me",
      website: "javascript:alert(1)",
      countryCode: "ZZ",
      businessType: "farmer",
      monthlyCapacity: "lots",
      message: "x".repeat(4001),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toMatchObject({
      company: "form.error.tooShort",
      email: "form.error.email",
      phone: "form.error.phone",
      website: "form.error.url",
      countryCode: "form.error.country",
      businessType: "form.error.businessType",
      monthlyCapacity: "form.error.capacity",
      message: "form.error.tooLong",
    });
  });

  it("requires consent to be exactly checked", () => {
    const result = validateApplication({ ...valid, consent: "yes" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.consent).toBe("form.error.consent");
  });
});

describe("applicationRef", () => {
  it("derives a short upper-case reference", () => {
    expect(applicationRef("clx1abc2def3ghi4jkl5")).toBe("PA-GHI4JKL5");
  });
});
