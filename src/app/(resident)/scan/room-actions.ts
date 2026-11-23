"use server";

import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { monthInManila } from "@/lib/data";
import { applianceTypeKeys } from "@/lib/extraction/schemas";
import { createAdminClient } from "@/lib/supabase/server";

const device = z.object({
  type: z.enum(applianceTypeKeys),
  label: z.string().trim().min(1).max(60),
  watts: z.number().finite().nonnegative().max(20000),
  pluggedIn: z.boolean().nullable(),
  pesosPerHour: z.number().finite().nonnegative().max(1000).nullable(),
});

const devices = z.array(device).min(1).max(10);

const input = z
  .object({
    startedAt: z.iso.datetime(),
    resolvedAt: z.iso.datetime().nullable(),
    devices,
    kwh: z.number().finite().nonnegative().max(1000).nullable(),
    pesos: z.number().finite().nonnegative().max(100000).nullable(),
  })
  .refine((v) => (v.resolvedAt === null ? v.kwh === null && v.pesos === null : v.kwh !== null), {
    message: "Resolve the alert with its kWh.",
  });

const updateInput = z.object({ startedAt: z.iso.datetime(), devices });

export type SaveRoomAlertResult = { ok: true } | { ok: false; error: string };

export async function saveRoomAlert(raw: unknown): Promise<SaveRoomAlertResult> {
  const viewer = await requireViewer("resident");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Could not save the Room check alert." };

  const { startedAt, resolvedAt, devices, kwh, pesos } = parsed.data;
  const started = new Date(startedAt);
  const resolved = resolvedAt ? new Date(resolvedAt) : null;
  if (resolved) {
    const hours = (resolved.getTime() - started.getTime()) / 3_600_000;
    if (!(hours > 0) || hours > 24 * 31) return { ok: false, error: "Could not save this Room check." };
    if ((kwh ?? 0) > hours * 20) return { ok: false, error: "Could not save this Room check." };
  }

  const payload = {
    household_id: viewer.householdId,
    started_at: startedAt,
    resolved_at: resolvedAt,
    devices,
    kwh: kwh === null ? null : Math.round(kwh * 1000) / 1000,
    pesos: pesos === null ? null : Math.round(pesos * 100) / 100,
    month: monthInManila(started),
  };
  const admin = createAdminClient();
  const { error } = resolved
    ? await admin.from("room_alerts").upsert(payload, { onConflict: "household_id,started_at" })
    : await admin
        .from("room_alerts")
        .upsert(payload, { onConflict: "household_id,started_at", ignoreDuplicates: true });

  if (error) {
    console.error("[saveRoomAlert]", error);
    return { ok: false, error: "Could not save the Room check alert." };
  }
  return { ok: true };
}

export async function updateRoomAlertDevices(raw: unknown): Promise<SaveRoomAlertResult> {
  const viewer = await requireViewer("resident");
  const parsed = updateInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Could not save the plugged-in state." };

  const { error } = await createAdminClient()
    .from("room_alerts")
    .update({ devices: parsed.data.devices })
    .eq("household_id", viewer.householdId)
    .eq("started_at", parsed.data.startedAt)
    .is("resolved_at", null);
  if (error) {
    console.error("[updateRoomAlertDevices]", error);
    return { ok: false, error: "Could not save the plugged-in state." };
  }
  return { ok: true };
}
