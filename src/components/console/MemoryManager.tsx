"use client";

import { Briefcase, CalendarHeart, HeartPulse, LoaderCircle, Pencil, Plus, Sparkles, Star, Trash2, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { addMemory, deleteMemory, updateMemory } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { Badge, Card, Label, Select, Textarea } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import { MEMORY_KINDS, type MemoryKindValue } from "@/lib/companion/settings";
import { cn } from "@/lib/utils";

export interface MemoryItem {
  id: string;
  kind: MemoryKindValue;
  content: string;
  importance: number;
  source: string;
}

const KIND_ICON = { FACT: UserRound, PREFERENCE: Star, EVENT: CalendarHeart, HEALTH: HeartPulse, WORK: Briefcase } as const;

function ImportancePicker({ value, onChange, name, label }: { value: number; onChange: (n: number) => void; name: string; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-leaf-300",
            n <= value ? "border-leaf-300/50 bg-leaf-300/15 text-leaf-100" : "border-line text-muted hover:border-line-strong",
          )}
        >
          <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
          {n}
        </label>
      ))}
    </div>
  );
}

function ImportanceDots({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label} title={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("h-1.5 w-1.5 rounded-full", n <= value ? "bg-leaf-300" : "bg-line-strong")} />
      ))}
    </span>
  );
}

function MemoryForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix,
}: {
  initial: { kind: MemoryKindValue; content: string; importance: number };
  onSubmit: (fd: FormData) => Promise<boolean>;
  onCancel?: () => void;
  submitLabel: string;
  idPrefix: string;
}) {
  const t = useT("console");
  const [kind, setKind] = useState(initial.kind);
  const [content, setContent] = useState(initial.content);
  const [importance, setImportance] = useState(initial.importance);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const ok = await onSubmit(fd);
          setError(!ok);
          if (ok && !onCancel) {
            setContent("");
            setImportance(3);
          }
        });
      }}
      className="space-y-3"
    >
      <div>
        <Label htmlFor={`${idPrefix}-content`}>{t("memories.content")}</Label>
        <Textarea
          id={`${idPrefix}-content`}
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("memories.contentPlaceholder")}
          rows={2}
          maxLength={1000}
          required
          className="min-h-16"
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <Label htmlFor={`${idPrefix}-kind`}>{t("memories.kind")}</Label>
          <Select id={`${idPrefix}-kind`} name="kind" value={kind} onChange={(e) => setKind(e.target.value as MemoryKindValue)}>
            {MEMORY_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`memories.kind.${k}`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-fg/90">
            {t("memories.importance")} <span className="font-normal text-faint">· {t("memories.importanceHint")}</span>
          </p>
          <ImportancePicker value={importance} onChange={setImportance} name="importance" label={t("memories.importance")} />
        </div>
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              {t("memories.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={pending || !content.trim()}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : !onCancel && <Plus className="h-4 w-4" aria-hidden />}
            {submitLabel}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose">
          {t("memories.error")}
        </p>
      )}
    </form>
  );
}

export function MemoryManager({ memories }: { memories: MemoryItem[] }) {
  const t = useT("console");
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, startDelete] = useTransition();
  const groups = MEMORY_KINDS.map((kind) => ({ kind, items: memories.filter((m) => m.kind === kind) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold">{t("memories.add")}</h2>
        <MemoryForm
          idPrefix="new"
          initial={{ kind: "PREFERENCE", content: "", importance: 3 }}
          submitLabel={t("memories.add")}
          onSubmit={async (fd) => (await addMemory(fd)).ok === true}
        />
      </Card>

      {groups.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Sparkles className="h-6 w-6 text-leaf-300" aria-hidden />
          <p className="max-w-sm text-sm text-muted">{t("memories.empty")}</p>
        </Card>
      ) : (
        groups.map(({ kind, items }) => {
          const Icon = KIND_ICON[kind];
          return (
            <section key={kind} aria-labelledby={`group-${kind}`}>
              <h2 id={`group-${kind}`} className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-leaf-300" aria-hidden />
                {t(`memories.group.${kind}`)}
                <span className="font-normal text-faint">{items.length}</span>
              </h2>
              <Card className="divide-y divide-line">
                {items.map((m) =>
                  editing === m.id ? (
                    <div key={m.id} className="p-4">
                      <MemoryForm
                        idPrefix={m.id}
                        initial={m}
                        submitLabel={t("memories.save")}
                        onCancel={() => setEditing(null)}
                        onSubmit={async (fd) => {
                          const ok = (await updateMemory(m.id, fd)).ok === true;
                          if (ok) setEditing(null);
                          return ok;
                        }}
                      />
                    </div>
                  ) : (
                    <div key={m.id} className="group flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed text-pretty break-words">{m.content}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <ImportanceDots value={m.importance} label={t("memories.importanceValue", { n: m.importance })} />
                          {m.source === "auto" && (
                            <Badge tone="sky" className="py-0 text-[11px]">
                              <Sparkles className="h-3 w-3" aria-hidden /> {t("memories.auto")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1 sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(m.id)} aria-label={t("memories.edit")}>
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-rose"
                          disabled={pendingDelete}
                          aria-label={t("memories.delete")}
                          onClick={() => {
                            if (window.confirm(t("memories.confirmDelete"))) startDelete(async () => void (await deleteMemory(m.id)));
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
