import { test } from "node:test";
import assert from "node:assert/strict";
import { baselineFromHistory, earnedBadges, fairScore, pesosPerHour, plausibilityFlags, reconcile, swapTip } from "./index.ts";

test("baseline uses same month last year, else mean of last 3", () => {
  const history = [
    { month: "2025-10", kwh: 210 },
    { month: "2026-08", kwh: 180 },
    { month: "2026-09", kwh: 190 },
    { month: "2026-10", kwh: 200 },
  ];
  assert.equal(baselineFromHistory(history, "2026-10"), 210);
  assert.equal(baselineFromHistory(history.slice(1), "2026-11"), 190);
  assert.equal(baselineFromHistory([], "2026-11"), null);
});

test("fair score: small house beats big house by percent, cap, low-usage floor", () => {
  const small = fairScore(150, 200); // 25%
  const big = fairScore(940, 1000); // 6%
  assert.equal(small.score, 25);
  assert.equal(big.score, 6);
  assert.ok(small.score > big.score);
  assert.equal(fairScore(100, 1000).savingsPct, 30); // capped
  const tiny = fairScore(60, 62); // ~3% but ≤100 kWh
  assert.equal(tiny.score, 15);
  assert.equal(tiny.efficient, true);
  assert.equal(fairScore(300, null).score, 0);
  assert.equal(fairScore(300, 200).score, -50);
});

test("badges use actual savings, not the low-usage floor", () => {
  assert.deepEqual(earnedBadges(fairScore(82, 85)), ["first_scan", "efficient"]); // 3.5% saved
  assert.deepEqual(earnedBadges(fairScore(117, 150)), ["first_scan", "club_10"]); // 22% saved
  assert.deepEqual(earnedBadges(fairScore(940, 1000)), ["first_scan"]); // 6% saved
});

test("reconcile: under-estimate leaves an Unaccounted line; totals add up", () => {
  const r = reconcile(
    [
      { id: "a", label: "Aircon", type: "aircon", watts: 1000, hoursPerDay: 4, isInverter: false },
      { id: "b", label: "Fan", type: "electric_fan", watts: 50, hoursPerDay: 10, isInverter: null },
    ],
    { kwh: 250, amountDue: 3000, days: 30 },
  );
  assert.equal(r.rate, 12);
  assert.equal(r.lines[0].id, "a"); // 120 kWh
  assert.equal(r.lines[0].pesos, 1440);
  assert.ok(r.unaccounted);
  const sum = r.lines.reduce((s, l) => s + l.kwh, 0) + r.unaccounted!.kwh;
  assert.equal(Math.round(sum), 250);
});

test("reconcile: a small gap still becomes an Unaccounted line", () => {
  const r = reconcile(
    [{ id: "a", label: "Fan", type: "electric_fan", watts: 100, hoursPerDay: 10, isInverter: null }],
    { kwh: 33, amountDue: 396, days: 30 },
  );
  assert.ok(r.unaccounted);
  assert.equal(r.unaccounted!.kwh, 3);
  assert.equal(r.lines.reduce((s, l) => s + l.kwh, 0) + r.unaccounted!.kwh, 33);
});

test("reconcile: over-estimate is scaled down to the bill exactly", () => {
  const r = reconcile(
    [{ id: "a", label: "Aircon", type: "aircon", watts: 2000, hoursPerDay: 10, isInverter: true }],
    { kwh: 300, amountDue: 3600, days: 30 },
  );
  assert.equal(r.scaledDown, true);
  assert.equal(r.lines[0].kwh, 300);
  assert.equal(r.unaccounted, null);
});

test("plausibility flags bad rate, foreign account, big edits", () => {
  assert.deepEqual(
    plausibilityFlags({ kwh: 200, amountDue: 2400, baseline: 210, extracted: { kwh: 200, amountDue: 2400, baseline: 210 }, accountOwnedByOther: false }),
    [],
  );
  const flags = plausibilityFlags({
    kwh: 100,
    amountDue: 5000,
    baseline: 300,
    extracted: { kwh: 200, amountDue: 5000, baseline: 210 },
    accountOwnedByOther: true,
  });
  assert.equal(flags.length, 5);
  assert.ok(flags.some((f) => f.includes("more than 50%")));
});

test("swap tip: non-inverter aircon gives saving and payback", () => {
  const tip = swapTip({ id: "a", label: "Aircon", type: "aircon", kwh: 120, pesos: 1500, share: 0.5, isInverter: false, hoursPerDay: 8 });
  assert.equal(tip.monthlySaving, 600);
  assert.equal(tip.paybackMonths, 50);
});

test("room check: a 100 W TV at ₱12.56/kWh costs ₱1.26 an hour", () => {
  assert.equal(pesosPerHour(100, 12.56), 1.26);
  assert.equal(pesosPerHour(1000, 0), 0);
});
