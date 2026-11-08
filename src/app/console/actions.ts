"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPlant, getPotModel } from "@/data";
import { getT } from "@/i18n/server";
import { simulateTelemetry } from "@/lib/companion/demo";
import { generateSerial, issueDeviceCredentials } from "@/lib/companion/device-token";
import { companionClock, getOrCreateCompanion } from "@/lib/companion/queries";
import { companionSettingsSchema, deviceCreateSchema, fieldErrors, memorySchema } from "@/lib/companion/schemas";
import { DEMO_SERIAL_PREFIX, MAX_DEMO_POTS_PER_USER, MAX_POTS_PER_USER, readReminders, timezoneWasSet } from "@/lib/companion/settings";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isValidTimeZone } from "@/lib/vitals";

export type FormState = { ok: boolean | null; errors?: Record<string, string>; at?: number };

/** One-time credential reveal after creating a pot or rotating its token. */
export type TokenReveal = { deviceId: string; name: string; serial: string; token: string };
export type CreateDeviceState = FormState & { reveal?: TokenReveal; limitReached?: boolean };

const formObject = (fd: FormData) => Object.fromEntries(Array.from(fd.entries()).filter(([, v]) => typeof v === "string"));

// ── Companion ────────────────────────────────────────────────

export async function saveCompanionSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/console/companion");
  const parsed = companionSettingsSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), at: Date.now() };
  const { name, persona, language, voice, model, temperature, maxTokens, timezone, ...r } = parsed.data;
  const reminders = { ...r, timezone: timezone || null };
  await prisma.companion.upsert({
    where: { userId: user.id },
    create: { userId: user.id, name, persona, language, voice, model, temperature, maxTokens, reminders },
    update: { name, persona, language, voice, model, temperature, maxTokens, reminders },
  });
  revalidatePath("/console", "layout");
  return { ok: true, at: Date.now() };
}

/** Called once from the browser so time-of-day logic uses the user's zone. */
export async function saveDetectedTimezone(timeZone: string): Promise<void> {
  const user = await requireUser("/console");
  if (!isValidTimeZone(timeZone)) return;
  const companion = await getOrCreateCompanion(user.id);
  // Only fill in a zone that was never set: one the user cleared stays cleared.
  if (timezoneWasSet(companion.reminders)) return;
  const reminders = readReminders(companion.reminders);
  await prisma.companion.update({ where: { id: companion.id }, data: { reminders: { ...reminders, timezone: timeZone } } });
  revalidatePath("/console", "layout");
}

// ── Memories ─────────────────────────────────────────────────

async function ownedMemory(userId: string, id: string) {
  return prisma.memory.findFirst({ where: { id, companion: { userId } }, select: { id: true } });
}

export async function addMemory(formData: FormData): Promise<FormState> {
  const user = await requireUser("/console/memories");
  const parsed = memorySchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const companion = await getOrCreateCompanion(user.id);
  await prisma.memory.create({ data: { ...parsed.data, companionId: companion.id, source: "user" } });
  revalidatePath("/console/memories");
  return { ok: true, at: Date.now() };
}

export async function updateMemory(id: string, formData: FormData): Promise<FormState> {
  const user = await requireUser("/console/memories");
  const parsed = memorySchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!(await ownedMemory(user.id, id))) return { ok: false };
  await prisma.memory.update({ where: { id }, data: parsed.data });
  revalidatePath("/console/memories");
  return { ok: true, at: Date.now() };
}

export async function deleteMemory(id: string): Promise<FormState> {
  const user = await requireUser("/console/memories");
  if (!(await ownedMemory(user.id, id))) return { ok: false };
  await prisma.memory.delete({ where: { id } });
  revalidatePath("/console/memories");
  return { ok: true };
}

// ── Devices ──────────────────────────────────────────────────

async function ownedDevice(userId: string, id: string) {
  return prisma.device.findFirst({ where: { id, userId } });
}

/** Which per-account pot limit (if any) stops creating another (demo) pot. */
async function potLimitReached(userId: string, demo: boolean): Promise<"pots" | "demos" | null> {
  const [all, demos] = await Promise.all([
    prisma.device.count({ where: { userId } }),
    demo ? prisma.device.count({ where: { userId, serial: { startsWith: DEMO_SERIAL_PREFIX } } }) : 0,
  ]);
  if (all >= MAX_POTS_PER_USER) return "pots";
  if (demo && demos >= MAX_DEMO_POTS_PER_USER) return "demos";
  return null;
}

export async function createDevice(_prev: CreateDeviceState, formData: FormData): Promise<CreateDeviceState> {
  const user = await requireUser("/console/devices");
  const parsed = deviceCreateSchema.safeParse(formObject(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), at: Date.now() };
  if (await potLimitReached(user.id, false)) return { ok: false, limitReached: true, at: Date.now() };
  const { token, tokenHash } = issueDeviceCredentials();
  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      plantId: parsed.data.plantId || null,
      potSize: parsed.data.potSize,
      serial: generateSerial(),
      tokenHash,
    },
  });
  revalidatePath("/console", "layout");
  return { ok: true, at: Date.now(), reveal: { deviceId: device.id, name: device.name, serial: device.serial, token } };
}

export async function updateDevice(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/console/devices/${id}`);
  const device = await ownedDevice(user.id, id);
  if (!device) return { ok: false };
  const raw = formObject(formData);
  // A plant that has left the catalog can't be picked again, but it can be kept.
  const keepPlant = device.plantId !== null && raw.plantId === device.plantId;
  const parsed = deviceCreateSchema.safeParse(keepPlant ? { ...raw, plantId: "" } : raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), at: Date.now() };
  await prisma.device.update({
    where: { id },
    data: { name: parsed.data.name, plantId: keepPlant ? device.plantId : parsed.data.plantId || null, potSize: parsed.data.potSize },
  });
  revalidatePath("/console", "layout");
  return { ok: true, at: Date.now() };
}

export async function rotateDeviceToken(id: string): Promise<TokenReveal | null> {
  const user = await requireUser(`/console/devices/${id}`);
  const device = await ownedDevice(user.id, id);
  if (!device) return null;
  const { token, tokenHash } = issueDeviceCredentials();
  await prisma.device.update({ where: { id }, data: { tokenHash } });
  return { deviceId: id, name: device.name, serial: device.serial, token };
}

export async function deleteDevice(id: string): Promise<void> {
  const user = await requireUser(`/console/devices/${id}`);
  if (await ownedDevice(user.id, id)) await prisma.device.delete({ where: { id } });
  revalidatePath("/console", "layout");
  redirect("/console/devices");
}

/**
 * Create a pot with ~48 h of realistic simulated telemetry so the console can
 * be explored without hardware. Uses the real auto-care controller.
 */
export async function createDemoPot(): Promise<{ deviceId: string } | { limit: "pots" | "demos" }> {
  const user = await requireUser("/console");
  const limit = await potLimitReached(user.id, true);
  if (limit) return { limit };
  const t = await getT("console");
  const companion = await getOrCreateCompanion(user.id);
  const { timeZone, vitalsOptions } = companionClock(companion);
  const plant = getPlant("pothos") ?? null;
  const potSize = "M";
  const now = new Date();
  const readings = simulateTelemetry({
    plant,
    potSize,
    reservoirMl: getPotModel(potSize)?.reservoirMl,
    end: now,
    timeZone,
    quietHours: vitalsOptions.quietHours,
    seed: now.getTime() % 100_000,
  });
  const { tokenHash } = issueDeviceCredentials();
  const device = await prisma.device.create({
    data: {
      userId: user.id,
      name: t("demo.deviceName"),
      serial: generateSerial(DEMO_SERIAL_PREFIX),
      tokenHash,
      plantId: plant?.id ?? null,
      potSize,
      firmwareVersion: "demo-sim",
      lastSeenAt: now,
    },
  });
  await prisma.telemetry.createMany({ data: readings.map((r) => ({ ...r, deviceId: device.id })) });
  revalidatePath("/console", "layout");
  return { deviceId: device.id };
}

// ── Playground ───────────────────────────────────────────────

export async function clearChatHistory(): Promise<void> {
  const user = await requireUser("/console/playground");
  const companion = await getOrCreateCompanion(user.id);
  await prisma.chatMessage.deleteMany({ where: { companionId: companion.id } });
  revalidatePath("/console/playground");
}
