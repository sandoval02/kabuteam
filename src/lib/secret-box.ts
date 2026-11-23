import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Encrypts provider API keys at rest and signs short-lived tokens.
// ponytail: the key is derived from SUPABASE_SECRET_KEY, so rotating that key makes saved provider keys
// unreadable (the scan chain skips them; re-add them). Use a dedicated env var if keys must survive rotation.
const key = () => createHash("sha256").update(`kuryentipid:ai-keys:${process.env.SUPABASE_SECRET_KEY ?? ""}`).digest();

/** AES-256-GCM: "iv.tag.ciphertext", base64url parts. */
export function seal(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function unseal(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export function signatureMatches(payload: string, signature: string): boolean {
  const a = Buffer.from(sign(payload));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const sha256 = (text: string) => createHash("sha256").update(text).digest("base64url");
