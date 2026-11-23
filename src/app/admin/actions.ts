"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, scoreBill } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionState } from "@/components/action-form";

const done = (ok: string): ActionState => {
  revalidatePath("/", "layout");
  return { ok };
};

export async function renameBarangay(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const name = z.string().trim().min(3, "Name is too short").max(80).safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const { error } = await createAdminClient().from("barangays").update({ name: name.data }).eq("id", viewer.barangayId);
  return error ? { error: "Could not rename. That name may already exist." } : done("Barangay renamed.");
}

export async function reviewBill(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = z.object({ id: z.uuid(), decision: z.enum(["approve", "reject"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid request." };
  const admin = createAdminClient();
  const { data: bill } = await admin
    .from("bills")
    .select("id, baseline_kwh, status, households(profiles(barangay_id))")
    .eq("id", parsed.data.id)
    .single();
  const barangayId = (bill?.households as unknown as { profiles: { barangay_id: string } } | undefined)?.profiles.barangay_id;
  if (!bill || barangayId !== viewer.barangayId) return { error: "Bill not found." };
  if (bill.status !== "flagged") return { error: "This bill was already reviewed." };

  if (parsed.data.decision === "reject") {
    await admin.from("bills").update({ status: "rejected" }).eq("id", bill.id);
  } else {
    await admin.from("bills").update({ status: "approved" }).eq("id", bill.id);
    await scoreBill(bill.id, bill.baseline_kwh === null ? null : Number(bill.baseline_kwh));
  }
  // The reviewed card leaves the queue, so report the result at page level.
  revalidatePath("/", "layout");
  redirect(`/admin?reviewed=${parsed.data.decision}`);
}

export async function addStore(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = z
    .object({ name: z.string().trim().min(2, "Enter the store name").max(60), email: z.email("Enter the owner's email").toLowerCase() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  // ponytail: scans the first 1000 users; use a SQL lookup if the barangay grows past that.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const owner = list?.users.find((u) => u.email?.toLowerCase() === parsed.data.email);
  if (!owner) return { error: "No account with that email. Ask the store owner to create an account first." };

  const { data: profile } = await admin.from("profiles").select("role, barangay_id").eq("id", owner.id).single();
  if (!profile || profile.barangay_id !== viewer.barangayId) return { error: "That account is not in this barangay." };
  if (profile.role === "admin") return { error: "An admin account can't also be a store." };

  const { error } = await admin.from("stores").insert({ barangay_id: viewer.barangayId, name: parsed.data.name, owner_profile_id: owner.id });
  if (error) return { error: error.code === "23505" ? "That account already has a store." : "Could not add the store." };
  await admin.from("profiles").update({ role: "store" }).eq("id", owner.id);
  return done(`${parsed.data.name} added. The owner will see the redeem page next time they sign in.`);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid misreads
const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

export async function issueVouchers(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = z
    .object({
      store_id: z.uuid("Pick a store"),
      count: z.coerce.number().int().min(1, "At least 1 voucher").max(50),
      amount: z.coerce.number().min(1, "Amount must be at least ₱1").max(5000),
      days: z.coerce.number().int().min(1).max(90),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: store } = await admin.from("stores").select("id").eq("id", v.store_id).eq("barangay_id", viewer.barangayId).maybeSingle();
  if (!store) return { error: "Store not found." };

  const { month, rows } = await getLeaderboard(viewer.barangayId);
  if (!month) return { error: "No scored bills yet, so there is no one to reward." };
  const { data: existing } = await admin.from("vouchers").select("household_id").eq("score_month", month);
  const already = new Set((existing ?? []).map((e) => e.household_id));
  const winners = rows.filter((r) => r.score > 0 && !already.has(r.householdId)).slice(0, v.count);
  if (winners.length === 0) return { error: "Every top saver this month already has a voucher." };

  const expires = new Date(Date.now() + v.days * 86_400_000).toISOString();
  const { error } = await admin.from("vouchers").insert(
    winners.map((w) => ({ code: newCode(), household_id: w.householdId, store_id: store.id, amount: v.amount, score_month: month, expires_at: expires })),
  );
  if (error) {
    console.error("[issueVouchers]", error);
    return { error: "Could not issue vouchers. Try again." };
  }
  await admin
    .from("badges")
    .upsert(rows.slice(0, 3).map((r) => ({ household_id: r.householdId, code: "top3" })), { onConflict: "household_id,code", ignoreDuplicates: true });
  return done(`${winners.length} voucher${winners.length > 1 ? "s" : ""} issued to: ${winners.map((w) => w.label).join(", ")}.`);
}
