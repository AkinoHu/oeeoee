import { describe, expect, it } from "vitest";
import { assessVitals } from "@/lib/vitals";
import { buildClaudeRequest, normalizeBrainOutput, supportsServerFallback, THINKING_HEADROOM_TOKENS, withServerFallback } from "./claude-request";
import type { BrainContext } from "./prompt";
import { DEFAULT_REMINDERS } from "./settings";

const NOW = new Date("2026-06-01T14:00:00Z");
const ctx: BrainContext = {
  companion: { name: "Sprout", persona: "", language: "auto", temperature: 0.8 },
  plant: { name: "Golden Pothos", scientificName: "Epipremnum aureum", personality: "Easy-going." },
  device: { name: "Desk pot" },
  vitals: assessVitals(null, { recordedAt: NOW, soilMoisture: 40 }, NOW, { timeZone: "UTC" }),
  memories: [],
  reminders: DEFAULT_REMINDERS,
  now: NOW,
  timeZone: "UTC",
  channel: "device",
};

describe("Claude request", () => {
  const req = buildClaudeRequest(
    ctx,
    "claude-haiku-5-5",
    400,
    [
      { role: "assistant", content: "orphan greeting" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello!" },
    ],
    "How are you?",
  );

  it("uses the companion's model and reply budget plus thinking headroom", () => {
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req.max_tokens).toBe(400 + THINKING_HEADROOM_TOKENS);
  });

  it("never sends sampling parameters or a thinking budget", () => {
    expect(req).not.toHaveProperty("temperature");
    expect(req).not.toHaveProperty("top_p");
    expect(req).not.toHaveProperty("top_k");
    expect(req).not.toHaveProperty("thinking");
    expect(req.output_config.effort).toBe("low");
  });

  it("asks for structured output with the expression enum", () => {
    const format = req.output_config.format as unknown as {
      type: string;
      schema: { required: string[]; properties: Record<string, { description?: string }> };
    };
    expect(format.type).toBe("json_schema");
    expect(format.schema.required).toEqual(["reply", "expression", "memory"]);
    expect(format.schema.properties.expression.description).toContain("thirsty");
  });

  it("starts with a user turn and ends with the new message", () => {
    expect(req.messages[0]).toEqual({ role: "user", content: "hi" });
    expect(req.messages.at(-1)).toEqual({ role: "user", content: "How are you?" });
    expect(req.system).toHaveLength(2);
    expect(req.system[1].text).toContain("## Your vital signs");
  });

  it("adds server-side fallbacks only for Opus / Sonnet", () => {
    expect(supportsServerFallback("claude-haiku-5-5")).toBe(false);
    expect(supportsServerFallback("claude-sonnet-5-5")).toBe(true);
    expect(supportsServerFallback("claude-opus-5-5")).toBe(true);
    expect(withServerFallback({ model: "claude-opus-5-5" })).toEqual({
      model: "claude-opus-5-5",
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  });

  it("normalizes the model's output defensively", () => {
    expect(normalizeBrainOutput({ reply: " Hi! ", expression: "Happy", memory: null })).toEqual({ reply: "Hi!", expression: "happy", memory: null });
    expect(normalizeBrainOutput({ reply: "Hi", expression: "smug", memory: null })?.expression).toBe("neutral");
    expect(
      normalizeBrainOutput({ reply: "Ok", expression: "love", memory: { kind: "preference", content: " Likes tea ", importance: 9.4 } })?.memory,
    ).toEqual({ kind: "PREFERENCE", content: "Likes tea", importance: 5 });
    expect(normalizeBrainOutput({ reply: "Ok", expression: "love", memory: { kind: "SECRET", content: "x", importance: 3 } })?.memory).toBeNull();
    expect(normalizeBrainOutput({ reply: "  ", expression: "happy", memory: null })).toBeNull();
    expect(normalizeBrainOutput(null)).toBeNull();
  });
});
