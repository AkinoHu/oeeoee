"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createDevice, type CreateDeviceState } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import { POT_SIZES } from "@/lib/companion/settings";
import { TokenReveal } from "./TokenReveal";

export interface PlantOption {
  id: string;
  name: string;
}

export function AddDeviceForm({ plants, baseUrl }: { plants: PlantOption[]; baseUrl: string }) {
  const t = useT("console");
  const [state, action, pending] = useActionState<CreateDeviceState, FormData>(createDevice, { ok: null });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const errors = state.ok === false ? (state.errors ?? {}) : {};
  const reveal = state.reveal && state.reveal.deviceId !== dismissed ? state.reveal : null;

  if (reveal) return <TokenReveal reveal={reveal} baseUrl={baseUrl} onDone={() => setDismissed(reveal.deviceId)} />;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] sm:items-end" noValidate>
      <div>
        <Label htmlFor="device-name">{t("devices.name")}</Label>
        <Input id="device-name" name="name" required maxLength={60} placeholder={t("devices.namePlaceholder")} aria-invalid={Boolean(errors.name)} />
        {errors.name && <p className="mt-1 text-xs text-rose">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="device-plant">{t("devices.plant")}</Label>
        <Select id="device-plant" name="plantId" defaultValue={plants[0]?.id ?? ""}>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="">{t("devices.plantNone")}</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="device-size">{t("devices.potSize")}</Label>
        <Select id="device-size" name="potSize" defaultValue="M">
          {POT_SIZES.map((s) => (
            <option key={s} value={s}>
              {t(`devices.potSize.${s}`)}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending} className="sm:w-auto">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        {pending ? t("devices.creating") : t("devices.create")}
      </Button>
      {state.ok === false && !errors.name && (
        <p role="alert" className="text-sm text-rose sm:col-span-4">
          {t("devices.error")}
        </p>
      )}
    </form>
  );
}
