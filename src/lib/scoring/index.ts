// Pure scoring logic: no I/O, so it can be unit-tested with plain asserts.
// Rules are documented in ARCHITECTURE.md → Core logic.

export type HistoryEntry = { month: string; kwh: number }; // month = "YYYY-MM"

export type ApplianceInput = {
  id: string;
  label: string;
  type: string;
  watts: number;
  hoursPerDay: number;
  isInverter: boolean | null;
};

export type ReceiptLine = {
  id: string;
  label: string;
  type: string;
  kwh: number;
  pesos: number;
  share: number; // 0..1 of the bill
  isInverter: boolean | null;
  hoursPerDay: number;
};

export type Receipt = {
  lines: ReceiptLine[]; // sorted by cost, highest first
  unaccounted: { kwh: number; pesos: number; share: number } | null;
  totalKwh: number;
  totalPesos: number;
  rate: number;
  scaledDown: boolean; // estimates exceeded the bill and were scaled to fit
};

export const SAVINGS_CAP = 30;
export const LOW_USAGE_KWH = 100;
export const LOW_USAGE_FLOOR = 15;
export const UNACCOUNTED_THRESHOLD = 0.15;
export const UNACCOUNTED_MIN_KWH = 0.5; // below this, rounding noise is not worth a line
export const RATE_MIN = 8;
export const RATE_MAX = 20;
export const EDIT_TOLERANCE = 0.1;
export const REVIEW_SAVINGS = 0.5; // raw savings above this need a human check

const round2 = (n: number) => Math.round(n * 100) / 100;

export function effectiveRate(amountDue: number, kwh: number): number {
  if (kwh <= 0) return 0;
  return round2(amountDue / kwh);
}

export function daysInPeriod(start: string, end: string): number {
  const ms = Date.parse(end) - Date.parse(start);
  const days = Math.round(ms / 86_400_000);
  return days > 0 && days < 70 ? days : 30;
}

export function scoreMonth(periodEnd: string): string {
  return periodEnd.slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Same month last year; else mean of the 3 most recent earlier months; else null. */
export function baselineFromHistory(history: HistoryEntry[], month: string): number | null {
  const lastYear = shiftMonth(month, -12);
  const exact = history.find((h) => h.month === lastYear && h.kwh > 0);
  if (exact) return exact.kwh;
  const earlier = history
    .filter((h) => h.month < month && h.kwh > 0)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 3);
  if (earlier.length === 0) return null;
  return round2(earlier.reduce((s, h) => s + h.kwh, 0) / earlier.length);
}

export type FairScore = { savingsPct: number; score: number; efficient: boolean };

export function fairScore(kwh: number, baseline: number | null): FairScore {
  const raw = baseline && baseline > 0 ? ((baseline - kwh) / baseline) * 100 : 0;
  const savingsPct = round2(Math.max(-100, Math.min(SAVINGS_CAP, raw)));
  const efficient = kwh <= LOW_USAGE_KWH;
  const score = efficient ? Math.max(savingsPct, LOW_USAGE_FLOOR) : savingsPct;
  return { savingsPct, score: round2(score), efficient };
}

/** Badges earned by this bill. Top 3 is awarded from the leaderboard separately. */
export function earnedBadges(score: FairScore): string[] {
  const codes = ["first_scan"];
  if (score.savingsPct >= 10) codes.push("club_10");
  if (score.efficient) codes.push("efficient");
  return codes;
}

export function reconcile(
  appliances: ApplianceInput[],
  bill: { kwh: number; amountDue: number; days: number },
): Receipt {
  const rate = effectiveRate(bill.amountDue, bill.kwh);
  const raw = appliances.map((a) => ({ a, kwh: (a.watts * a.hoursPerDay * bill.days) / 1000 }));
  const rawSum = raw.reduce((s, r) => s + r.kwh, 0);
  const scale = rawSum > bill.kwh ? bill.kwh / rawSum : 1;

  const lines: ReceiptLine[] = raw
    .map(({ a, kwh }) => {
      const k = round2(kwh * scale);
      return {
        id: a.id,
        label: a.label,
        type: a.type,
        kwh: k,
        pesos: round2(k * rate),
        share: bill.kwh > 0 ? k / bill.kwh : 0,
        isInverter: a.isInverter,
        hoursPerDay: a.hoursPerDay,
      };
    })
    .sort((x, y) => y.pesos - x.pesos);

  const gap = round2(bill.kwh - lines.reduce((s, l) => s + l.kwh, 0));
  const gapShare = bill.kwh > 0 ? gap / bill.kwh : 0;
  // Show every material gap, not only the warning-sized ones: the visible lines
  // must add up to the bill total. The page still reserves the warning notice for gaps
  // above UNACCOUNTED_THRESHOLD.
  const unaccounted =
    appliances.length > 0 && gap > UNACCOUNTED_MIN_KWH
      ? { kwh: gap, pesos: round2(gap * rate), share: gapShare }
      : null;

  return {
    lines,
    unaccounted,
    totalKwh: bill.kwh,
    totalPesos: bill.amountDue,
    rate,
    scaledDown: scale < 1,
  };
}

export type PlausibilityInput = {
  kwh: number;
  amountDue: number;
  baseline: number | null;
  extracted: { kwh: number | null; amountDue: number | null; baseline: number | null } | null;
  accountOwnedByOther: boolean;
};

/** Returns human-readable reasons; empty array = plausible. */
export function plausibilityFlags(input: PlausibilityInput): string[] {
  const reasons: string[] = [];
  const rate = effectiveRate(input.amountDue, input.kwh);
  if (rate < RATE_MIN || rate > RATE_MAX) {
    reasons.push(`Rate ₱${rate.toFixed(2)}/kWh is outside ₱${RATE_MIN}–₱${RATE_MAX}`);
  }
  if (input.accountOwnedByOther) reasons.push("Account number belongs to another household");
  if (input.baseline && input.baseline > 0 && (input.baseline - input.kwh) / input.baseline > REVIEW_SAVINGS) {
    reasons.push("Savings of more than 50% vs last year need barangay review");
  }
  const edited = (typed: number | null, ai: number | null | undefined) =>
    typed !== null && ai !== null && ai !== undefined && ai > 0 && Math.abs(typed - ai) / ai > EDIT_TOLERANCE;
  if (input.extracted) {
    if (edited(input.kwh, input.extracted.kwh)) reasons.push("kWh edited more than 10% from the scanned value");
    if (edited(input.amountDue, input.extracted.amountDue)) reasons.push("Amount edited more than 10% from the scanned value");
    if (edited(input.baseline, input.extracted.baseline)) reasons.push("Last year's kWh edited more than 10% from the scanned value");
  }
  return reasons;
}

// ── Swap tips ────────────────────────────────────────────────────────
// Estimates, labelled as such in the UI. Upgrade prices are typical PH retail (Nov 2026).
const INVERTER_SAVING = 0.4;
const UPGRADE_COST: Record<string, number> = { aircon: 30000, refrigerator: 25000 };

export type SwapTip = { lineId: string; text: string; monthlySaving: number; paybackMonths: number | null };

export function swapTip(line: ReceiptLine): SwapTip {
  const pesos = line.pesos;
  if ((line.type === "aircon" || line.type === "refrigerator") && line.isInverter === false) {
    const saving = round2(pesos * INVERTER_SAVING);
    const what = line.type === "aircon" ? "an inverter aircon" : "an inverter ref";
    return {
      lineId: line.id,
      text: `Switch to ${what}: about 40% less power`,
      monthlySaving: saving,
      paybackMonths: saving > 0 ? Math.ceil(UPGRADE_COST[line.type] / saving) : null,
    };
  }
  if (line.type === "aircon" && line.hoursPerDay > 2) {
    const saving = round2((pesos * 2) / line.hoursPerDay);
    return { lineId: line.id, text: "Run it 2 fewer hours a day (set a sleep timer)", monthlySaving: saving, paybackMonths: null };
  }
  if (line.type === "refrigerator") {
    const saving = round2(pesos * 0.1);
    return {
      lineId: line.id,
      text: "Check the door seal and keep it away from the wall and stove",
      monthlySaving: saving,
      paybackMonths: null,
    };
  }
  const saving = round2(pesos * 0.25);
  return { lineId: line.id, text: "Use it a quarter less, and unplug it when not in use", monthlySaving: saving, paybackMonths: null };
}
