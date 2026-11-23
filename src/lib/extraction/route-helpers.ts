import "server-only";
import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

/** Auth + upload validation shared by the extraction routes. */
export async function readImageRequest(
  request: Request,
): Promise<{ viewer: Viewer; bytes: Buffer; mimeType: string } | NextResponse> {
  const viewer = await getViewer();
  if (!viewer) return jsonError(401, "unauthenticated", "Sign in first.");
  if (viewer.role !== "resident") return jsonError(403, "forbidden", "Only residents can scan.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return jsonError(400, "no_photo", "Attach a photo.");
  if (!TYPES.includes(file.type)) return jsonError(400, "bad_type", "Use a JPEG, PNG or WebP photo.");
  if (file.size > MAX_BYTES) return jsonError(413, "too_large", "Photo is larger than 8 MB.");
  return { viewer, bytes: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}
