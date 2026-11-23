// The fallback chain's loop, free of server imports so it can be unit-tested (chain.test.ts).
import type { z } from "zod";

export type Image = { base64: string; mimeType: string };
export type Step = { name: string; run: (img: Image, prompt: string, jsonSchema: object) => Promise<string> };
export type ExtractResult<T> =
  | { ok: true; data: T; servedBy: string }
  | { ok: false; servedBy: "manual"; attempts: string[] };

export const TIMEOUT_MS = 15_000;
// The extract routes may run 60 s. No model is started after this, so with TIMEOUT_MS a scan always answers in time.
export const CHAIN_BUDGET_MS = 35_000;

export class BadInputError extends Error {}

export function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS))]);
}

function reasonOf(err: unknown): string {
  const e = err as { status?: number; message?: string };
  if (e?.status === 429) return "quota";
  if (e?.status && e.status >= 500) return `server_${e.status}`;
  if (e?.message === "timeout") return "timeout";
  return (e?.message ?? "error").slice(0, 80);
}

/** Tries each step in order; the first output that passes the schema wins, else the caller shows manual entry. */
export async function runChain<S extends z.ZodType>(
  steps: Step[],
  img: Image,
  schema: S,
  prompt: string,
  jsonSchema: object,
  budgetMs = CHAIN_BUDGET_MS,
): Promise<ExtractResult<z.infer<S>>> {
  const deadline = Date.now() + budgetMs;
  const attempts: string[] = [];
  let refused = 0;
  for (const step of steps) {
    if (Date.now() > deadline) {
      attempts.push("out of time");
      break;
    }
    try {
      const text = await withTimeout(step.run(img, prompt, jsonSchema));
      const parsed = schema.safeParse(JSON.parse(text));
      if (parsed.success) {
        console.info(`[extract] served by ${step.name}`, attempts.length ? `after ${attempts.join(", ")}` : "");
        return { ok: true, data: parsed.data, servedBy: step.name };
      }
      attempts.push(`${step.name}=invalid_output`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 413) throw new BadInputError(reasonOf(err)); // too big for any model
      if (status === 400) refused++; // this model can't take the request (no image or JSON support); the next one may
      attempts.push(`${step.name}=${reasonOf(err)}`);
    }
  }
  // Every model refused the photo itself: ask for another photo (saves quota on a bad file).
  if (steps.length > 0 && refused === steps.length) throw new BadInputError(attempts.join(", "));
  console.warn("[extract] all steps failed:", attempts.join(", ") || "no steps configured");
  return { ok: false, servedBy: "manual", attempts };
}
