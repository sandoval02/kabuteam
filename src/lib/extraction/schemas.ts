import { z } from "zod";

export const APPLIANCE_TYPES = {
  aircon: { label: "Aircon", watts: 1000, hours: 8 },
  refrigerator: { label: "Refrigerator", watts: 150, hours: 10 }, // compressor runs ~10h of 24
  electric_fan: { label: "Electric fan", watts: 60, hours: 10 },
  tv: { label: "TV", watts: 100, hours: 6 },
  rice_cooker: { label: "Rice cooker", watts: 600, hours: 1 },
  washing_machine: { label: "Washing machine", watts: 500, hours: 1 },
  flat_iron: { label: "Flat iron", watts: 1000, hours: 0.5 },
  computer: { label: "Computer", watts: 150, hours: 6 },
  water_dispenser: { label: "Water dispenser", watts: 500, hours: 4 },
  electric_stove: { label: "Electric stove", watts: 1500, hours: 1 },
  microwave: { label: "Microwave", watts: 1000, hours: 0.3 },
  light: { label: "Lights", watts: 10, hours: 6 },
  other: { label: "Other", watts: 100, hours: 2 },
} as const;

export type ApplianceType = keyof typeof APPLIANCE_TYPES;
export const applianceTypeKeys = Object.keys(APPLIANCE_TYPES) as [ApplianceType, ...ApplianceType[]];

// What the AI must return. Kept flat and nullable so every provider can satisfy it.
export const BillExtraction = z.object({
  readable: z.boolean().describe("false if the photo is not an electric bill or is too blurry to read"),
  account_number: z.string().nullable().describe("Customer account number (CAN), digits only"),
  period_start: z.string().nullable().describe("Billing period start date, YYYY-MM-DD"),
  period_end: z.string().nullable().describe("Billing period end date, YYYY-MM-DD"),
  kwh: z.number().nullable().describe("Total kWh consumed this billing period"),
  amount_due: z.number().nullable().describe("Total amount due in PHP"),
  history: z
    .array(z.object({ month: z.string().describe("YYYY-MM"), kwh: z.number() }))
    .describe("Monthly consumption history from the bill's bar chart, up to 13 months; empty if not shown"),
});
export type BillExtraction = z.infer<typeof BillExtraction>;

export const ApplianceExtraction = z.object({
  readable: z.boolean().describe("false if no appliance rating label is readable"),
  appliance_type: z.enum(applianceTypeKeys).describe("Closest appliance category"),
  watts: z
    .number()
    .nullable()
    .describe("Rated power in watts. If only volts and amps are shown, watts = volts × amps. null if unknown"),
  is_inverter: z.boolean().nullable().describe("true if the label says inverter; null if not stated"),
});
export type ApplianceExtraction = z.infer<typeof ApplianceExtraction>;

// Room check: what is switched on in a photo of a room. Waste (on + nobody there) is decided by our server, not the model.
export const RoomExtraction = z.object({
  readable: z.boolean().describe("false if the photo is too blurry or dark to tell what is switched on, or is not a room"),
  people_present: z.boolean().describe("true if any person is visible"),
  devices_on: z
    .array(
      z.object({
        type: z.enum(applianceTypeKeys).describe("Closest appliance category"),
        plugged_in: z
          .boolean()
          .nullable()
          .describe("true only if a charging cable or power cord is clearly connected; false if clearly on battery or visibly unplugged; null if unsure"),
      }),
    )
    .describe("Appliances and lights clearly switched on; empty if none"),
  observation: z.string().describe("One short sentence on what is switched on"),
});
export type RoomExtraction = z.infer<typeof RoomExtraction>;

export const ROOM_PROMPT =
  "This is one photo from a phone camera pointed at a room in a Philippine home. Scan the whole frame and list EVERY appliance or " +
  "light that is clearly switched ON, not just the most obvious one. A room can have several at once: a laptop, TV, electric fan, " +
  "aircon, lights, water dispenser, rice cooker, charger, and so on. A lit screen, a glowing bulb or lamp, a fan or aircon visibly " +
  "running, or an indicator light or display that is on counts. If you can see a device is on, include it even if it is small or " +
  "partly in the background. Ignore daylight, reflections, and anything whose on/off state is not clear. Set people_present=true if " +
  "any person is visible; never describe or identify people. Use the closest appliance category for each device. For each device set " +
  "plugged_in=true only if a charging cable or power cord is clearly connected, false only if it is clearly running on battery or " +
  "visibly unplugged, and null if you cannot tell. Never guess: leave a device out if unsure, and set readable=false if you cannot " +
  "tell what is on.";

export const BILL_PROMPT =
  "This is a photo of a Philippine electric bill (usually Meralco). Read it and fill the schema exactly. " +
  "Use digits only for the account number. Dates as YYYY-MM-DD. Read every bar of the monthly consumption chart into history " +
  "(month as YYYY-MM, kWh as a number). Never guess: use null for anything you cannot read, and set readable=false if this is not a bill.";

export const APPLIANCE_PROMPT =
  "This is a photo of an appliance rating label (nameplate sticker). Identify the appliance category and its rated power in watts. " +
  "If only voltage and current are printed, compute watts = volts × amps. Use null for anything you cannot read; " +
  "set readable=false if no rating label is visible.";
