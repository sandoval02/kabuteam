import { NextResponse } from "next/server";
import { BadInputError, extract } from "@/lib/extraction/extract";
import { APPLIANCE_TYPES, ROOM_PROMPT, RoomExtraction } from "@/lib/extraction/schemas";
import { jsonError, readImageRequest } from "@/lib/extraction/route-helpers";
import { getAppliances, getLatestBill } from "@/lib/data";
import { effectiveRate, pesosPerHour } from "@/lib/scoring";

export const maxDuration = 60;

/** Room check: what is left on in a photo of a room, and what it costs per hour. The photo is never stored. */
export async function POST(request: Request) {
  const input = await readImageRequest(request, "room");
  if (input instanceof NextResponse) return input;
  const { viewer, bytes, mimeType } = input;

  try {
    const [result, bill, appliances] = await Promise.all([
      extract({ base64: bytes.toString("base64"), mimeType }, RoomExtraction, ROOM_PROMPT),
      getLatestBill(viewer.householdId),
      getAppliances(viewer.householdId),
    ]);
    // Every AI step failed (quota, outage): like the bill and sticker routes, a 200 with no result; the screen says so.
    if (!result.ok) return NextResponse.json({ data: { check: null, servedBy: result.servedBy } });

    const room = result.data;
    const rate = bill ? effectiveRate(bill.amount_due, bill.kwh) : null;
    // Watts from the household's own appliance of that type when it has one, else the typical value.
    const devices = room.readable
      ? room.devices_on.map(({ type, plugged_in }) => {
          const watts = appliances.find((a) => a.type === type)?.watts ?? APPLIANCE_TYPES[type].watts;
          return {
            type,
            label: APPLIANCE_TYPES[type].label,
            watts,
            pluggedIn: plugged_in,
            pesosPerHour: rate === null ? null : pesosPerHour(watts, rate),
          };
        })
      : [];

    return NextResponse.json({
      data: {
        check: {
          readable: room.readable,
          peoplePresent: room.people_present,
          waste: room.readable && !room.people_present && devices.length > 0,
          observation: room.observation,
          devices,
        },
        servedBy: result.servedBy,
      },
    });
  } catch (err) {
    if (err instanceof BadInputError) return jsonError(400, "bad_image", "That photo could not be processed. Try another one.");
    console.error("[extract/room]", err);
    return jsonError(502, "ai_failed", "Could not check the room. Try again.");
  }
}
