"use client";

import { Eraser, Info, LoaderCircle, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { clearChatHistory } from "@/app/console/actions";
import { CompanionFace } from "@/components/companion-face/CompanionFace";
import { isExpression, type Expression } from "@/components/companion-face/types";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import type { Severity } from "@/lib/vitals";
import { cn } from "@/lib/utils";
import { MetricIcon, SeverityIcon } from "./MetricIcon";
import type { TileText } from "./vitals-text";

/** Shape of POST /api/companion/chat responses the playground relies on. */
interface ChatApiResponse {
  ok?: boolean;
  error?: string;
  messageId?: string;
  reply: string;
  expression?: string;
  fallback?: boolean;
  memory?: { content: string } | null;
}

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  expression?: string | null;
  channel?: string;
  fallback?: boolean;
  memory?: string | null;
  error?: boolean;
}

export interface PlaygroundVital extends TileText {
  severity: Severity | null;
  hasValue: boolean;
}

const SUGGESTIONS = ["feeling", "stretch", "water", "remember", "tired", "focus"] as const;

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia("(min-width: 1024px)").matches, () => false);
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Playground({
  name,
  initialExpression,
  history,
  fallbackMode,
  livingIn,
  vitals,
  deviceId,
}: {
  name: string;
  initialExpression: Expression;
  history: ChatItem[];
  fallbackMode: boolean;
  livingIn: string | null;
  vitals: PlaygroundVital[];
  deviceId: string | null;
}) {
  const t = useT("console");
  const desktop = useIsDesktop();
  const [messages, setMessages] = useState<ChatItem[]>(history);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [expression, setExpression] = useState<Expression>(initialExpression);
  const [typing, setTyping] = useState<{ id: string; shown: number } | null>(null);
  const [clearing, startClear] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seq = useRef(0);
  const localId = (prefix: string) => `${prefix}-${++seq.current}`;

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [messages.length, typing?.shown, pending]);

  // Typewriter reveal while the face "talks".
  useEffect(() => {
    if (!typing) return;
    const msg = messages.find((m) => m.id === typing.id);
    if (!msg) return;
    if (typing.shown >= msg.content.length) {
      const done = setTimeout(() => setTyping(null), 250);
      return () => clearTimeout(done);
    }
    const tick = setTimeout(() => setTyping({ id: typing.id, shown: Math.min(msg.content.length, typing.shown + 2) }), 28);
    return () => clearTimeout(tick);
  }, [typing, messages]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || pending) return;
    setInput("");
    setPending(true);
    setExpression("curious");
    setMessages((m) => [...m, { id: localId("u"), role: "user", content: text }]);
    try {
      const res = await fetch("/api/companion/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          ...(deviceId ? { deviceId } : {}),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = (await res.json()) as ChatApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "request_failed");
      const id: string = data.messageId ?? localId("a");
      const expr: Expression = isExpression(data.expression) ? data.expression : "neutral";
      setExpression(expr);
      setMessages((m) => [
        ...m,
        { id, role: "assistant", content: data.reply, expression: expr, fallback: data.fallback, memory: data.memory?.content ?? null },
      ]);
      if (prefersReducedMotion()) {
        setTyping({ id, shown: data.reply.length });
      } else {
        setTyping({ id, shown: 0 });
      }
    } catch {
      setExpression("sad");
      setMessages((m) => [...m, { id: localId("e"), role: "assistant", content: t("playground.error"), error: true, expression: "sad" }]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  const talking = typing !== null;

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6">
      {/* Companion panel */}
      <Card className="relative overflow-hidden p-5 lg:sticky lg:top-24 lg:self-start">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgb(155_227_74/0.16),transparent_70%)]" />
        <div className="relative flex items-center gap-4 lg:flex-col lg:text-center">
          <CompanionFace expression={expression} talking={talking} size={desktop ? 224 : 120} className="shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">{name}</p>
            <p className="text-sm text-muted">{livingIn ?? t("playground.noPot")}</p>
            <p className="sr-only" aria-live="polite">
              {pending ? t("playground.thinking", { name }) : ""}
            </p>
          </div>
        </div>

        {vitals.length > 0 && (
          <div className="relative mt-5 hidden lg:block">
            <p className="mb-2 text-xs font-medium text-muted">{t("playground.vitals")}</p>
            <ul className="space-y-1.5 text-sm">
              {vitals.map((v) => (
                <li key={v.metric} className="flex items-center gap-2">
                  <MetricIcon metric={v.metric} className="h-3.5 w-3.5 text-faint" />
                  <span className="flex-1 truncate text-muted">{v.label}</span>
                  <span className="tabular-nums">
                    {v.value ?? "—"}
                    {v.value && <span className="ml-0.5 text-xs text-muted">{v.unit === "lux" ? " lux" : v.unit}</span>}
                  </span>
                  {v.hasValue && <SeverityIcon severity={v.severity} className="h-3.5 w-3.5" />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fallbackMode && (
          <p className="relative mt-4 flex gap-2 rounded-xl border border-sun/25 bg-sun/[0.06] p-3 text-xs leading-relaxed text-sun/90">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("playground.fallbackNotice")}
          </p>
        )}
      </Card>

      {/* Chat */}
      <Card className="flex h-[min(72vh,44rem)] min-h-[28rem] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <p className="text-sm font-medium">{t("playground.title")}</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={clearing || messages.length === 0}
            onClick={() => {
              if (!window.confirm(t("playground.clearConfirm"))) return;
              startClear(async () => {
                await clearChatHistory();
                setMessages([]);
                setTyping(null);
              });
            }}
          >
            <Eraser className="h-4 w-4" aria-hidden /> {t("playground.clear")}
          </Button>
        </div>

        <div ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {messages.length === 0 && !pending && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-6 w-6 text-leaf-300" aria-hidden />
              <p className="max-w-xs text-sm text-muted">{t("playground.empty")}</p>
            </div>
          )}
          {messages.map((m) => {
            const isTyping = typing?.id === m.id;
            const shown = isTyping ? m.content.slice(0, typing.shown) : m.content;
            if (m.role === "user") {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-leaf-300 px-3.5 py-2 text-sm text-bg">
                    <span className="sr-only">{t("playground.you")}: </span>
                    {m.content}
                    {m.channel === "device" && <span className="ml-2 text-[10px] opacity-70">· {t("playground.viaPot")}</span>}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex items-end gap-2">
                <CompanionFace expression={isExpression(m.expression) ? m.expression : "neutral"} size={36} className="mb-0.5 shrink-0" />
                <div className="max-w-[85%] min-w-0">
                  <div
                    className={cn(
                      "rounded-2xl rounded-bl-md border px-3.5 py-2 text-sm leading-relaxed",
                      m.error ? "border-rose/30 bg-rose/10 text-rose" : "border-line bg-surface-2 text-fg",
                    )}
                  >
                    <span className="sr-only">{name}: {m.content}</span>
                    <span aria-hidden>
                      {shown}
                      {isTyping && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-leaf-300/70" />}
                    </span>
                  </div>
                  {(m.fallback || m.memory || m.channel === "device") && !isTyping && (
                    <div className="mt-1 flex flex-wrap gap-1.5 pl-1">
                      {m.channel === "device" && <Badge className="py-0 text-[10px]">{t("playground.viaPot")}</Badge>}
                      {m.fallback && <Badge tone="sun" className="py-0 text-[10px]">{t("playground.fallback")}</Badge>}
                      {m.memory && (
                        <Badge tone="sky" className="py-0 text-[10px]">
                          <Sparkles className="h-3 w-3" aria-hidden /> {t("playground.memorySaved", { content: m.memory })}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {pending && (
            <div className="flex items-center gap-2 pl-11 text-sm text-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> {t("playground.thinking", { name })}
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label={t("playground.suggestions")}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => void send(t(`playground.s.${s}`))}
                className="shrink-0 cursor-pointer rounded-full border border-line px-3 py-1 text-xs whitespace-nowrap text-muted transition hover:border-leaf-300/50 hover:text-fg disabled:opacity-50"
              >
                {t(`playground.s.${s}`)}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              {t("playground.placeholder", { name })}
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={t("playground.placeholder", { name })}
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg outline-none placeholder:text-faint focus:border-leaf-300/60 focus:ring-2 focus:ring-leaf-300/20"
            />
            <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label={t("playground.send")}>
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
