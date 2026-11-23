import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { fairScore, type HistoryEntry } from "@/lib/scoring";

// All reads/writes here use the admin client, so callers MUST have checked the viewer first.

export type BillRow = {
  id: string;
  period_start: string;
  period_end: string;
  score_month: string;
  kwh: number;
  amount_due: number;
  history: HistoryEntry[];
  status: "approved" | "flagged" | "rejected";
  flag_reasons: string[];
  served_by: string | null;
};

export type ApplianceRow = {
  id: string;
  type: string;
  label: string;
  watts: number;
  hours_per_day: number;
  is_inverter: boolean | null;
};

export async function getLatestBill(householdId: string): Promise<BillRow | null> {
  const { data } = await createAdminClient()
    .from("bills")
    .select("id, period_start, period_end, score_month, kwh, amount_due, history, status, flag_reasons, served_by")
    .eq("household_id", householdId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { ...data, kwh: Number(data.kwh), amount_due: Number(data.amount_due) } : null;
}

export async function getAppliances(householdId: string): Promise<ApplianceRow[]> {
  const { data } = await createAdminClient()
    .from("appliances")
    .select("id, type, label, watts, hours_per_day, is_inverter")
    .eq("household_id", householdId)
    .order("created_at");
  return (data ?? []).map((a) => ({ ...a, hours_per_day: Number(a.hours_per_day) }));
}

export async function getScore(billId: string) {
  const { data } = await createAdminClient()
    .from("scores")
    .select("baseline_kwh, savings_pct, score")
    .eq("bill_id", billId)
    .maybeSingle();
  return data
    ? { baseline: data.baseline_kwh === null ? null : Number(data.baseline_kwh), savingsPct: Number(data.savings_pct), score: Number(data.score) }
    : null;
}

export async function getBadges(householdId: string): Promise<string[]> {
  const { data } = await createAdminClient().from("badges").select("code").eq("household_id", householdId);
  return (data ?? []).map((b) => b.code);
}

/** Scores an approved bill and awards badges. Idempotent per bill. */
export async function scoreBill(billId: string, baseline: number | null) {
  const admin = createAdminClient();
  const { data: bill, error } = await admin
    .from("bills")
    .select("id, household_id, score_month, kwh, households(profiles(barangay_id))")
    .eq("id", billId)
    .single();
  if (error || !bill) throw new Error("Bill not found");

  const household = bill.households as unknown as { profiles: { barangay_id: string } };
  const result = fairScore(Number(bill.kwh), baseline);
  await admin.from("scores").upsert(
    {
      bill_id: bill.id,
      household_id: bill.household_id,
      barangay_id: household.profiles.barangay_id,
      score_month: bill.score_month,
      baseline_kwh: baseline,
      savings_pct: result.savingsPct,
      score: result.score,
    },
    { onConflict: "bill_id" },
  );

  const badges = ["first_scan"];
  if (result.score >= 10) badges.push("club_10");
  if (result.efficient) badges.push("efficient");
  await admin
    .from("badges")
    .upsert(badges.map((code) => ({ household_id: bill.household_id, code })), { onConflict: "household_id,code", ignoreDuplicates: true });
  return result;
}

export type LeaderRow = { householdId: string; label: string; score: number; savingsPct: number; badges: string[] };

/** Latest month that has scores in the barangay, ranked by fair score. */
export async function getLeaderboard(barangayId: string): Promise<{ month: string | null; rows: LeaderRow[] }> {
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("scores")
    .select("score_month")
    .eq("barangay_id", barangayId)
    .order("score_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return { month: null, rows: [] };

  const { data } = await admin
    .from("scores")
    .select("household_id, score, savings_pct, households(profiles(household_label), badges(code))")
    .eq("barangay_id", barangayId)
    .eq("score_month", latest.score_month)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true });

  const rows = (data ?? []).map((r) => {
    const h = r.households as unknown as { profiles: { household_label: string }; badges: { code: string }[] };
    return {
      householdId: r.household_id,
      label: h.profiles.household_label,
      score: Number(r.score),
      savingsPct: Number(r.savings_pct),
      badges: h.badges.map((b) => b.code),
    };
  });
  return { month: latest.score_month, rows };
}

export const BADGES: Record<string, { label: string; hint: string }> = {
  first_scan: { label: "First Scan", hint: "Scanned a first bill" },
  club_10: { label: "10% Club", hint: "Saved 10% or more against last year" },
  efficient: { label: "Efficient Already", hint: "Used 100 kWh or less in a month" },
  top3: { label: "Top 3", hint: "Finished in the barangay's top 3 savers" },
};

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
}
