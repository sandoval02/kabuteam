// Seeds the demo barangay as a pilot that has run since June 2026: 20 households with a bill for each monthly
// round (June–October 2026), rankings, badges, vouchers redeemed at three partner stores, store payouts and
// Room check alerts. Clearly demo data: every account is @tipidtayo.test and listed below; others are never touched.
// Each run creates missing demo accounts and resets their data to this state, so re-run it after a rehearsal.
// resident@ (Mang Jun) starts without his October bill: the live demo scans scripts/fixtures/sample-bill.jpg
// (his account, 3123456789) and he becomes #1 at 22%. October's vouchers are issued live too.
// Usage: set DEMO_PASSWORD in .env.local, then: npm run seed:demo
import { randomInt, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { APPLIANCE_TYPES } from "../src/lib/extraction/schemas.ts";
import { monitoredConsumption } from "../src/lib/room-check.ts";
import { earnedBadges, effectiveRate, fairScore, pesosPerHour, plausibilityFlags } from "../src/lib/scoring/index.ts";

process.loadEnvFile(".env.local");
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 8) throw new Error("Set DEMO_PASSWORD (8+ characters) in .env.local");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = async (query) => {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

const ROUNDS = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]; // October is the current round
const RATE = { "2026-06": 12.22, "2026-07": 12.35, "2026-08": 12.49, "2026-09": 12.41, "2026-10": 12.56 }; // ₱/kWh
const SEASON = [0.85, 0.87, 0.97, 1.16, 1.2, 1.07, 1.0, 0.96, 0.93, 1.0, 0.93, 0.88]; // Jan–Dec: hot Apr–May, cool Dec–Feb
// Past rounds' ₱50 vouchers [issued on, how many]: about a month after the bills, once everyone has scanned.
const ISSUE = { "2026-06": ["2026-07-27", 3], "2026-07": ["2026-08-26", 3], "2026-08": ["2026-09-28", 4], "2026-09": ["2026-10-27", 5] };
const UNUSED = new Set(["2026-06:demo-santos", "2026-09:demo-santos"]); // one expired voucher, one still active

const shift = (month, d) => {
  const [y, m] = month.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
};
const manila = (date, time) => new Date(`${date}T${time}:00+08:00`).toISOString();
const plusDays = (iso, days) => new Date(Date.parse(iso) + days * 86_400_000).toISOString();
const round2 = (n) => Math.round(n * 100) / 100;
// The same small wobble (−3% … +3%) on every run, so usage charts aren't perfectly smooth.
const wobble = (key) => {
  let h = 7;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 100_003;
  return ((h % 61) - 30) / 1000;
};
const ap = (type, watts, hours, is_inverter = null, label = APPLIANCE_TYPES[type].label) => ({ type, label, watts, hours_per_day: hours, is_inverter });

// base: kWh in October 2025. save: % saved in each round (Jun–Oct 2026) against the same month last year; null = no bill
// that round. now: October 2026 kWh where the docs quote it. typed: a typed-in October bill waiting for the admin.
// room: Room check alerts [days ago, start time, minutes left on, device types]. store: where they spend vouchers.
const HOUSEHOLDS = [
  {
    who: "resident", name: "Mang Jun", account: "3123456789", day: 15, store: "nena",
    // The sample bill's own 12-month chart; October (117 kWh) is scanned live in the demo.
    usage: { "2025-06": 175, "2025-07": 172, "2025-08": 165, "2025-09": 150, "2025-10": 150, "2025-11": 140, "2025-12": 132, "2026-01": 128, "2026-02": 131, "2026-03": 146, "2026-04": 174, "2026-05": 180, "2026-06": 161, "2026-07": 150, "2026-08": 144, "2026-09": 140 },
    // No aircon: the demo adds it from its sticker (1,050 W, 2 h) and the receipt keeps an Unaccounted line.
    appliances: [ap("refrigerator", 120, 7), ap("electric_fan", 60, 6), ap("tv", 80, 2), ap("light", 30, 4)],
    room: [[21, "14:05", 75, ["electric_fan"]], [18, "21:40", 90, ["tv", "light"]], [15, "08:15", 270, ["electric_fan"]], [10, "13:10", 210, ["aircon"]], [6, "19:30", 35, ["light"]], [3, "22:50", 460, ["tv"]], [1, "10:20", 35, ["electric_fan", "light"]]],
  },
  {
    who: "neighbor", account: "2200000002", day: 15, store: "ramon", base: 1000, save: [2, 3, 4, 5, 6], now: 940,
    appliances: [ap("aircon", 1500, 10, false, "Living room aircon"), ap("aircon", 1000, 8, true, "Bedroom aircon"), ap("refrigerator", 200, 12, false), ap("water_dispenser", 500, 4), ap("tv", 120, 8)],
    room: [[17, "13:00", 150, ["aircon"]], [8, "09:10", 30, ["tv"]], [4, "23:00", 360, ["electric_fan"]]],
  },
  { who: "demo-santos", account: "3300000003", day: 12, store: "nena", base: 320, save: [12, 11, 12, 14, 16.25], now: 268, appliances: [ap("aircon", 900, 5, false, "Window aircon"), ap("refrigerator", 150, 10, false), ap("tv", 100, 5)] },
  { who: "demo-reyes", account: "3300000004", day: 9, store: "nena", base: 85, save: [4, 5, 3, 6, 3.5], now: 82, appliances: [ap("electric_fan", 60, 10), ap("refrigerator", 100, 8), ap("rice_cooker", 600, 1), ap("light", 10, 6)] },
  { who: "demo-cruz", account: "3300000005", day: 18, store: "ramon", base: 540, save: [6, 7, 8, 7.5, 8], now: 497, appliances: [ap("aircon", 1100, 8, true, "Inverter aircon"), ap("refrigerator", 180, 10, true), ap("washing_machine", 500, 1), ap("water_dispenser", 500, 4), ap("computer", 150, 6)] },
  { who: "demo-garcia", account: "3300000006", day: 11, store: "nena", base: 210, save: [-3, -2, -4, -6, -5.7], now: 222, appliances: [ap("aircon", 1000, 3, false), ap("refrigerator", 150, 10, false), ap("tv", 120, 8), ap("computer", 150, 6)] },
  // ₱900 typed for 300 kWh (₱3/kWh): the admin's review demo.
  { who: "demo-bautista", account: "3300000007", day: 16, store: "ramon", base: 330, save: [null, 5, 6.5, 8.5, null], typed: { kwh: 300, amount: 900, baseline: 330, at: "2026-11-12T09:40" }, appliances: [ap("aircon", 1000, 6, false), ap("refrigerator", 150, 10), ap("tv", 100, 4)] },
  { who: "demo-villanueva", account: "3300000008", day: 14, store: "ramon", base: 240, save: [14, 9, 10, 8, 9], appliances: [ap("aircon", 900, 4, false), ap("refrigerator", 150, 10), ap("tv", 100, 5), ap("electric_fan", 60, 8)] },
  { who: "demo-mendoza", account: "3300000009", day: 8, store: "nena", base: 180, save: [9, 8, 7.5, 10, 11], appliances: [ap("refrigerator", 150, 9), ap("electric_fan", 60, 10), ap("tv", 100, 6), ap("rice_cooker", 600, 1), ap("washing_machine", 500, 1)] },
  { who: "demo-ramos", account: "3300000010", day: 10, store: "ramon", base: 360, save: [null, 17, 14, 13, 12], appliances: [ap("aircon", 1000, 6, true, "Inverter aircon"), ap("refrigerator", 180, 10, true), ap("tv", 120, 6), ap("computer", 150, 8)] },
  { who: "demo-aquino", account: "3300000011", day: 13, store: "nena", base: 130, save: [null, 4, 5, 4.5, 5], appliances: [ap("refrigerator", 120, 8), ap("electric_fan", 60, 10), ap("tv", 80, 4), ap("rice_cooker", 600, 1)] },
  // Hasn't scanned October yet.
  { who: "demo-castillo", account: "3300000012", day: 19, store: "ramon", base: 420, save: [null, 10.5, 9, 11.5, null], appliances: [ap("aircon", 1200, 6, false), ap("refrigerator", 200, 10), ap("water_dispenser", 500, 3), ap("tv", 120, 6)] },
  { who: "demo-flores", account: "3300000013", day: 17, store: "lorna", base: 290, save: [null, null, 19, 15.5, 17.5], appliances: [ap("aircon", 1000, 4, true), ap("refrigerator", 150, 10), ap("electric_fan", 60, 8), ap("flat_iron", 1000, 0.5)] },
  { who: "demo-torres", account: "3300000014", day: 20, store: "ramon", base: 520, save: [null, null, 11, 12, 13], appliances: [ap("aircon", 1500, 7, false), ap("refrigerator", 200, 12), ap("electric_stove", 1500, 1), ap("tv", 120, 6)] },
  { who: "demo-navarro", account: "3300000015", day: 9, store: "nena", base: 200, save: [null, null, 6, 9.5, 10], appliances: [ap("refrigerator", 150, 10), ap("tv", 100, 6), ap("electric_fan", 60, 12), ap("computer", 150, 4)] },
  { who: "demo-domingo", account: "3300000016", day: 12, store: "ramon", base: 260, save: [null, null, null, 16, 19.5], appliances: [ap("aircon", 900, 4, false), ap("refrigerator", 150, 10), ap("washing_machine", 500, 1), ap("electric_fan", 60, 6)] },
  { who: "demo-salazar", account: "3300000017", day: 14, store: "lorna", base: 380, save: [null, null, null, 18.5, 14.5], appliances: [ap("aircon", 1100, 6, true, "Inverter aircon"), ap("refrigerator", 180, 10, true), ap("microwave", 1000, 0.3), ap("tv", 100, 5)] },
  { who: "demo-pascual", account: "3300000018", day: 18, store: "nena", base: 150, save: [null, null, null, 3, 2], appliances: [ap("refrigerator", 120, 9), ap("electric_fan", 60, 8), ap("tv", 80, 4)] },
  { who: "demo-delarosa", account: "3300000019", day: 16, store: "nena", base: 170, save: [null, null, null, null, 8], appliances: [ap("refrigerator", 150, 10), ap("electric_fan", 60, 10), ap("tv", 100, 4), ap("rice_cooker", 600, 1)] },
  // A copy of Bahay Santos's bill (another household's account number): the second review item.
  { who: "demo-lim", day: 12, store: "nena", base: 300, save: [null, null, null, null, null], typed: { kwh: 268, amount: 3366.08, baseline: 320, at: "2026-11-19T20:15", othersAccount: true }, appliances: [ap("refrigerator", 150, 10), ap("electric_fan", 60, 8)] },
];

// Payouts [date, method, reference, store answered on, dispute note]; no answer = still waiting for the store.
// Mang Ramon's later redemptions stay unpaid, so the admin sees Record payment.
const STORES = {
  nena: {
    email: "store@tipidtayo.test", owner: "Aling Nena", name: "Aling Nena Sari-sari Store", signedUp: "2026-06-01", approved: "2026-06-02",
    payouts: [["2026-08-14", "gcash", "GC-7310-0841", "2026-08-15"], ["2026-09-15", "cash", "OR-00098", "2026-09-16"], ["2026-10-16", "gcash", "GC-8841-2207", "2026-10-17"], ["2026-11-18", "cash", "OR-00127"]],
  },
  ramon: {
    email: "demo-store-ramon@tipidtayo.test", owner: "Mang Ramon", name: "Mang Ramon Sari-sari Store", signedUp: "2026-06-08", approved: "2026-06-10",
    payouts: [["2026-08-14", "gcash", "GC-7310-0852", "2026-08-14"], ["2026-10-16", "bank", "BPI-2210-4471", "2026-10-18"]],
  },
  lorna: {
    email: "demo-store-lorna@tipidtayo.test", owner: "Lorna", name: "Tindahan ni Lorna", signedUp: "2026-08-30", approved: "2026-09-02",
    payouts: [["2026-10-16", "gcash", "GC-8841-2231", "2026-10-17"], ["2026-11-18", "gcash", "GC-9902-1176", "2026-11-19", "The GCash transfer hasn't arrived yet."]],
  },
  baby: { email: "demo-store-baby@tipidtayo.test", owner: "Tita Baby", name: "Tita Baby's Store", signedUp: "2026-11-21", approved: null, payouts: [] }, // waits for the admin
};
const ADMIN = { email: "admin@tipidtayo.test", name: "Barangay Admin", joined: "2026-05-25" };

// ── Plan everything first (no database writes) ───────────────────────
function usageOf(h) {
  if (h.usage) return h.usage;
  const u = {};
  for (let m = "2025-06"; m <= "2026-10"; m = shift(m, 1)) {
    u[m] = m === "2025-10" ? h.base : Math.round(h.base * SEASON[Number(m.slice(5)) - 1] * (1 + wobble(h.who + m)));
  }
  ROUNDS.forEach((r, i) => {
    if (h.save[i] !== null) u[r] = Math.round(u[shift(r, -12)] * (1 - h.save[i] / 100));
  });
  if (h.now) u["2026-10"] = h.now;
  return u;
}

for (const h of HOUSEHOLDS) {
  const u = usageOf(h);
  const day = String(h.day).padStart(2, "0");
  h.bills = ROUNDS.filter((r, i) => (h.usage ? r in u : h.save[i] !== null)).map((r) => {
    const kwh = u[r];
    const baseline = u[shift(r, -12)];
    const amount = round2(kwh * RATE[r] * (1 + wobble(`${h.who}${r}rate`) / 3));
    return {
      id: randomUUID(), period_start: `${shift(r, -1)}-${day}`, period_end: `${r}-${day}`, score_month: r, kwh, amount_due: amount, baseline_kwh: baseline,
      history: Array.from({ length: 12 }, (_, k) => ({ month: shift(r, k - 12), kwh: u[shift(r, k - 12)] })),
      status: "approved", flag_reasons: [], extracted: { kwh, amountDue: amount, baseline }, served_by: "gemini:gemini-3.5-flash-lite",
      created_at: plusDays(manila(`${r}-${day}`, "19:30"), 5 + Math.round(Math.abs(wobble(h.who + r)) * 100)),
      score: fairScore(kwh, baseline),
    };
  });
  if (h.typed) {
    const t = h.typed;
    h.bills.push({
      id: randomUUID(), period_start: `2026-09-${day}`, period_end: `2026-10-${day}`, score_month: "2026-10", kwh: t.kwh, amount_due: t.amount, baseline_kwh: t.baseline, history: [],
      status: "flagged", flag_reasons: plausibilityFlags({ kwh: t.kwh, amountDue: t.amount, baseline: t.baseline, extracted: null, accountOwnedByOther: Boolean(t.othersAccount) }),
      extracted: null, served_by: "manual", created_at: new Date(`${t.at}:00+08:00`).toISOString(),
    });
  }
  h.joined = plusDays(h.bills.map((b) => b.created_at).sort()[0], -2);
}

// Rankings as the app builds them: by score, earlier scans first on a tie.
const ranking = (round) =>
  HOUSEHOLDS.flatMap((h) => h.bills.filter((b) => b.score && b.score_month === round).map((b) => ({ h, b })))
    .sort((x, y) => y.b.score.score - x.b.score.score || x.b.created_at.localeCompare(y.b.created_at));

const vouchers = Object.entries(ISSUE).flatMap(([round, [date, count]], roundIndex) =>
  ranking(round).filter((r) => r.b.score.score > 0).slice(0, count).map(({ h }, k) => {
    const created = manila(date, "10:00");
    const store = STORES[h.store].approved <= date ? h.store : "nena";
    const used = !UNUSED.has(`${round}:${h.who}`);
    return { id: randomUUID(), h, store, score_month: round, amount: 50, created_at: created, expires_at: plusDays(created, 30), redeemed_at: used ? plusDays(created, 2 + ((k * 3 + roundIndex) % 7) + k / 12) : null };
  }),
);

const payouts = Object.entries(STORES).flatMap(([key, s]) =>
  s.payouts.map(([date, method, reference, answered, note]) => {
    const paidAt = manila(date, "10:00");
    const paid = vouchers.filter((v) => v.store === key && v.redeemed_at && v.redeemed_at < paidAt && !v.payout);
    const payout = { id: randomUUID(), key, method, reference, paid_at: paidAt, amount: paid.length * 50, voucher_count: paid.length, status: answered ? (note ? "disputed" : "confirmed") : "pending", store_note: note ?? null, responded_at: answered ? manila(answered, "08:30") : null };
    for (const v of paid) v.payout = payout;
    return payout;
  }),
).filter((p) => p.voucher_count > 0);

// Badges as scoreBill awards them: earned on the bill that first qualified; Top 3 once a round's top 3 has scanned.
for (const h of HOUSEHOLDS) h.badges = new Map();
const award = (h, code, at) => h.badges.has(code) || h.badges.set(code, at);
for (const h of HOUSEHOLDS) for (const b of h.bills.filter((x) => x.score)) for (const code of earnedBadges(b.score)) award(h, code, b.created_at);
for (const round of ROUNDS) {
  const top = ranking(round).filter((r) => r.b.score.score > 0).slice(0, 3);
  const settled = top.map((r) => r.b.created_at).sort().at(-1);
  if (top.length >= 2) for (const { h } of top) award(h, "top3", settled);
}

for (const round of ROUNDS) {
  const winners = new Set(vouchers.filter((v) => v.score_month === round).map((v) => v.h.who));
  console.log(`${round}: ${ranking(round).map(({ h, b }) => `${winners.has(h.who) ? "*" : ""}${h.who.replace("demo-", "")} ${b.score.score}`).join(", ")}`);
}

// ── Accounts ─────────────────────────────────────────────────────────
const accounts = [
  ...HOUSEHOLDS.map((h) => ({ email: `${h.who}@tipidtayo.test`, role: "resident", name: h.name ?? null, joined: h.joined, h })),
  ...Object.values(STORES).map((s) => ({ email: s.email, role: "store", name: s.owner, joined: manila(s.signedUp, "16:00"), s })),
  { email: ADMIN.email, role: "admin", name: ADMIN.name, joined: manila(ADMIN.joined, "09:00") },
];
const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
for (const a of accounts) {
  a.id = list.users.find((u) => u.email === a.email)?.id;
  if (a.id) continue;
  const { data, error } = await db.auth.admin.createUser({ email: a.email, password, email_confirm: true });
  if (error) throw error;
  a.id = data.user.id;
  console.log(`created ${a.email}`);
}
const ids = accounts.map((a) => a.id);
const profiles = await must(db.from("profiles").select("id, barangay_id, household_label, households(id)").in("id", ids));
for (const a of accounts) {
  const p = profiles.find((row) => row.id === a.id);
  a.profile = p;
  a.householdId = (Array.isArray(p.households) ? p.households[0] : p.households).id;
  if (a.h) a.h.householdId = a.householdId;
}
const homeIds = accounts.map((a) => a.householdId);
const barangayId = profiles[0].barangay_id;

// Fail before changing anything if a real household already holds a demo account number.
const taken = await must(db.from("households").select("account_number, id").in("account_number", HOUSEHOLDS.flatMap((h) => h.account ?? [])));
const clash = taken.find((row) => !homeIds.includes(row.id));
if (clash) throw new Error(`Account ${clash.account_number} belongs to a non-demo household; change it in seed-demo.mjs.`);

// ── Reset the demo accounts' data ────────────────────────────────────
const photos = (await must(db.from("bills").select("photo_path").in("household_id", homeIds).not("photo_path", "is", null))).map((b) => b.photo_path);
if (photos.length) await must(db.storage.from("bill-photos").remove(photos));
await must(db.from("vouchers").delete().in("household_id", homeIds));
const ownerIds = accounts.filter((a) => a.s).map((a) => a.id);
const oldStores = (await must(db.from("stores").select("id").in("owner_profile_id", ownerIds))).map((s) => s.id);
// The app never deletes payouts (audit trail); the demo's own are reset once no remaining voucher points at them.
const kept = (await must(db.from("vouchers").select("payout_id").in("store_id", oldStores).not("payout_id", "is", null))).map((v) => v.payout_id);
const oldPayouts = db.from("payouts").delete().in("store_id", oldStores);
await must(kept.length ? oldPayouts.not("id", "in", `(${kept.join(",")})`) : oldPayouts);
for (const table of ["bills", "badges", "appliances", "room_alerts"]) await must(db.from(table).delete().in("household_id", homeIds));
await must(db.from("extraction_attempts").delete().in("profile_id", ids)); // a full hourly AI cap for the demo

// ── Write the demo ───────────────────────────────────────────────────
await must(db.from("profiles").upsert(accounts.map((a) => ({ id: a.id, barangay_id: a.profile.barangay_id, household_label: a.profile.household_label, role: a.role, display_name: a.name, created_at: a.joined, consented_at: a.joined }))));
await must(db.from("households").upsert(accounts.map((a) => ({ id: a.householdId, profile_id: a.id, account_number: a.h?.account ?? null, created_at: a.joined }))));
const storeRows = await must(
  db.from("stores").upsert(
    accounts.filter((a) => a.s).map((a) => ({ barangay_id: barangayId, name: a.s.name, owner_profile_id: a.id, created_at: a.joined, approved_at: a.s.approved && manila(a.s.approved, "11:00") })),
    { onConflict: "owner_profile_id" },
  ).select("id, owner_profile_id"),
);
const storeId = Object.fromEntries(accounts.filter((a) => a.s).map((a) => [Object.keys(STORES).find((k) => STORES[k] === a.s), storeRows.find((s) => s.owner_profile_id === a.id).id]));
await must(db.from("barangays").update({ voucher_budget: 500 }).eq("id", barangayId));

const adminId = accounts.find((a) => a.role === "admin").id;
await must(db.from("appliances").insert(HOUSEHOLDS.flatMap((h) => h.appliances.map((a, i) => ({ household_id: h.householdId, ...a, created_at: plusDays(h.joined, 1 + i / 24) })))));
const bills = HOUSEHOLDS.flatMap((h) => h.bills.map((b) => ({ ...b, household_id: h.householdId })));
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the score goes to its own table below
await must(db.from("bills").insert(bills.map(({ score, ...b }) => b)));
await must(db.from("scores").insert(bills.filter((b) => b.score).map((b) => ({ bill_id: b.id, household_id: b.household_id, barangay_id: barangayId, score_month: b.score_month, baseline_kwh: b.baseline_kwh, savings_pct: b.score.savingsPct, score: b.score.score, created_at: b.created_at }))));
await must(db.from("badges").insert(HOUSEHOLDS.flatMap((h) => [...h.badges].map(([code, at]) => ({ household_id: h.householdId, code, awarded_at: at })))));
if (payouts.length) await must(db.from("payouts").insert(payouts.map(({ key, ...p }) => ({ ...p, store_id: storeId[key], recorded_by: adminId }))));
const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
await must(db.from("vouchers").insert(vouchers.map(({ h, store, payout, ...v }) => ({ ...v, code: Array.from({ length: 6 }, () => CODE[randomInt(CODE.length)]).join(""), household_id: h.householdId, store_id: storeId[store], payout_id: payout?.id ?? null }))));

// Room check alerts, priced the way the Room check route prices them: own appliance watts, latest bill's rate.
const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
const alerts = HOUSEHOLDS.flatMap((h) => {
  const latest = h.bills.toSorted((a, b) => b.period_end.localeCompare(a.period_end))[0];
  const rate = effectiveRate(latest.amount_due, latest.kwh);
  return (h.room ?? []).map(([daysAgo, time, minutes, types]) => {
    const started = manila(plusDays(`${today}T00:00:00Z`, -daysAgo).slice(0, 10), time);
    const devices = types.map((type) => {
      const watts = h.appliances.find((a) => a.type === type)?.watts ?? APPLIANCE_TYPES[type].watts;
      return { type, label: APPLIANCE_TYPES[type].label, watts, pluggedIn: null, pesosPerHour: pesosPerHour(watts, rate) }; // null: AI unsure, counted as plugged in
    });
    const energy = monitoredConsumption({ devices }, minutes * 60_000);
    return {
      household_id: h.householdId, started_at: started, resolved_at: plusDays(started, minutes / 1440), devices, created_at: started,
      kwh: Math.round(energy.kwh * 1000) / 1000, pesos: round2(energy.pesos), month: new Date(Date.parse(started) + 8 * 3_600_000).toISOString().slice(0, 7),
    };
  });
});
await must(db.from("room_alerts").insert(alerts));

const labelOf = (who) => accounts.find((a) => a.h?.who === who).profile.household_label;
console.log(
  `\nDemo ready in one barangay: ${HOUSEHOLDS.length} households, ${bills.length} bills (${ROUNDS[0]} to ${ROUNDS.at(-1)}), ${vouchers.length} vouchers, ${payouts.length} payouts, ${alerts.length} Room check alerts.`,
  `\nReview queue: ${HOUSEHOLDS.filter((h) => h.typed).map((h) => labelOf(h.who)).join(", ")}. Pending store: ${STORES.baby.name}.`,
  `\nMang Jun is resident@tipidtayo.test (${labelOf("resident")}); scan scripts/fixtures/sample-bill.jpg to put him at #1.`,
);
