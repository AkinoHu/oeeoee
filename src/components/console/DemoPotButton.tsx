"use client";

import { FlaskConical, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createDemoPot } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

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
  return (
    <Button
      variant={variant}
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        start(async () => {
          const { deviceId } = await createDemoPot();
          if (redirectTo === "device") router.push(`/console/devices/${deviceId}`);
          else router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FlaskConical className="h-4 w-4" aria-hidden />}
      {pending ? t("empty.creating") : (label ?? t("empty.demo"))}
    </Button>
  );
}
