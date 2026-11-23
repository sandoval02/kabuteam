"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { seal, sha256, sign, signatureMatches, unseal } from "@/lib/secret-box";
import { TIMEOUT_MS, providerStep, withTimeout, type ProviderConfig } from "@/lib/extraction/extract";
import { AI_PRESETS, type PresetKey } from "@/lib/extraction/presets";
import { BILL_PROMPT, BillExtraction } from "@/lib/extraction/schemas";
import { aiProvider, fieldErrorsOf, type FormState } from "@/lib/validation";

export type ProviderState = FormState & { log?: string[]; passed?: boolean; token?: string };
export type TestResult = { passed: boolean; ms: number; at: string; log: string[] };

// A synthetic Meralco-style bill, also used by the e2e run. next.config.ts traces it into /admin.
const SAMPLE_BILL = path.join(process.cwd(), "scripts/fixtures/sample-bill.jpg");
const TOKEN_TTL_MS = 15 * 60_000;

const clock = () => new Intl.DateTimeFormat("en-PH", { timeStyle: "medium", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date());
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** Sends the sample bill to one provider and writes each step down in plain words. */
async function runTest(p: ProviderConfig): Promise<TestResult> {
  const preset = AI_PRESETS[p.preset];
  const bytes = await readFile(SAMPLE_BILL);
  const where = preset.kind === "openai" ? ` at ${preset.baseUrl ?? p.base_url}` : "";
  const log = [`${clock()}  Sample bill photo, ${Math.round(bytes.length / 1024)} KB`, `${clock()}  Sending it to ${preset.label}, model ${p.model}${where}`];
  const started = Date.now();
  const finish = (passed: boolean, line: string): TestResult => {
    log.push(`${clock()}  ${line}`, passed ? "PASS: this provider can read bills." : "FAIL: fix the settings and run the test again.");
    return { passed, ms: Date.now() - started, at: new Date().toISOString(), log };
  };

  let text: string;
  try {
    const jsonSchema = z.toJSONSchema(BillExtraction, { target: "draft-7" });
    text = await withTimeout(providerStep(p, BillExtraction).run({ base64: bytes.toString("base64"), mimeType: "image/jpeg" }, BILL_PROMPT, jsonSchema));
  } catch (err) {
    const message = ((err as Error)?.message ?? "Unknown error").replaceAll(p.api_key, "••••").slice(0, 200);
    return finish(false, `No usable answer after ${seconds(Date.now() - started)}. ${message === "timeout" ? `It took longer than ${TIMEOUT_MS / 1000} s.` : message}`);
  }
  log.push(`${clock()}  Answered in ${seconds(Date.now() - started)}`);

  let parsed: ReturnType<typeof BillExtraction.safeParse> | null = null;
  try {
    parsed = BillExtraction.safeParse(JSON.parse(text));
  } catch {}
  if (!parsed?.success) return finish(false, `The answer isn't in the bill format: ${text.slice(0, 120) || "(empty)"}`);
  const b = parsed.data;
  if (!b.readable || b.kwh === null || b.amount_due === null) return finish(false, "It answered, but couldn't read the kWh or the amount due.");
  return finish(
    true,
    `Read ${b.kwh} kWh, amount due ₱${b.amount_due.toLocaleString("en-PH")}, account ${b.account_number ?? "not found"}, ${b.history.length} months of history.`,
  );
}

// A passing test hands back a signed token for exactly these settings; "Add" only accepts a matching, fresh one.
const fingerprint = (p: ProviderConfig) => [p.preset, p.base_url ?? "", p.model, sha256(p.api_key)].join("\n");
type TokenBody = { exp: number; ms: number; at: string; log: string[]; f: string };

function issueToken(p: ProviderConfig, r: TestResult): string {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS, ms: r.ms, at: r.at, log: r.log, f: fingerprint(p) } satisfies TokenBody);
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

function readToken(token: string, p: ProviderConfig): TokenBody | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const payload = Buffer.from(body, "base64url").toString();
  if (!signatureMatches(payload, signature)) return null;
  const t = JSON.parse(payload) as TokenBody;
  return t.exp > Date.now() && t.f === fingerprint(p) ? t : null;
}

/** "Run test" and "Add to the chain" share one form; the clicked button sends intent=test or intent=add. */
export async function providerAction(form: FormData): Promise<ProviderState> {
  const viewer = await requireViewer("admin");
  const raw = Object.fromEntries(form);
  const parsed = aiProvider.safeParse(raw);
  if (!parsed.success) return { error: "Check the highlighted fields.", fieldErrors: fieldErrorsOf(aiProvider, raw) ?? {} };
  const v = parsed.data;
  const p: ProviderConfig = { preset: v.preset, base_url: v.preset === "custom" ? v.base_url : null, model: v.model, api_key: v.api_key };

  if (form.get("intent") === "test") {
    const r = await runTest(p);
    return { log: r.log, passed: r.passed, token: r.passed ? issueToken(p, r) : undefined };
  }

  const tested = readToken(String(form.get("token") ?? ""), p);
  if (!tested) return { error: "Run the test again first: the settings changed, or the test is more than 15 minutes old." };
  const { error } = await createAdminClient()
    .from("ai_providers")
    .insert({
      preset: p.preset,
      base_url: p.base_url,
      model: p.model,
      api_key_enc: seal(p.api_key),
      key_hint: p.api_key.slice(-4),
      last_test: { passed: true, ms: tested.ms, at: tested.at, log: tested.log },
      created_by: viewer.userId,
    });
  if (error) {
    console.error("[providerAction]", error.message);
    return { error: "Could not save the provider. Try again." };
  }
  revalidatePath("/admin");
  return { ok: `${AI_PRESETS[p.preset].label} · ${p.model} added. Scans try it when the providers above it fail.` };
}

export async function retestProvider(_: FormState, form: FormData): Promise<FormState> {
  await requireViewer("admin");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request." };
  const admin = createAdminClient();
  const { data: row } = await admin.from("ai_providers").select("preset, base_url, model, api_key_enc").eq("id", id.data).maybeSingle();
  if (!row) return { error: "That provider was removed. Reload the page." };
  let apiKey: string;
  try {
    apiKey = unseal(row.api_key_enc);
  } catch {
    return { error: "Its saved key can't be read any more (the server key changed). Remove it and add it again." };
  }
  const r = await runTest({ preset: row.preset as PresetKey, base_url: row.base_url, model: row.model, api_key: apiKey });
  await admin.from("ai_providers").update({ last_test: r }).eq("id", id.data);
  revalidatePath("/admin");
  return r.passed ? { ok: `Test passed in ${seconds(r.ms)}.` } : { error: "Test failed. Open its test log below to see why." };
}

export async function removeProvider(_: FormState, form: FormData): Promise<FormState> {
  await requireViewer("admin");
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request." };
  const { error } = await createAdminClient().from("ai_providers").delete().eq("id", id.data);
  if (error) return { error: "Could not remove it. Try again." };
  revalidatePath("/admin");
  return { ok: "Provider removed from the chain." };
}
