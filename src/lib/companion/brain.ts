import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Expression } from "@/components/companion-face/types";
import { getPlant } from "@/data";
import type { Device } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { features } from "@/lib/env";
import { buildClaudeRequest, normalizeBrainOutput, supportsServerFallback, withServerFallback, type HistoryTurn } from "./claude-request";
import { fallbackReply, refusalReply, type FallbackOutput } from "./fallback";
import type { BrainContext, BrainMemory } from "./prompt";
import { companionClock, getOrCreateCompanion, potState, primaryDevice, type CompanionRecord } from "./queries";
import {
  COMPANION_LANGUAGES,
  DEFAULT_MODEL,
  isCompanionModel,
  MEMORY_KINDS,
  type ChatChannel,
  type CompanionLanguage,
  type MemoryKindValue,
} from "./settings";

const HISTORY_MESSAGES = 12;
const MEMORY_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 25_000;

export type FallbackReason = "no_api_key" | "api_error" | "refusal" | "invalid_output";

export interface ChatResult {
  reply: string;
  expression: Expression;
  /** Memory the companion decided to keep from this turn (already saved). */
  memory: { kind: MemoryKindValue; content: string; importance: number } | null;
  /** True when the reply came from the rule-based fallback brain. */
  fallback: boolean;
  fallbackReason: FallbackReason | null;
  model: string;
  messageId: string;
}

export interface ChatRequest {
  userId: string;
  text: string;
  channel: ChatChannel;
  /** Pot the conversation is about (device channel: the pot speaking). */
  deviceId?: string | null;
  timeZone?: string | null;
  now?: Date;
}

interface LoadedContext {
  ctx: BrainContext;
  companion: CompanionRecord;
  device: Device | null;
}

/** Everything the brain knows for one turn. Also powers the console's prompt preview. */
export async function loadBrainContext(
  userId: string,
  { deviceId, timeZone, now = new Date(), channel = "web" }: { deviceId?: string | null; timeZone?: string | null; now?: Date; channel?: ChatChannel } = {},
): Promise<LoadedContext> {
  const companion = await getOrCreateCompanion(userId);
  const clock = companionClock(companion, timeZone);
  const [device, memories] = await Promise.all([
    primaryDevice(userId, deviceId),
    prisma.memory.findMany({
      where: { companionId: companion.id },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: MEMORY_LIMIT,
    }),
  ]);
  const state = device ? await potState(device, now, clock.vitalsOptions) : null;
  const plant = getPlant(device?.plantId);
  const language = (COMPANION_LANGUAGES as readonly string[]).includes(companion.language)
    ? (companion.language as CompanionLanguage)
    : "auto";

  const ctx: BrainContext = {
    companion: { name: companion.name, persona: companion.persona, language, temperature: companion.temperature },
    plant: plant ? { name: plant.name.en, scientificName: plant.scientificName, personality: plant.personality.en } : null,
    device: device ? { name: device.name } : null,
    vitals: state?.vitals ?? null,
    memories: memories.map((m): BrainMemory => ({ kind: m.kind, content: m.content, importance: m.importance, source: m.source })),
    reminders: clock.reminders,
    now,
    timeZone: clock.timeZone,
    channel,
  };
  return { ctx, companion, device };
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 1, timeout: REQUEST_TIMEOUT_MS });
  return client;
}

type ModelTurn = { output: FallbackOutput } | { refusal: true } | { invalid: true };

/** One structured-output call to Claude. */
async function askClaude(
  ctx: BrainContext,
  model: string,
  maxTokens: number,
  history: HistoryTurn[],
  text: string,
): Promise<ModelTurn> {
  const params = buildClaudeRequest(ctx, model, maxTokens, history, text);
  const fallbacks = supportsServerFallback(model);
  const call = (useFallback: boolean) =>
    useFallback ? anthropic().beta.messages.parse(withServerFallback(params)) : anthropic().beta.messages.parse(params);

  let response;
  try {
    response = await call(fallbacks);
  } catch (error) {
    // If the account can't use server-side fallbacks, retry once without them.
    if (fallbacks && error instanceof Anthropic.BadRequestError) response = await call(false);
    else throw error;
  }

  if (response.stop_reason === "refusal") return { refusal: true };
  const output = normalizeBrainOutput(response.parsed_output);
  return output ? { output } : { invalid: true };
}

const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}]+/gu, "");

/** Talk to the user's companion and persist the exchange (and any new memory). */
export async function chatWithCompanion(req: ChatRequest): Promise<ChatResult> {
  const now = req.now ?? new Date();
  const { ctx, companion, device } = await loadBrainContext(req.userId, {
    deviceId: req.deviceId,
    timeZone: req.timeZone,
    now,
    channel: req.channel,
  });
  const model = isCompanionModel(companion.model) ? companion.model : DEFAULT_MODEL;

  let output: FallbackOutput;
  let fallbackReason: FallbackReason | null = null;

  if (!features.anthropic) {
    output = fallbackReply(ctx, req.text);
    fallbackReason = "no_api_key";
  } else {
    const recent = await prisma.chatMessage.findMany({
      where: { companionId: companion.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_MESSAGES,
      select: { role: true, content: true },
    });
    const history = recent
      .reverse()
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    try {
      const turn = await askClaude(ctx, model, companion.maxTokens, history, req.text);
      if ("output" in turn) output = turn.output;
      else if ("refusal" in turn) {
        output = refusalReply(ctx, req.text);
        fallbackReason = "refusal";
      } else {
        output = fallbackReply(ctx, req.text);
        fallbackReason = "invalid_output";
      }
    } catch (error) {
      console.error("[companion] Claude call failed:", error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
      output = fallbackReply(ctx, req.text);
      fallbackReason = "api_error";
    }
  }

  // Keep new memories only if they aren't already known.
  let memory = output.memory && (MEMORY_KINDS as readonly string[]).includes(output.memory.kind) ? output.memory : null;
  if (memory) {
    const existing = await prisma.memory.findMany({ where: { companionId: companion.id }, select: { content: true } });
    const key = normalize(memory.content);
    if (!key || existing.some((m) => normalize(m.content) === key)) memory = null;
  }

  const deviceId = req.channel === "device" ? (req.deviceId ?? device?.id ?? null) : (device?.id ?? null);
  const [, assistant] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { companionId: companion.id, role: "user", content: req.text, channel: req.channel, deviceId, createdAt: now },
    }),
    prisma.chatMessage.create({
      data: {
        companionId: companion.id,
        role: "assistant",
        content: output.reply,
        expression: output.expression,
        channel: req.channel,
        deviceId,
        createdAt: new Date(Math.max(Date.now(), now.getTime() + 1)),
      },
    }),
    ...(memory
      ? [prisma.memory.create({ data: { companionId: companion.id, ...memory, source: "auto" } })]
      : []),
  ]);

  return {
    reply: output.reply,
    expression: output.expression,
    memory,
    fallback: fallbackReason !== null,
    fallbackReason,
    model: fallbackReason === "no_api_key" ? "fallback" : model,
    messageId: assistant.id,
  };
}
