import "server-only";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { unseal } from "@/lib/secret-box";
import { AI_PRESETS, type PresetKey } from "./presets";

// Fallback chain: each configured model is tried in order; the first output that passes
// Zod validation wins. If all fail, the caller shows the manual entry form.
// Order: providers set in the server environment, then providers the admin added. See ARCHITECTURE.md → AI extraction.

export type Image = { base64: string; mimeType: string };
export type ExtractResult<T> =
  | { ok: true; data: T; servedBy: string }
  | { ok: false; servedBy: "manual"; attempts: string[] };

export type Step = { name: string; run: (img: Image, prompt: string, jsonSchema: object) => Promise<string> };
export type ProviderConfig = { preset: PresetKey; base_url: string | null; model: string; api_key: string };

export const TIMEOUT_MS = 20_000;

export class BadInputError extends Error {}

function geminiStep(apiKey: string, model: string, name = `gemini:${model}`): Step {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name,
    run: async (img, prompt, jsonSchema) => {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ inlineData: { data: img.base64, mimeType: img.mimeType } }, { text: prompt }] }],
        config: { responseMimeType: "application/json", responseJsonSchema: jsonSchema },
      });
      return res.text ?? "";
    },
  };
}

function anthropicStep(apiKey: string, model: string, schema: z.ZodType, name = `anthropic:${model}`): Step {
  const client = new Anthropic({ apiKey });
  return {
    name,
    run: async (img, prompt) => {
      const res = await client.messages.parse({
        model,
        max_tokens: 4000,
        output_config: { format: zodOutputFormat(schema as z.ZodObject) },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: img.mimeType as "image/jpeg" | "image/png" | "image/webp", data: img.base64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      });
      if (res.stop_reason === "refusal") throw new Error("refusal");
      return JSON.stringify(res.parsed_output ?? null);
    },
  };
}

/** OpenAI-compatible chat completions (OpenAI, xAI Grok, Groq, OpenRouter, ...), image as a data URL. */
function openaiStep(baseUrl: string, apiKey: string, model: string, name: string): Step {
  return {
    name,
    run: async (img, prompt, jsonSchema) => {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `${prompt}\nReply with one JSON object that matches this JSON Schema:\n${JSON.stringify(jsonSchema)}` },
                { type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.base64}` } },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const message = (JSON.parse(body || "{}")?.error?.message as string | undefined) ?? body;
        // A 400 from a third-party provider usually means the model can't take images or JSON mode,
        // not a bad photo, so it carries no status and the chain moves on instead of stopping.
        throw Object.assign(new Error(`HTTP ${res.status}: ${message}`.slice(0, 200)), res.status === 400 ? {} : { status: res.status });
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content ?? "";
      return text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1); // some models wrap JSON in ``` fences
    },
  };
}

/** One step for a provider the admin added. */
export function providerStep(p: ProviderConfig, schema: z.ZodType): Step {
  const preset = AI_PRESETS[p.preset];
  const name = `${p.preset}:${p.model}`;
  if (preset.kind === "gemini") return geminiStep(p.api_key, p.model, name);
  if (preset.kind === "anthropic") return anthropicStep(p.api_key, p.model, schema, name);
  return openaiStep(preset.baseUrl ?? p.base_url ?? "", p.api_key, p.model, name);
}

/** Steps from the server environment (GEMINI_*, ANTHROPIC_*). */
function envSteps(schema: z.ZodType): Step[] {
  const gemini = process.env.GEMINI_API_KEY;
  const models = (process.env.GEMINI_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  const anthropic = process.env.ANTHROPIC_API_KEY;
  return [
    ...(gemini ? models.map((m) => geminiStep(gemini, m)) : []),
    ...(anthropic ? [anthropicStep(anthropic, process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", schema)] : []),
  ];
}

/** Names of the environment steps, in order, for the admin page (no keys). */
export const envStepNames = () => envSteps(z.object({})).map((s) => s.name);

/** Steps for the providers the admin added, oldest first. A key that can't be decrypted is skipped. */
async function savedSteps(schema: z.ZodType): Promise<Step[]> {
  const { data, error } = await createAdminClient().from("ai_providers").select("preset, base_url, model, api_key_enc").order("created_at");
  if (error) {
    console.error("[extract] could not load saved providers", error.message);
    return [];
  }
  return data.flatMap((r) => {
    try {
      return [providerStep({ ...r, preset: r.preset as PresetKey, api_key: unseal(r.api_key_enc) }, schema)];
    } catch {
      console.error(`[extract] could not decrypt the key for ${r.preset}:${r.model}; re-add it on the admin page`);
      return [];
    }
  });
}

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

export async function extract<S extends z.ZodType>(img: Image, schema: S, prompt: string): Promise<ExtractResult<z.infer<S>>> {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
  const attempts: string[] = [];
  for (const step of [...envSteps(schema), ...(await savedSteps(schema))]) {
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
      if (status === 400 || status === 413) throw new BadInputError(reasonOf(err));
      attempts.push(`${step.name}=${reasonOf(err)}`);
    }
  }
  console.warn("[extract] all steps failed:", attempts.join(", ") || "no steps configured");
  return { ok: false, servedBy: "manual", attempts };
}
