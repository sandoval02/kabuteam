import "server-only";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Fallback chain: each configured model is tried in order; the first output that passes
// Zod validation wins. If all fail, the caller shows the manual entry form.
// See ARCHITECTURE.md → AI extraction.

export type Image = { base64: string; mimeType: string };
export type ExtractResult<T> =
  | { ok: true; data: T; servedBy: string }
  | { ok: false; servedBy: "manual"; attempts: string[] };

type Step = { name: string; run: (img: Image, prompt: string, jsonSchema: object) => Promise<string> };

const TIMEOUT_MS = 15_000;

export class BadInputError extends Error {}

function geminiSteps(): Step[] {
  const key = process.env.GEMINI_API_KEY;
  const models = (process.env.GEMINI_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  if (!key || models.length === 0) return [];
  const ai = new GoogleGenAI({ apiKey: key });
  return models.map((model) => ({
    name: `gemini:${model}`,
    run: async (img, prompt, jsonSchema) => {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ inlineData: { data: img.base64, mimeType: img.mimeType } }, { text: prompt }] }],
        config: { responseMimeType: "application/json", responseJsonSchema: jsonSchema },
      });
      return res.text ?? "";
    },
  }));
}

function anthropicSteps(schema: z.ZodType): Step[] {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return [];
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const client = new Anthropic({ apiKey: key });
  return [
    {
      name: `anthropic:${model}`,
      run: async (img, prompt) => {
        const res = await client.messages.parse({
          model,
          max_tokens: 4000,
          output_config: { format: zodOutputFormat(schema as z.ZodObject) },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: img.mimeType as "image/jpeg" | "image/png" | "image/webp", data: img.base64 },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        });
        if (res.stop_reason === "refusal") throw new Error("refusal");
        return JSON.stringify(res.parsed_output ?? null);
      },
    },
  ];
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
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
  for (const step of [...geminiSteps(), ...anthropicSteps(schema)]) {
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
