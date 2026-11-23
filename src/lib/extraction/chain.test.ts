import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { BadInputError, runChain, type Step } from "./chain.ts";

const schema = z.object({ kwh: z.number() });
const img = { base64: "", mimeType: "image/jpeg" };
const fails = (name: string, status: number, ms = 0): Step => ({
  name,
  run: () => new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error(`HTTP ${status}`), { status })), ms)),
});
const answers = (name: string): Step => ({ name, run: async () => JSON.stringify({ kwh: 117 }) });
const run = (steps: Step[], budgetMs?: number) => runChain(steps, img, schema, "", {}, budgetMs);

test("chain: a model that refuses the request (400) is skipped, the next one answers", async () => {
  const result = await run([fails("a", 400), fails("b", 503), answers("c")]);
  assert.deepEqual(result, { ok: true, data: { kwh: 117 }, servedBy: "c" });
});

test("chain: every model refusing means the photo is bad; refusals mixed with outages mean manual entry", async () => {
  await assert.rejects(run([fails("a", 400), fails("b", 400)]), BadInputError);
  const mixed = await run([fails("a", 400), fails("b", 429)]);
  assert.equal(mixed.ok, false);
});

test("chain: no model is started after the time budget", async () => {
  const result = await run([fails("slow", 503, 30), answers("late")], 10);
  assert.equal(result.ok, false);
  assert.deepEqual(!result.ok && result.attempts, ["slow=server_503", "out of time"]);
});
