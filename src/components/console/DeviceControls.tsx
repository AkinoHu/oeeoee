"use client";

import { Check, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { startTransition, useActionState, useState, useTransition } from "react";
import { deleteDevice, rotateDeviceToken, updateDevice, type FormState, type TokenReveal as Reveal } from "@/app/console/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/primitives";
import { useT } from "@/i18n/client";
import { POT_SIZES } from "@/lib/companion/settings";
import type { PlantOption } from "./AddDeviceForm";
import { TokenReveal } from "./TokenReveal";

export function DeviceSettingsForm({
  device,
  plants,
}: {
  device: { id: string; name: string; plantId: string | null; potSize: string | null };
  plants: PlantOption[];
}) {
  const t = useT("console");
  const [state, action, pending] = useActionState<FormState, FormData>(updateDevice.bind(null, device.id), { ok: null });
  const [name, setName] = useState(device.name);
  const [plantId, setPlantId] = useState(device.plantId ?? "");
  const [potSize, setPotSize] = useState(device.potSize ?? "M");

  return (
    <form
      // onSubmit, not `action`: React's post-action form reset would snap the
      // controlled <select>s back to their first-render values.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-3"
      noValidate
    >
      <div>
        <Label htmlFor="ds-name">{t("devices.name")}</Label>
        <Input id="ds-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div>
          <Label htmlFor="ds-plant">{t("devices.plant")}</Label>
          <Select id="ds-plant" name="plantId" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="">{t("devices.plantNone")}</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ds-size">{t("devices.potSize")}</Label>
          <Select id="ds-size" name="potSize" value={potSize} onChange={(e) => setPotSize(e.target.value)}>
            {POT_SIZES.map((s) => (
              <option key={s} value={s}>
                {t(`devices.potSize.${s}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <span role="status" className="text-sm">
          {state.ok === true && !pending && (
            <span className="inline-flex items-center gap-1 text-leaf-200">
              <Check className="h-4 w-4" aria-hidden /> {t("device.saved")}
            </span>
          )}
          {state.ok === false && <span className="text-rose">{t("devices.error")}</span>}
        </span>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {t("device.save")}
        </Button>
      </div>
    </form>
  );
}

export function DeviceDangerZone({ device, baseUrl }: { device: { id: string; name: string }; baseUrl: string }) {
  const t = useT("console");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [rotating, startRotate] = useTransition();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      {reveal && <TokenReveal reveal={reveal} baseUrl={baseUrl} onDone={() => setReveal(null)} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{t("device.rotate")}</p>
          <p className="text-xs text-muted">{t("device.rotateHint")}</p>
        </div>
        <Button
          variant="secondary"
          disabled={rotating}
          onClick={() => {
            if (!window.confirm(t("device.rotateConfirm"))) return;
            startRotate(async () => setReveal(await rotateDeviceToken(device.id)));
          }}
        >
          {rotating ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
          {rotating ? t("device.rotating") : t("device.rotate")}
        </Button>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{t("device.delete")}</p>
          <p className="text-xs text-muted">{t("device.deleteHint")}</p>
        </div>
        <Button
          variant="danger"
          disabled={deleting}
          onClick={() => {
            if (!window.confirm(t("device.deleteConfirm", { name: device.name }))) return;
            startDelete(async () => deleteDevice(device.id));
          }}
        >
          {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
          {t("device.delete")}
        </Button>
      </div>
    </div>
  );
}
