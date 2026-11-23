import "server-only";
import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const LIMIT_PER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;

export const jsonError = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

/** Best-effort hourly cap. A limiter failure must not block a legitimate scan. */
async function checkExtractionLimit(profileId: string, kind: "bill" | "appliance") {
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error } = await admin
    .from("extraction_attempts")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .gte("created_at", since);
  if (error) {
    console.error("[extract] rate limit check", error.message);
    return null;
  }
  if ((count ?? 0) >= LIMIT_PER_HOUR) {
    return jsonError(429, "rate_limited", "You have reached the scan limit for this hour. Try again later.");
  }
  const { error: insertError } = await admin.from("extraction_attempts").insert({ profile_id: profileId, kind });
  if (insertError) console.error("[extract] rate limit insert", insertError.message);
  return null;
}

/** Auth + upload validation shared by the extraction routes. */
export async function readImageRequest(
  request: Request,
  kind: "bill" | "appliance",
): Promise<{ viewer: Viewer; bytes: Buffer; mimeType: string } | NextResponse> {
  let viewer: Viewer | null;
  try {
    viewer = await getViewer();
  } catch {
    return jsonError(500, "server_error", "Could not check your account. Try again.");
  }
  if (!viewer) return jsonError(401, "unauthenticated", "Sign in first.");
  if (viewer.role !== "resident") return jsonError(403, "forbidden", "Only residents can scan.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return jsonError(400, "no_photo", "Attach a photo.");
  if (!TYPES.includes(file.type)) return jsonError(400, "bad_type", "Use a JPEG, PNG or WebP photo.");
  if (file.size > MAX_BYTES) return jsonError(413, "too_large", "Photo is larger than 8 MB.");

  // Only valid uploads consume the hourly scan allowance.
  const limited = await checkExtractionLimit(viewer.userId, kind);
  if (limited) return limited;

  return { viewer, bytes: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}
