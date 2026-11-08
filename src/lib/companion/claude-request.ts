/**
 * Builds the Claude Messages request for one companion turn. Pure, so the
 * request shape is unit-tested without calling the API.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { isExpression } from "@/components/companion-face/types";
import type { FallbackOutput } from "./fallback";
import { buildDynamicPrompt, buildStaticPrompt, type BrainContext } from "./prompt";
import { brainOutputSchema, type BrainOutput } from "./schemas";
import { MEMORY_KINDS, type MemoryKindValue } from "./settings";

/** Thinking counts toward max_tokens on current models; leave room on top of the reply budget. */
export const THINKING_HEADROOM_TOKENS = 1024;

export type HistoryTurn = { role: "user" | "assistant"; content: string };

/** Opus / Sonnet run safety classifiers that can decline; Haiku has no server-side fallback. */
export function supportsServerFallback(model: string): boolean {
  return /^claude-(opus|sonnet)-/.test(model);
}

export function buildClaudeRequest(ctx: BrainContext, model: string, maxTokens: number, history: HistoryTurn[], text: string) {
  const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: "user", content: text }];
  // The conversation must start with a user turn.
  while (messages.length > 1 && messages[0].role !== "user") messages.shift();

  return {
    model,
    max_tokens: maxTokens + THINKING_HEADROOM_TOKENS,
    // Stable instructions first, per-turn context (time, vitals, memories) second.
    system: [
      { type: "text" as const, text: buildStaticPrompt(ctx) },
      { type: "text" as const, text: buildDynamicPrompt(ctx) },
    ],
    messages,
    // Short spoken replies: keep (adaptive) thinking light. No temperature/top_p/top_k:
    // current models reject sampling params, so "temperature" steers style in the prompt.
    output_config: { effort: "low" as const, format: betaZodOutputFormat(brainOutputSchema) },
  };
}

/** Adds the server-side refusal fallback (routes a declined turn to Anthropic's recommended model). */
export function withServerFallback<P extends object>(params: P) {
  return { ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
}

/** Validate / clamp the model's structured output. Returns null when there is no usable reply. */
export function normalizeBrainOutput(out: BrainOutput | null | undefined): FallbackOutput | null {
  const reply = out?.reply?.trim();
  if (!out || !reply) return null;
  const m = out.memory;
  const kind = m?.kind?.trim().toUpperCase() ?? "";
  const content = m?.content?.trim().slice(0, 500);
  const memory =
    m && content && (MEMORY_KINDS as readonly string[]).includes(kind)
      ? {
          kind: kind as MemoryKindValue,
          content,
          importance: Number.isFinite(m.importance) ? Math.min(5, Math.max(1, Math.round(m.importance))) : 3,
        }
      : null;
  const expression = out.expression?.trim().toLowerCase();
  return { reply, expression: isExpression(expression) ? expression : "neutral", memory };
}
