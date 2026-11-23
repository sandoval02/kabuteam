import { test } from "node:test";
import assert from "node:assert/strict";
import {
  costPerHour,
  durationLabel,
  monitoredConsumption,
  monitoredMs,
  nextChecks,
  resolveAlerts,
  verdict,
  type RoomCheck,
  type RoomEntry,
} from "./room-check.ts";

const device = (type: string, label = type, pesosPerHour: number | null = 1.26, watts = 100) => ({
  type,
  label,
  watts,
  pesosPerHour,
});

const check = (over: Partial<RoomCheck> = {}): RoomCheck => ({
  readable: true,
  peoplePresent: false,
  waste: false,
  observation: "",
  devices: [],
  ...over,
});

const entry = (at: number, over: Partial<RoomEntry> = {}): RoomEntry => ({
  ...check(),
  at,
  resolvedAt: null,
  ...over,
});

const waste = (devices = [device("tv", "TV")], over: Partial<RoomCheck> = {}) =>
  check({ waste: true, devices, ...over });

test("room verdict: waste, resolved, unclear, someone there, all clear", () => {
  assert.equal(verdict(waste()).tone, "warning");
  assert.equal(verdict(entry(1, { ...waste(), resolvedAt: 2 })).title, "Naayos na.");
  assert.match(verdict(check({ readable: false })).title, /Hindi malinaw/);
  assert.equal(verdict(check({ peoplePresent: true, devices: [device("tv", "TV")] })).tone, "info");
  assert.equal(verdict(check()).tone, "success");
});

test("cost per hour: sums devices only when the bill rate exists", () => {
  const cost = costPerHour(check({ devices: [device("tv", "TV", 1.26), device("light", "Lights", 0.13)] }));
  assert.ok(cost !== null && Math.abs(cost - 1.39) < 1e-9);
  assert.equal(costPerHour(check({ devices: [device("tv", "TV", null)] })), null);
  assert.equal(costPerHour(check()), null);
});

test("a later readable check resolves alerts whose devices are no longer on", () => {
  const old = entry(1, { ...waste() });
  const resolved = resolveAlerts([old], check({ devices: [device("light", "Lights")] }), 5);
  assert.equal(resolved[0].resolvedAt, 5);
});

test("an alert stays open while any of its devices is still on", () => {
  const old = entry(1, { ...waste([device("tv", "TV"), device("light", "Lights")]) });
  assert.equal(resolveAlerts([old], check({ devices: [device("light", "Lights")] }), 5)[0].resolvedAt, null);
});

test("an unreadable check resolves nothing", () => {
  const old = entry(1, { ...waste() });
  assert.equal(resolveAlerts([old], check({ readable: false }), 5)[0].resolvedAt, null);
});

test("repeat waste checks keep one open alert with the original detection time", () => {
  const first = nextChecks([], waste(), 1_000);
  assert.equal(first.length, 1);
  const second = nextChecks(first, waste([device("tv", "TV"), device("light", "Lights")]), 61_000);
  assert.equal(second.length, 1);
  assert.equal(second[0].at, 1_000);
  assert.equal(second[0].devices.length, 2);
});

test("a different device opens a new alert and resolves the old one", () => {
  const first = nextChecks([], waste(), 1_000);
  const second = nextChecks(first, waste([device("light", "Lights")]), 61_000);
  const open = second.filter((e) => e.waste && !e.resolvedAt);
  assert.equal(open.length, 1);
  assert.equal(open[0].devices[0].type, "light");
  assert.equal(second.find((e) => e.devices[0].type === "tv")?.resolvedAt, 61_000);
});

test("an all-clear check resolves the open alert and is kept as an entry", () => {
  const first = nextChecks([], waste(), 1_000);
  const second = nextChecks(first, check(), 61_000);
  assert.equal(second.length, 2);
  assert.equal(second[0].waste, false);
  assert.equal(second.find((e) => e.waste)?.resolvedAt, 61_000);
});

test("monitored time runs while open, freezes when resolved, and never goes negative", () => {
  const open = entry(1_000, { ...waste() });
  assert.equal(monitoredMs(open, 61_000), 60_000);
  assert.equal(monitoredMs(entry(1_000, { ...waste(), resolvedAt: 31_000 }), 100_000), 30_000);
  assert.equal(monitoredMs(open, 500), 0);
});

test("monitored consumption: 150 W for one hour is 0.15 kWh and priced at the bill rate", () => {
  const laptop = waste([device("computer", "Computer", 1.884, 150)]);
  const e = entry(0, { ...laptop, resolvedAt: 3_600_000 });
  const { kwh, pesos } = monitoredConsumption(e, monitoredMs(e, 9_999_999));
  assert.ok(Math.abs(kwh - 0.15) < 1e-9);
  assert.ok(pesos !== null && Math.abs(pesos - 1.884) < 1e-9);
});

test("monitored consumption has no pesos without a bill rate", () => {
  const { kwh, pesos } = monitoredConsumption(waste([device("computer", "Computer", null, 150)]), 3_600_000);
  assert.ok(Math.abs(kwh - 0.15) < 1e-9);
  assert.equal(pesos, null);
});

test("duration label: under a minute, minutes, hours", () => {
  assert.equal(durationLabel(30_000), "under 1 min");
  assert.equal(durationLabel(60_000), "1 min");
  assert.equal(durationLabel(3_600_000), "1 h");
  assert.equal(durationLabel(3_900_000), "1 h 5 min");
});
