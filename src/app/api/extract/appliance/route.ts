import { NextResponse } from "next/server";
import { BadInputError, extract } from "@/lib/extraction/extract";
import { APPLIANCE_PROMPT, ApplianceExtraction } from "@/lib/extraction/schemas";
import { jsonError, readImageRequest } from "@/lib/extraction/route-helpers";

export const maxDuration = 60;

export async function POST(request: Request) {
  const input = await readImageRequest(request, "appliance");
  if (input instanceof NextResponse) return input;

  try {
    const result = await extract({ base64: input.bytes.toString("base64"), mimeType: input.mimeType }, ApplianceExtraction, APPLIANCE_PROMPT);
    return NextResponse.json({ data: { extraction: result.ok ? result.data : null, servedBy: result.servedBy } });
  } catch (err) {
    if (err instanceof BadInputError) return jsonError(400, "bad_image", "That photo could not be processed. Try another one.");
    console.error("[extract/appliance]", err);
    return jsonError(502, "ai_failed", "Reading failed. Pick the appliance from the list instead.");
  }
}
