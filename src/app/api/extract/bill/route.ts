import { NextResponse } from "next/server";
import { BadInputError, extract } from "@/lib/extraction/extract";
import { BILL_PROMPT, BillExtraction } from "@/lib/extraction/schemas";
import { jsonError, readImageRequest } from "@/lib/extraction/route-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const input = await readImageRequest(request, "bill");
  if (input instanceof NextResponse) return input;
  const { viewer, bytes, mimeType } = input;

  // Keep the photo privately so the barangay admin can review flagged bills.
  const ext = mimeType.split("/")[1];
  const photoPath = `${viewer.userId}/${crypto.randomUUID()}.${ext}`;
  const storage = createAdminClient().storage.from("bill-photos");
  const upload = await storage.upload(photoPath, bytes, { contentType: mimeType });
  const discard = async () => {
    if (upload.error) return;
    const { error } = await storage.remove([photoPath]);
    if (error) console.error("[extract/bill] photo cleanup", error.message);
  };

  try {
    const result = await extract({ base64: bytes.toString("base64"), mimeType }, BillExtraction, BILL_PROMPT);
    // A retake cannot use this file, so do not leave it in storage.
    const unusable = result.ok && !result.data.readable;
    if (unusable) await discard();
    return NextResponse.json({
      data: {
        extraction: result.ok ? result.data : null,
        servedBy: result.servedBy,
        photoPath: upload.error || unusable ? null : photoPath,
      },
    });
  } catch (err) {
    await discard();
    if (err instanceof BadInputError) return jsonError(400, "bad_image", "That photo could not be processed. Try another one.");
    console.error("[extract/bill]", err);
    return jsonError(502, "ai_failed", "Reading failed. Enter the numbers by hand.");
  }
}
