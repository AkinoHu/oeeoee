import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const { devPasswordLoginEnabled, isLoopbackUrl } = await import("./auth");

afterEach(() => vi.unstubAllEnvs());

function env(vars: Record<string, string>) {
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
}

describe("devPasswordLoginEnabled", () => {
  it("is off unless AUTH_DEV_PASSWORD_LOGIN=true", () => {
    env({ NODE_ENV: "development", AUTH_DEV_PASSWORD_LOGIN: "" });
    expect(devPasswordLoginEnabled()).toBe(false);
  });

  it("is on in development when the flag is set", () => {
    env({ NODE_ENV: "development", AUTH_DEV_PASSWORD_LOGIN: "true", NEXT_PUBLIC_APP_URL: "https://oeeoee.com" });
    expect(devPasswordLoginEnabled()).toBe(true);
  });

  it("can't be switched on for a public production deployment", () => {
    env({ NODE_ENV: "production", AUTH_DEV_PASSWORD_LOGIN: "true", NEXT_PUBLIC_APP_URL: "https://oeeoee.com" });
    expect(devPasswordLoginEnabled()).toBe(false);
    env({ NEXT_PUBLIC_APP_URL: "https://oeeoee.com", BETTER_AUTH_URL: "http://localhost:3000" });
    expect(devPasswordLoginEnabled()).toBe(false);
  });

  it("stays off in production when the app URL is only the localhost fallback", () => {
    env({ NODE_ENV: "production", AUTH_DEV_PASSWORD_LOGIN: "true", NEXT_PUBLIC_APP_URL: "", BETTER_AUTH_URL: " " });
    expect(devPasswordLoginEnabled()).toBe(false);
  });

  it("allows a local production build (e2e) whose URL is explicitly localhost", () => {
    env({ NODE_ENV: "production", AUTH_DEV_PASSWORD_LOGIN: "true", NEXT_PUBLIC_APP_URL: "", BETTER_AUTH_URL: "http://localhost:3000" });
    expect(devPasswordLoginEnabled()).toBe(true);
  });
});

describe("isLoopbackUrl", () => {
  it.each([
    ["http://localhost:3000", true],
    ["http://127.0.0.1:8080/x", true],
    ["http://[::1]:3000", true],
    ["https://oeeoee.com", false],
    ["https://localhost.evil.com", false],
    ["http://127.0.0.1.nip.io", false],
    ["not a url", false],
  ])("%s → %s", (url, expected) => {
    expect(isLoopbackUrl(url)).toBe(expected);
  });
});
