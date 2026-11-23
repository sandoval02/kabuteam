import { NextResponse } from "next/server";
import { BadInputError, extract } from "@/lib/extraction/extract";
import { BILL_PROMPT, BillExtraction } from "@/lib/extraction/schemas";
import { jsonError, readImageRequest } from "@/lib/extraction/route-helpers";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const input = await readImageRequest(request, "bill");
  if (input instanceof NextResponse) return input;
  const { viewer, bytes, mimeType } = input;

  // Keep the photo privately so the barangay admin can review flagged bills.
  const ext = mimeType.split("/")[1];
  const photoPath = `${viewer.userId}/${crypto.randomUUID()}.${ext}`;
  const upload = await createAdminClient().storage.from("bill-photos").upload(photoPath, bytes, { contentType: mimeType });

  try {
    const result = await extract({ base64: bytes.toString("base64"), mimeType }, BillExtraction, BILL_PROMPT);
    return NextResponse.json({
      data: {
        extraction: result.ok ? result.data : null,
        servedBy: result.servedBy,
        photoPath: upload.error ? null : photoPath,
      },
    });
  } catch (err) {
    if (err instanceof BadInputError) return jsonError(400, "bad_image", "That photo could not be processed. Try another one.");
    console.error("[extract/bill]", err);
    return jsonError(502, "ai_failed", "Reading failed. Enter the numbers by hand.");
  }
}
