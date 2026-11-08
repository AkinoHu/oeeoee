/**
 * Deterministic, rule-based companion brain used when no ANTHROPIC_API_KEY is
 * configured (or the API call fails). It still speaks from the pot's real
 * vitals and the user's memories, in the user's language. Pure.
 */
import type { Expression } from "@/components/companion-face/types";
import { interpolate } from "@/i18n/define";
import consoleMessages from "@/i18n/messages/console";
import type { VitalsAssessment } from "@/lib/vitals";
import { formatDuration } from "./format";
import type { BrainContext } from "./prompt";
import type { CompanionLanguage, MemoryKindValue, ReplyLanguage } from "./settings";

type BrainKey = Extract<keyof (typeof consoleMessages)["en"], `brain.${string}`>;

export interface FallbackOutput {
  reply: string;
  expression: Expression;
  memory: { kind: MemoryKindValue; content: string; importance: number } | null;
}

/** Japanese if there is kana; Chinese if there are CJK ideographs; else English. */
export function detectLanguage(text: string): ReplyLanguage {
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  return "en";
}

export function replyLanguage(setting: CompanionLanguage, text: string): ReplyLanguage {
  return setting === "auto" ? detectLanguage(text) : setting;
}

function say(lang: ReplyLanguage, key: BrainKey, vars?: Record<string, string | number>) {
  return interpolate(consoleMessages[lang][key], vars);
}

type Intent =
  | "remember"
  | "stretch"
  | "hydrate"
  | "plant"
  | "feeling"
  | "tired"
  | "stress"
  | "work"
  | "thanks"
  | "greeting"
  | "chat";

const INTENTS: [Intent, RegExp][] = [
  ["remember", /\bremember\b|\bmy name is\b|\bcall me\b|\bi (really )?(like|love|prefer|hate)\b(?! you)|\bmy birthday\b|\ballergic\b|记住|记得|我叫|我的名字|我喜欢|我讨厌|生日|过敏|覚えて|名前は|大好き|好きです|が好き|誕生日|アレルギー/i],
  ["stretch", /stretch|stand up|posture|sitting too long|伸展|拉伸|站起来|久坐|活动一下|ストレッチ|立ち上が|座りっぱなし|姿勢/i],
  ["hydrate", /\bdrink\b|hydrat|喝水|补水|喝点水|水を飲|水分補給|お水を飲/i],
  ["plant", /thirst|\bsoil\b|need water|water you|watering|\btank\b|\blight\b|渴|土壤|土.?干|浇水|水箱|光照|喉が渇|土が|水やり|水(は|が)?(ほしい|欲しい|いる)|タンク|日当たり/i],
  ["feeling", /how are you|how('| a)?re you (feeling|doing)|how do you feel|feeling today|你好吗|感觉怎么样|还好吗|怎么样了|心情|元気|調子|気分/i],
  ["tired", /tired|exhausted|sleepy|can'?t sleep|\bsleep\b|累|困|疲惫|睡觉|失眠|疲れ|眠い|眠れ|寝る/i],
  ["stress", /stress|anxious|anxiety|\bsad\b|upset|overwhelm|lonely|压力|焦虑|难过|伤心|烦|孤独|ストレス|不安|悲しい|つらい|寂しい/i],
  ["work", /\bwork\b|focus|deadline|meeting|\bcode\b|project|工作|专注|加班|开会|项目|仕事|集中|締め切り|会議/i],
  ["thanks", /thank|thx|谢谢|多谢|感谢|ありがとう/i],
  ["greeting", /^(hi|hey|hello|yo|good (morning|afternoon|evening))\b|^(你好|嗨|早上好|晚上好|哈喽)|^(こんにちは|おはよう|こんばんは|やあ)/i],
];

export function detectIntent(text: string): Intent {
  for (const [intent, re] of INTENTS) if (re.test(text.trim())) return intent;
  return "chat";
}

/** Extract a memory the user explicitly shared. */
export function extractMemory(text: string): FallbackOutput["memory"] {
  const clean = text
    .trim()
    .replace(/^(please\s+)?remember( that)?[:,]?\s*/i, "")
    .replace(/^(请)?(帮我)?记住[：:，,]?\s*/, "")
    .replace(/[をと](覚えて(おいて|ね)?(ください)?)[。！!]?$/, "")
    .replace(/覚えて(おいて)?[。！!]?$/, "")
    .replace(/(って|と|を)$/, "")
    .trim()
    .slice(0, 200);
  if (!clean) return null;
  let kind: MemoryKindValue = "FACT";
  let importance = 3;
  if (/name is|call me|我叫|我的名字|名前は/i.test(text)) {
    importance = 5;
  } else if (/birthday|anniversary|生日|纪念日|誕生日|記念日/i.test(text)) {
    kind = "EVENT";
    importance = 4;
  } else if (/allerg|health|doctor|过敏|健康|医生|アレルギー|健康|病院/i.test(text)) {
    kind = "HEALTH";
    importance = 4;
  } else if (/like|love|prefer|hate|favou?rite|喜欢|讨厌|爱|最爱|好き|嫌い/i.test(text)) {
    kind = "PREFERENCE";
  } else if (/work|job|meeting|deadline|工作|上班|开会|仕事|会議/i.test(text)) {
    kind = "WORK";
  }
  return { kind, content: clean, importance };
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "?" : String(Math.round(n)));

/** One first-person sentence about the worst thing going on (or how good it is). */
export function vitalsLine(vitals: VitalsAssessment | null, hasDevice: boolean, lang: ReplyLanguage): string {
  if (!hasDevice || !vitals) return say(lang, "brain.vitals.noPot");
  const issue = (code: string) => vitals.issues.find((i) => i.code === code);
  if (issue("no_data")) return say(lang, "brain.vitals.noData");
  const offline = issue("offline");
  if (offline) return say(lang, "brain.vitals.offline", { duration: formatDuration(offline.value ?? 60, lang) });

  const dry = issue("dry");
  const tankEmpty = issue("tank_empty");
  if (dry && tankEmpty) return say(lang, "brain.vitals.dryNoWater", { value: fmt(dry.value) });
  // Walk issues worst-first (assessVitals sorts them).
  for (const i of vitals.issues) {
    switch (i.code) {
      case "dry":
        return say(lang, "brain.vitals.dry", { value: fmt(i.value) });
      case "tank_empty":
        return say(lang, "brain.vitals.tankEmpty");
      case "tank_low":
        return say(lang, "brain.vitals.tankLow", { value: fmt(i.value) });
      case "waterlogged":
        return say(lang, "brain.vitals.waterlogged", { value: fmt(i.value) });
      case "cold":
        return say(lang, "brain.vitals.cold", { value: fmt(i.value) });
      case "hot":
        return say(lang, "brain.vitals.hot", { value: fmt(i.value) });
      case "too_dark":
        return say(lang, "brain.vitals.tooDark");
    }
  }
  if (vitals.night) return say(lang, "brain.vitals.sleepy");
  const soil = vitals.metrics.soilMoisture.value;
  return soil !== null && vitals.status === "thriving"
    ? say(lang, "brain.vitals.great", { soil: fmt(soil) })
    : say(lang, "brain.vitals.good");
}

export function fallbackReply(ctx: BrainContext, text: string): FallbackOutput {
  const lang = replyLanguage(ctx.companion.language, text);
  const intent = detectIntent(text);
  const v = ctx.vitals;
  const vitalsExpression: Expression = !ctx.device || !v ? "curious" : v.expression;
  const vitals = vitalsLine(v, Boolean(ctx.device), lang);
  // Mention vitals in other intents only when something actually needs care.
  const urgent = Boolean(v && v.issues.some((i) => i.severity !== "info" && i.code !== "no_data"));
  const withVitals = (line: string) => (urgent ? `${line} ${vitals}` : line);
  const r = ctx.reminders;

  switch (intent) {
    case "remember":
      return { reply: say(lang, "brain.remember"), expression: "happy", memory: extractMemory(text) };
    case "stretch":
      return {
        reply: withVitals(
          r.sedentaryMinutes > 0 ? say(lang, "brain.stretch", { minutes: r.sedentaryMinutes }) : say(lang, "brain.stretchOff"),
        ),
        expression: "excited",
        memory: null,
      };
    case "hydrate":
      return {
        reply: withVitals(
          r.hydrationMinutes > 0 ? say(lang, "brain.hydrate", { minutes: r.hydrationMinutes }) : say(lang, "brain.hydrateOff"),
        ),
        expression: "happy",
        memory: null,
      };
    case "plant":
      return { reply: vitals, expression: vitalsExpression, memory: null };
    case "feeling":
      return { reply: `${say(lang, "brain.howAreYou")} ${vitals}`, expression: vitalsExpression, memory: null };
    case "tired":
      return {
        reply: v?.night ? say(lang, "brain.tiredNight") : withVitals(say(lang, "brain.tired")),
        expression: "sleepy",
        memory: null,
      };
    case "stress":
      return { reply: say(lang, "brain.stress"), expression: "love", memory: null };
    case "work":
      return { reply: withVitals(say(lang, "brain.work")), expression: "focused", memory: null };
    case "thanks":
      return { reply: say(lang, "brain.thanks"), expression: "love", memory: null };
    case "greeting":
      return {
        reply: `${say(lang, "brain.hello", { name: ctx.companion.name })} ${vitals}`,
        expression: urgent ? vitalsExpression : "happy",
        memory: null,
      };
    default: {
      const top = ctx.memories[0];
      const parts = [say(lang, "brain.default")];
      if (top) parts.push(say(lang, "brain.recall", { memory: top.content.replace(/[.。!！]+$/, "") }));
      parts.push(vitals);
      return { reply: parts.join(" "), expression: vitalsExpression, memory: null };
    }
  }
}

export function refusalReply(ctx: BrainContext, text: string): FallbackOutput {
  return { reply: say(replyLanguage(ctx.companion.language, text), "brain.refusal"), expression: "concerned", memory: null };
}
