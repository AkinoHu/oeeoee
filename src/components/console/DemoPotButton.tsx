"use client";

import { FlaskConical, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createDemoPot } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { MAX_DEMO_POTS_PER_USER, MAX_POTS_PER_USER } from "@/lib/companion/settings";

export function DemoPotButton({
  variant = "primary",
  label,
  redirectTo,
}: {
  variant?: "primary" | "secondary" | "outline";
  label?: string;
  /** Navigate to the new pot's page ("device") or stay and refresh. */
  redirectTo?: "device";
}) {
  const t = useT("console");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [limit, setLimit] = useState<"pots" | "demos" | null>(null);
  return (
    <>
      <Button
        variant={variant}
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const result = await createDemoPot();
            if ("limit" in result) return setLimit(result.limit);
            setLimit(null);
            if (redirectTo === "device") router.push(`/console/devices/${result.deviceId}`);
            else router.refresh();
          })
        }
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FlaskConical className="h-4 w-4" aria-hidden />}
        {pending ? t("empty.creating") : (label ?? t("empty.demo"))}
      </Button>
      {limit && (
        <p role="alert" className="max-w-xs basis-full text-sm text-rose">
          {limit === "demos" ? t("demo.limitDemos", { max: MAX_DEMO_POTS_PER_USER }) : t("devices.limit", { max: MAX_POTS_PER_USER })}
        </p>
      )}
    </>
  );
}
