"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { localeLabels, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("relative inline-flex items-center text-muted hover:text-fg", className)}>
      <Languages className="pointer-events-none absolute left-2.5 h-4 w-4" aria-hidden />
      <span className="sr-only">{t("nav.language")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setLocale(next);
            router.refresh();
          });
        }}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-transparent bg-transparent pr-2 pl-8 text-sm outline-none hover:border-line focus:border-line-strong"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-surface text-fg">
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
