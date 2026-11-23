import { test } from "node:test";
import assert from "node:assert/strict";
import { costPerHour, resolveAlerts, verdict, type RoomCheck, type RoomEntry } from "./room-check.ts";

const device = (type: string, label = type, pesosPerHour: number | null = 1.26) => ({
  type,
  label,
  watts: 100,
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
  resolved: false,
  ...over,
});

test("room verdict: waste, resolved, unclear, someone there, all clear", () => {
  assert.equal(verdict(check({ waste: true, devices: [device("tv", "TV")] })).tone, "warning");
  assert.equal(verdict(entry(1, { waste: true, resolved: true })).title, "Naayos na.");
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
  const old = entry(1, { waste: true, devices: [device("tv", "TV")] });
  const resolved = resolveAlerts([old], check({ devices: [device("light", "Lights")] }));
  assert.equal(resolved[0].resolved, true);
  assert.equal(resolved[0].waste, true);
});

test("an alert stays open while any of its devices is still on", () => {
  const old = entry(1, { waste: true, devices: [device("tv", "TV"), device("light", "Lights")] });
  assert.equal(resolveAlerts([old], check({ devices: [device("light", "Lights")] }))[0].resolved, false);
});

test("an unreadable check resolves nothing", () => {
  const old = entry(1, { waste: true, devices: [device("tv", "TV")] });
  assert.equal(resolveAlerts([old], check({ readable: false }))[0].resolved, false);
});

test("already resolved and non-waste entries are left alone", () => {
  const done = entry(1, { waste: true, devices: [device("tv", "TV")], resolved: true });
  const info = entry(2, { devices: [device("tv", "TV")] });
  const [a, b] = resolveAlerts([done, info], check());
  assert.equal(a.resolved, true);
  assert.equal(b.resolved, false);
});

test("all open alerts resolve when the next check sees the room clear", () => {
  const tv = entry(1, { waste: true, devices: [device("tv", "TV")] });
  const lights = entry(2, { waste: true, devices: [device("light", "Lights")] });
  const resolved = resolveAlerts([lights, tv], check());
  assert.deepEqual(
    resolved.map((e) => e.resolved),
    [true, true],
  );
});
