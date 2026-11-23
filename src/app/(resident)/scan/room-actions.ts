"use server";

import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { monthInManila } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";

const input = z.object({
  startedAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime(),
  kwh: z.number().finite().nonnegative().max(1000),
  pesos: z.number().finite().nonnegative().max(100000).nullable(),
});

export type SaveRoomWasteResult = { ok: true } | { ok: false; error: string };

export async function saveRoomWaste(raw: unknown): Promise<SaveRoomWasteResult> {
  const viewer = await requireViewer("resident");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Could not read the Room check total." };

  const { startedAt, resolvedAt, kwh, pesos } = parsed.data;
  const started = new Date(startedAt);
  const resolved = new Date(resolvedAt);
  const hours = (resolved.getTime() - started.getTime()) / 3_600_000;
  if (!(hours > 0) || hours > 24 * 31) return { ok: false, error: "Could not save this Room check." };
  if (kwh > hours * 20) return { ok: false, error: "Could not save this Room check." };

  const { error } = await createAdminClient().from("room_alerts").insert({
    household_id: viewer.householdId,
    started_at: startedAt,
    resolved_at: resolvedAt,
    kwh: Math.round(kwh * 1000) / 1000,
    pesos: pesos === null ? null : Math.round(pesos * 100) / 100,
    month: monthInManila(resolved),
  });
  if (error && error.code !== "23505") {
    console.error("[saveRoomWaste]", error);
    return { ok: false, error: "Could not save the Room check total." };
  }
  return { ok: true };
}
