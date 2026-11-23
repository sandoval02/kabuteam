"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appliance as ApplianceForm, bill as BillForm, parseForm, type FormState } from "@/lib/validation";
import { requireViewer } from "@/lib/auth";
import { scoreBill } from "@/lib/data";
import { APPLIANCE_TYPES } from "@/lib/extraction/schemas";
import { plausibilityFlags, scoreMonth } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/server";

export async function saveBill(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer("resident");
  const parsed = parseForm(BillForm, form);
  if ("state" in parsed) return parsed.state;
  const b = parsed.data;
  const admin = createAdminClient();

  // Account number: one Meralco account = one household.
  const { data: owner } = await admin.from("households").select("id").eq("account_number", b.account_number).maybeSingle();
  const accountOwnedByOther = !!owner && owner.id !== viewer.householdId;
  const flags = plausibilityFlags({
    kwh: b.kwh,
    amountDue: b.amount_due,
    baseline: b.baseline_kwh,
    extracted: b.extracted,
    accountOwnedByOther,
  });
  if (viewer.accountNumber && viewer.accountNumber !== b.account_number) {
    flags.push("Account number differs from this household's earlier bills");
  }
  if (!viewer.accountNumber && !owner) {
    await admin.from("households").update({ account_number: b.account_number }).eq("id", viewer.householdId);
  }

  const status = flags.length ? "flagged" : "approved";
  const month = scoreMonth(b.period_end);
  const { data: existing, error: existingError } = await admin
    .from("bills")
    .select("id, status, photo_path")
    .eq("household_id", viewer.householdId)
    .eq("score_month", month)
    .maybeSingle();
  if (existingError) {
    console.error("[saveBill] existing", existingError);
    return { error: "Could not save the bill. Try again." };
  }
  if (existing && existing.status !== "rejected") {
    return { error: "You already saved a bill for this billing month.", fieldErrors: { period_end: "This month already has a bill" } };
  }

  const payload = {
    household_id: viewer.householdId,
    period_start: b.period_start,
    period_end: b.period_end,
    score_month: month,
    kwh: b.kwh,
    amount_due: b.amount_due,
    baseline_kwh: b.baseline_kwh,
    history: b.history,
    photo_path: b.photo_path.startsWith(`${viewer.userId}/`) ? b.photo_path : null,
    status,
    flag_reasons: flags,
    extracted: b.extracted,
    served_by: b.served_by || "manual",
  };
  if (existing) {
    await admin.from("scores").delete().eq("bill_id", existing.id);
  }
  const { data: bill, error } = existing
    ? await admin.from("bills").update(payload).eq("id", existing.id).select("id").single()
    : await admin.from("bills").insert(payload).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "You already saved a bill for this billing month.", fieldErrors: { period_end: "This month already has a bill" } };
    console.error("[saveBill]", error);
    return { error: "Could not save the bill. Try again." };
  }

  // A replaced bill must not leave its old photo behind.
  if (existing?.photo_path && existing.photo_path !== payload.photo_path) {
    const { error: removeError } = await admin.storage.from("bill-photos").remove([existing.photo_path]);
    if (removeError) console.error("[saveBill] old photo", removeError.message);
  }

  let scoringFailed = false;
  if (status === "approved") {
    try {
      await scoreBill(bill.id, b.baseline_kwh);
    } catch (scoreError) {
      // The bill is safely saved; send it to review rather than leaving a bill that cannot rank.
      console.error("[saveBill] score", scoreError);
      scoringFailed = true;
      await admin.from("scores").delete().eq("bill_id", bill.id);
      await admin
        .from("bills")
        .update({
          status: "flagged",
          flag_reasons: [...flags, "The score could not be saved automatically; the barangay will check it."],
        })
        .eq("id", bill.id);
    }
  }
  revalidatePath("/", "layout");
  redirect(`/receipt?saved=${scoringFailed ? "flagged" : status}`);
}

export async function addAppliance(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer("resident");
  const parsed = parseForm(ApplianceForm, form);
  if ("state" in parsed) return parsed.state;
  const a = parsed.data;
  const { error } = await createAdminClient()
    .from("appliances")
    .insert({
      household_id: viewer.householdId,
      type: a.type,
      label: a.label || APPLIANCE_TYPES[a.type].label,
      watts: a.watts,
      hours_per_day: a.hours_per_day,
      is_inverter: a.is_inverter === "unknown" ? null : a.is_inverter === "yes",
    });
  if (error) {
    console.error("[addAppliance]", error);
    return { error: "Could not add the appliance. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: `${a.label || APPLIANCE_TYPES[a.type].label} added.` };
}

export async function deleteAppliance(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer("resident");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request." };
  const { data } = await createAdminClient()
    .from("appliances")
    .delete()
    .eq("id", id.data)
    .eq("household_id", viewer.householdId)
    .select("label")
    .maybeSingle();
  revalidatePath("/", "layout");
  return data ? { ok: `${data.label} removed.` } : { error: "That appliance was already removed." };
}
