"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { scoreBill } from "@/lib/data";
import { APPLIANCE_TYPES, applianceTypeKeys } from "@/lib/extraction/schemas";
import { plausibilityFlags, scoreMonth } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string };

const num = z.coerce.number();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date");
const jsonOf = <T extends z.ZodType>(schema: T) =>
  z.string().transform((s, ctx) => {
    try {
      return schema.parse(JSON.parse(s || "null"));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid data" });
      return z.NEVER;
    }
  });

const BillForm = z
  .object({
    account_number: z.string().trim().regex(/^\d{6,15}$/, "Account number should be 6 to 15 digits"),
    period_start: isoDate,
    period_end: isoDate,
    kwh: num.positive("kWh must be more than 0").max(100000),
    amount_due: num.positive("Amount must be more than 0").max(1000000),
    baseline_kwh: z.union([z.literal("").transform(() => null), num.positive().max(100000)]),
    history: jsonOf(z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), kwh: z.number().nonnegative() })).max(24)),
    extracted: jsonOf(
      z.object({ kwh: z.number().nullable(), amountDue: z.number().nullable(), baseline: z.number().nullable() }).nullable(),
    ),
    photo_path: z.string().max(200),
    served_by: z.string().max(80),
  })
  .refine((b) => b.period_end > b.period_start, { message: "End date must be after start date", path: ["period_end"] });

export async function saveBill(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer("resident");
  const parsed = BillForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
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
  const { data: bill, error } = await admin
    .from("bills")
    .insert({
      household_id: viewer.householdId,
      period_start: b.period_start,
      period_end: b.period_end,
      score_month: scoreMonth(b.period_end),
      kwh: b.kwh,
      amount_due: b.amount_due,
      baseline_kwh: b.baseline_kwh,
      history: b.history,
      photo_path: b.photo_path.startsWith(`${viewer.userId}/`) ? b.photo_path : null,
      status,
      flag_reasons: flags,
      extracted: b.extracted,
      served_by: b.served_by || "manual",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "You already saved a bill for this billing month." };
    console.error("[saveBill]", error);
    return { error: "Could not save the bill. Try again." };
  }

  if (status === "approved") await scoreBill(bill.id, b.baseline_kwh);
  revalidatePath("/", "layout");
  redirect(`/receipt?saved=${status}`);
}

const ApplianceForm = z.object({
  type: z.enum(applianceTypeKeys),
  label: z.string().trim().max(40),
  watts: z.coerce.number().int("Watts must be a whole number").min(1, "Watts must be at least 1").max(10000, "Watts looks too high"),
  hours_per_day: z.coerce.number().min(0).max(24, "A day has 24 hours"),
  is_inverter: z.enum(["yes", "no", "unknown"]),
});

export async function addAppliance(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer("resident");
  const parsed = ApplianceForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
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

export async function deleteAppliance(form: FormData) {
  const viewer = await requireViewer("resident");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return;
  await createAdminClient().from("appliances").delete().eq("id", id.data).eq("household_id", viewer.householdId);
  revalidatePath("/", "layout");
}
