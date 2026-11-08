"use client";

import { Check, LoaderCircle, Mail } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

/** Email capture for coming-soon markets ("launch") and pot-only markets ("plants"). */
export function WaitlistForm({
  countryCode,
  variant = "launch",
  defaultEmail,
  className,
}: {
  countryCode: string;
  variant?: "launch" | "plants";
  defaultEmail?: string | null;
  className?: string;
}) {
  const t = useT("store");
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          website: String(form.get("website") ?? ""),
          countryCode,
          locale,
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {status === "done" ? (
          <motion.p
            key="done"
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 rounded-xl border border-leaf-300/30 bg-leaf-300/10 px-4 py-3 text-sm text-leaf-100"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-300 text-bg">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
            {variant === "plants" ? t("waitlist.donePlants") : t("waitlist.done")}
          </motion.p>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} exit={{ opacity: 0, y: -6 }}>
            <label htmlFor={`${id}-email`} className="sr-only">
              {t("waitlist.label")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
                <Input
                  id={`${id}-email`}
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  defaultValue={defaultEmail ?? ""}
                  placeholder={t("waitlist.placeholder")}
                  className="h-11 pl-9"
                />
              </div>
              {/* Honeypot — hidden from people and assistive tech. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <Button type="submit" size="md" className="h-11" disabled={status === "loading"}>
                {status === "loading" && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
                {variant === "plants" ? t("waitlist.submitPlants") : t("waitlist.submit")}
              </Button>
            </div>
            <p className={cn("mt-2 text-xs", status === "error" ? "text-rose" : "text-faint")} role={status === "error" ? "alert" : undefined}>
              {status === "error" ? t("waitlist.error") : t("waitlist.privacy")}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
