import { describe, expect, it } from "vitest";
import {
  countryFromTimeZone,
  guessCountryFromHeaders,
  normalizeCountryCode,
  parseAcceptLanguage,
  refineGuess,
  regionFromAcceptLanguage,
} from "./geo";

describe("normalizeCountryCode", () => {
  it("upper-cases and validates", () => {
    expect(normalizeCountryCode(" jp ")).toBe("JP");
    expect(normalizeCountryCode("USA")).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
  });

  it("drops CDN pseudo codes and maps aliases", () => {
    expect(normalizeCountryCode("XX")).toBeNull();
    expect(normalizeCountryCode("T1")).toBeNull();
    expect(normalizeCountryCode("uk")).toBe("GB");
  });
});

describe("parseAcceptLanguage", () => {
  it("sorts by quality and keeps header order for ties", () => {
    expect(parseAcceptLanguage("en;q=0.5, ja-JP, ja;q=0.9, fr;q=0")).toEqual([
      { tag: "ja-JP", q: 1 },
      { tag: "ja", q: 0.9 },
      { tag: "en", q: 0.5 },
    ]);
  });

  it("ignores empty input and wildcards", () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("*")).toEqual([]);
  });
});

describe("regionFromAcceptLanguage", () => {
  it("reads the region subtag of the preferred language", () => {
    expect(regionFromAcceptLanguage("ja-JP,ja;q=0.9,en-US;q=0.8")).toBe("JP");
    expect(regionFromAcceptLanguage("en,de-AT;q=0.5")).toBe("AT");
  });

  it("skips script subtags and numeric regions", () => {
    expect(regionFromAcceptLanguage("zh-Hans-CN")).toBe("CN");
    expect(regionFromAcceptLanguage("es-419,es-MX;q=0.8")).toBe("MX");
    expect(regionFromAcceptLanguage("en_gb")).toBe("GB");
  });

  it("returns null without a region", () => {
    expect(regionFromAcceptLanguage("en, fr;q=0.8")).toBeNull();
    expect(regionFromAcceptLanguage("de-x-ch")).toBeNull();
    expect(regionFromAcceptLanguage(undefined)).toBeNull();
  });
});

describe("guessCountryFromHeaders", () => {
  it("prefers CDN country headers over language", () => {
    const h = new Headers({ "cf-ipcountry": "de", "accept-language": "ja-JP" });
    expect(guessCountryFromHeaders(h)).toEqual({ country: "DE", source: "ip" });
  });

  it("checks headers in priority order and skips junk values", () => {
    const h = new Headers({ "cf-ipcountry": "XX", "x-vercel-ip-country": "SG" });
    expect(guessCountryFromHeaders(h)).toEqual({ country: "SG", source: "ip" });
    expect(guessCountryFromHeaders(new Headers({ "x-country-code": "kr" }))).toEqual({ country: "KR", source: "ip" });
  });

  it("maps Fly.io edge regions", () => {
    expect(guessCountryFromHeaders(new Headers({ "fly-region": "nrt" }))).toEqual({ country: "JP", source: "ip" });
    expect(guessCountryFromHeaders(new Headers({ "fly-region": "zzz" }))).toBeNull();
  });

  it("falls back to the Accept-Language region", () => {
    const h = new Headers({ "accept-language": "zh-CN,zh;q=0.9,en;q=0.8" });
    expect(guessCountryFromHeaders(h)).toEqual({ country: "CN", source: "language" });
  });

  it("accepts plain header records (case-insensitive)", () => {
    expect(guessCountryFromHeaders({ "CF-IPCountry": "us" })).toEqual({ country: "US", source: "ip" });
    expect(guessCountryFromHeaders({ "accept-language": ["ja-JP"] })).toEqual({ country: "JP", source: "language" });
  });

  it("returns null when nothing is known", () => {
    expect(guessCountryFromHeaders(new Headers())).toBeNull();
    expect(guessCountryFromHeaders(new Headers({ "accept-language": "en" }))).toBeNull();
  });
});

describe("countryFromTimeZone", () => {
  it("maps canonical and legacy zone names", () => {
    expect(countryFromTimeZone("Asia/Tokyo")).toBe("JP");
    expect(countryFromTimeZone("Asia/Shanghai")).toBe("CN");
    expect(countryFromTimeZone("America/Los_Angeles")).toBe("US");
    expect(countryFromTimeZone("Asia/Calcutta")).toBe("IN");
    expect(countryFromTimeZone("Europe/Kiev")).toBe("UA");
    expect(countryFromTimeZone("Asia/Singapore")).toBe("SG");
  });

  it("returns null for UTC, unknown and empty zones", () => {
    expect(countryFromTimeZone("UTC")).toBeNull();
    expect(countryFromTimeZone("Etc/GMT+3")).toBeNull();
    expect(countryFromTimeZone("Mars/Olympus_Mons")).toBeNull();
    expect(countryFromTimeZone(undefined)).toBeNull();
  });
});

describe("refineGuess", () => {
  it("keeps IP-based guesses", () => {
    expect(refineGuess({ country: "DE", source: "ip" }, "Asia/Tokyo")).toEqual({ country: "DE", source: "ip" });
  });

  it("lets the time zone beat Accept-Language", () => {
    expect(refineGuess({ country: "US", source: "language" }, "Asia/Tokyo")).toEqual({
      country: "JP",
      source: "timezone",
    });
  });

  it("falls back to the server guess or null", () => {
    expect(refineGuess({ country: "US", source: "language" }, "UTC")).toEqual({ country: "US", source: "language" });
    expect(refineGuess(null, "Europe/Paris")).toEqual({ country: "FR", source: "timezone" });
    expect(refineGuess(null, null)).toBeNull();
  });
});
