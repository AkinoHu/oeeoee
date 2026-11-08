import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, features } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("appUrl", () => {
  it("uses NEXT_PUBLIC_APP_URL without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://oeeoee.com/");
    expect(appUrl()).toBe("https://oeeoee.com");
  });

  it("treats empty values as unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "  ");
    vi.stubEnv("BETTER_AUTH_URL", "https://auth.example.com");
    expect(appUrl()).toBe("https://auth.example.com");
  });

  it("falls back to the Railway domain, then localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "oeeoee.up.railway.app");
    expect(appUrl()).toBe("https://oeeoee.up.railway.app");
    vi.stubEnv("RAILWAY_PUBLIC_DOMAIN", "");
    expect(appUrl()).toBe("http://localhost:3000");
  });
});

describe("features", () => {
  it("reflects the environment at call time", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(features.stripe).toBe(false);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(features.stripe).toBe(true);
  });

  it("needs both Google credentials", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(features.google).toBe(false);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(features.google).toBe(true);
  });
});
