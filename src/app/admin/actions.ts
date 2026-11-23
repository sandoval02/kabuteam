"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { getLeaderboard, scoreBill } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/server";
import { barangayName, parseForm, store as storeSchema, vouchers as vouchersSchema, type FormState as ActionState } from "@/lib/validation";

const done = (ok: string): ActionState => {
  revalidatePath("/", "layout");
  return { ok };
};

export async function renameBarangay(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = parseForm(barangayName, form);
  if ("state" in parsed) return parsed.state;
  const { error } = await createAdminClient().from("barangays").update({ name: parsed.data.name }).eq("id", viewer.barangayId);
  return error ? { error: "Could not rename.", fieldErrors: { name: "That name may already be used" } } : done("Barangay renamed.");
}

export async function reviewBill(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = z.object({ id: z.uuid(), decision: z.enum(["approve", "reject"]) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid request." };
  const admin = createAdminClient();
  const { data: bill, error: billError } = await admin
    .from("bills")
    .select("id, baseline_kwh, status, flag_reasons, households(profiles(barangay_id))")
    .eq("id", parsed.data.id)
    .single();
  if (billError) return { error: "Could not load that bill. Try again." };
  const barangayId = (bill?.households as unknown as { profiles: { barangay_id: string } } | undefined)?.profiles.barangay_id;
  if (!bill || barangayId !== viewer.barangayId) return { error: "Bill not found." };
  if (bill.status !== "flagged") return { error: "This bill was already reviewed." };

  if (parsed.data.decision === "reject") {
    await admin.from("bills").update({ status: "rejected" }).eq("id", bill.id);
  } else {
    await admin.from("bills").update({ status: "approved" }).eq("id", bill.id);
    try {
      await scoreBill(bill.id, bill.baseline_kwh === null ? null : Number(bill.baseline_kwh));
    } catch (scoreError) {
      // Put it back in the queue instead of leaving an approved bill with no score.
      console.error("[reviewBill] score", scoreError);
      await admin.from("scores").delete().eq("bill_id", bill.id);
      await admin
        .from("bills")
        .update({
          status: "flagged",
          flag_reasons: [...(bill.flag_reasons ?? []), "Scoring failed when approved; try again."],
        })
        .eq("id", bill.id);
      revalidatePath("/", "layout");
      return { error: "Could not score this bill. It stays in the review queue; try again." };
    }
  }
  // The reviewed card leaves the queue, so report the result at page level.
  revalidatePath("/", "layout");
  redirect(`/admin?reviewed=${parsed.data.decision}`);
}

export async function addStore(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = parseForm(storeSchema, form);
  if ("state" in parsed) return parsed.state;

  const admin = createAdminClient();
  // ponytail: scans the first 1000 users; use a SQL lookup if the barangay grows past that.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return { error: "Could not look up accounts. Try again." };
  const owner = list?.users.find((u) => u.email?.toLowerCase() === parsed.data.email);
  if (!owner) return { error: "No account with that email.", fieldErrors: { email: "Ask the store owner to create an account first" } };

  const { data: profile } = await admin.from("profiles").select("role, barangay_id").eq("id", owner.id).single();
  if (!profile || profile.barangay_id !== viewer.barangayId) return { error: "That account is not in this barangay.", fieldErrors: { email: "Not in this barangay" } };
  if (profile.role === "admin") return { error: "An admin account can't also be a store.", fieldErrors: { email: "This is an admin account" } };

  const { error } = await admin.from("stores").insert({ barangay_id: viewer.barangayId, name: parsed.data.name, owner_profile_id: owner.id });
  if (error) return { error: error.code === "23505" ? "That account already has a store." : "Could not add the store." };
  await admin.from("profiles").update({ role: "store" }).eq("id", owner.id);
  return done(`${parsed.data.name} added. The owner will see the redeem page next time they sign in.`);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid misreads
const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

export async function issueVouchers(_: ActionState, form: FormData): Promise<ActionState> {
  const viewer = await requireViewer("admin");
  const parsed = parseForm(vouchersSchema, form);
  if ("state" in parsed) return parsed.state;
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: store, error: storeError } = await admin.from("stores").select("id").eq("id", v.store_id).eq("barangay_id", viewer.barangayId).maybeSingle();
  if (storeError) return { error: "Could not check the store. Try again." };
  if (!store) return { error: "Store not found." };

  let board: Awaited<ReturnType<typeof getLeaderboard>>;
  try {
    board = await getLeaderboard(viewer.barangayId);
  } catch {
    return { error: "Could not load the ranking. Try again." };
  }
  const { month, rows } = board;
  if (!month) return { error: "No scored bills yet, so there is no one to reward." };
  const { data: existing, error: existingError } = await admin.from("vouchers").select("household_id").eq("score_month", month);
  if (existingError) return { error: "Could not check existing vouchers. Try again." };
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
  return done(`${winners.length} voucher${winners.length > 1 ? "s" : ""} issued to: ${winners.map((w) => w.label).join(", ")}.`);
}
