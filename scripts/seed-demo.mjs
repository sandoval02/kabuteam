// Seeds the demo barangay with realistic example households (clearly demo data: @tipidtayo.test emails).
// Usage: set DEMO_PASSWORD in .env.local, then: npm run seed:demo
// Safe to re-run: accounts that already exist are left as they are.
import { createClient } from "@supabase/supabase-js";
import { fairScore } from "../src/lib/scoring/index.ts";

process.loadEnvFile(".env.local");
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 8) throw new Error("Set DEMO_PASSWORD (8+ characters) in .env.local");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const MONTH = "2026-10";
const HISTORY_MONTHS = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
// Philippine seasonality: hot April-May, cool Dec-Feb.
const SEASON = [1.0, 0.93, 0.88, 0.85, 0.87, 0.97, 1.16, 1.2, 1.07, 1.0, 0.96, 0.93];
const RATE = 12.56; // ₱/kWh, Oct 2026 example

const ap = (type, label, watts, hours, is_inverter = null) => ({ type, label, watts, hours_per_day: hours, is_inverter });
const HOUSEHOLDS = [
  { who: "resident", account: "1100000001", lastYear: 150, now: 117, appliances: [ap("aircon", "Bedroom aircon", 1000, 2, false), ap("refrigerator", "Refrigerator", 150, 10, false), ap("electric_fan", "Electric fan", 60, 8)] },
  { who: "neighbor", account: "2200000002", lastYear: 1000, now: 940, appliances: [ap("aircon", "Living room aircon", 1500, 10, false), ap("aircon", "Bedroom aircon", 1000, 8, true), ap("refrigerator", "Refrigerator", 200, 12, false)] },
  { who: "demo-santos", account: "3300000003", lastYear: 320, now: 268, appliances: [ap("aircon", "Window aircon", 900, 5, false), ap("refrigerator", "Ref", 150, 10, false), ap("tv", "TV", 100, 5)] },
  { who: "demo-reyes", account: "3300000004", lastYear: 85, now: 82, appliances: [ap("electric_fan", "Fan", 60, 10), ap("rice_cooker", "Rice cooker", 600, 1), ap("light", "Lights", 10, 6)] },
  { who: "demo-cruz", account: "3300000005", lastYear: 540, now: 497, appliances: [ap("aircon", "Inverter aircon", 1100, 8, true), ap("refrigerator", "Ref", 180, 10, true), ap("washing_machine", "Washing machine", 500, 1)] },
  { who: "demo-garcia", account: "3300000006", lastYear: 210, now: 222, appliances: [ap("refrigerator", "Ref", 150, 10, false), ap("tv", "TV", 120, 8), ap("computer", "Computer", 150, 6)] },
  { who: "demo-bautista", account: "3300000007", lastYear: 410, now: 300, amount: 900, appliances: [ap("aircon", "Aircon", 1000, 6, false)] }, // rate ₱3/kWh: lands in the admin's review queue
];

const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
const existing = new Set(list.users.map((u) => u.email));

async function ensureUser(email, role) {
  if (existing.has(email)) return null;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (role) await db.from("profiles").update({ role }).eq("id", data.user.id);
  return data.user.id;
}

for (const h of HOUSEHOLDS) {
  const email = `${h.who}@tipidtayo.test`;
  const id = await ensureUser(email);
  if (!id) {
    console.log(`skip ${email} (exists)`);
    continue;
  }
  const { data: p } = await db.from("profiles").select("household_label, barangay_id, households(id)").eq("id", id).single();
  const householdId = (Array.isArray(p.households) ? p.households[0] : p.households).id;
  await db.from("households").update({ account_number: h.account }).eq("id", householdId);

  const history = HISTORY_MONTHS.map((month, i) => ({ month, kwh: Math.round(h.lastYear * SEASON[i]) }));
  const amount = h.amount ?? Math.round(h.now * RATE * 100) / 100;
  const flagged = amount / h.now < 8;
  const { data: bill, error } = await db
    .from("bills")
    .insert({
      household_id: householdId, period_start: "2026-09-15", period_end: "2026-10-15", score_month: MONTH,
      kwh: h.now, amount_due: amount, baseline_kwh: h.lastYear, history,
      status: flagged ? "flagged" : "approved",
      flag_reasons: flagged ? [`Rate ₱${(amount / h.now).toFixed(2)}/kWh is outside ₱8–₱20`] : [],
      served_by: "demo-seed",
    })
    .select("id")
    .single();
  if (error) throw error;
  if (!flagged) {
    const s = fairScore(h.now, h.lastYear);
    await db.from("scores").insert({ bill_id: bill.id, household_id: householdId, barangay_id: p.barangay_id, score_month: MONTH, baseline_kwh: h.lastYear, savings_pct: s.savingsPct, score: s.score });
    const badges = ["first_scan", ...(s.score >= 10 ? ["club_10"] : []), ...(s.efficient ? ["efficient"] : [])];
    await db.from("badges").upsert(badges.map((code) => ({ household_id: householdId, code })), { onConflict: "household_id,code", ignoreDuplicates: true });
  }
  await db.from("appliances").insert(h.appliances.map((a) => ({ household_id: householdId, ...a })));
  console.log(`created ${email} → ${p.household_label}${flagged ? " (flagged for review)" : ""}`);
}

// Admin + store accounts for the demo.
const adminId = await ensureUser("admin@tipidtayo.test", "admin");
console.log(adminId ? "created admin@tipidtayo.test" : "skip admin@tipidtayo.test (exists)");
const storeId = await ensureUser("store@tipidtayo.test", "store");
if (storeId) {
  const { data: sp } = await db.from("profiles").select("barangay_id").eq("id", storeId).single();
  await db.from("stores").insert({ barangay_id: sp.barangay_id, name: "Aling Nena Sari-sari Store", owner_profile_id: storeId, approved_at: new Date().toISOString() });
  console.log("created store@tipidtayo.test → Aling Nena Sari-sari Store");
} else console.log("skip store@tipidtayo.test (exists)");

// Demo store payouts (once): September vouchers redeemed at the demo store, one payment the store
// confirmed and one still waiting for it. Seeded directly with the secret key; in the app, payouts
// are only written by the record_payout / respond_payout database functions.
const { data: demoStore } = await db.from("stores").select("id").eq("name", "Aling Nena Sari-sari Store").maybeSingle();
const { data: everyone } = await db.auth.admin.listUsers({ perPage: 1000 });
const demoAdmin = everyone.users.find((u) => u.email === "admin@tipidtayo.test");
const { count: payoutCount } = demoStore ? await db.from("payouts").select("id", { count: "exact", head: true }).eq("store_id", demoStore.id) : { count: 1 };
if (demoStore && demoAdmin && !payoutCount) {
  const { data: homes } = await db.from("households").select("id").in("account_number", ["1100000001", "2200000002", "3300000003"]);
  const code = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const { data: vs, error: vErr } = await db
    .from("vouchers")
    .insert(homes.map((h, i) => ({ code: code(), household_id: h.id, store_id: demoStore.id, amount: 50, score_month: "2026-09", expires_at: "2026-11-30T00:00:00Z", redeemed_at: `2026-10-0${3 + i}T09:00:00Z` })))
    .select("id");
  if (vErr) throw vErr;
  const pay = async (row, voucherIds) => {
    const { data, error } = await db.from("payouts").insert({ store_id: demoStore.id, recorded_by: demoAdmin.id, voucher_count: voucherIds.length, amount: 50 * voucherIds.length, ...row }).select("id").single();
    if (error) throw error;
    await db.from("vouchers").update({ payout_id: data.id }).in("id", voucherIds);
  };
  await pay({ method: "gcash", reference: "GC-8841-2207", paid_at: "2026-10-20T10:00:00Z", status: "confirmed", responded_at: "2026-10-21T08:30:00Z" }, vs.slice(0, 2).map((v) => v.id));
  await pay({ method: "cash", reference: "OR-00127", paid_at: "2026-11-05T09:00:00Z" }, vs.slice(2).map((v) => v.id));
  console.log("created demo payouts: ₱100 confirmed, ₱50 waiting for the store");
} else console.log("skip demo payouts (exist)");
