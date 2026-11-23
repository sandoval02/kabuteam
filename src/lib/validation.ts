import { z } from "zod";
import { applianceTypeKeys } from "@/lib/extraction/schemas";

// One set of rules for every form, used in the browser (instant field errors)
// and again in the server action (the authoritative check).

const num = (label: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number({ error: `Enter the ${label}` }));
const isoDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `Pick the ${label}`);
const jsonOf = <T extends z.ZodType>(schema: T) =>
  z.string().transform((s, ctx) => {
    try {
      return schema.parse(JSON.parse(s || "null")) as z.infer<T>;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid data" });
      return z.NEVER;
    }
  });

export const credentials = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .pipe(z.email("Enter a valid email, like juan@example.com"))
    .transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Enter your password").min(8, "Use at least 8 characters"),
});

export const bill = z
  .object({
    account_number: z.string().trim().min(1, "Enter the account number").regex(/^\d{6,15}$/, "Use 6 to 15 digits, no spaces"),
    period_start: isoDate("start date"),
    period_end: isoDate("end date"),
    kwh: num("kWh").pipe(z.number().positive("kWh must be more than 0").max(100000, "That looks too high for a household")),
    amount_due: num("amount due").pipe(z.number().positive("Amount must be more than ₱0").max(1000000, "That looks too high for a household")),
    baseline_kwh: z.preprocess(
      (v) => (v === "" || v === undefined ? null : Number(v)),
      z.number().positive("Must be more than 0").max(100000, "That looks too high").nullable(),
    ),
    history: jsonOf(z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), kwh: z.number().nonnegative() })).max(24)),
    extracted: jsonOf(
      z.object({ kwh: z.number().nullable(), amountDue: z.number().nullable(), baseline: z.number().nullable() }).nullable(),
    ),
    photo_path: z.string().max(200),
    served_by: z.string().max(80),
  })
  .refine((b) => b.period_end > b.period_start, { message: "End date must be after the start date", path: ["period_end"] })
  .refine((b) => b.period_end <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), {
    message: "End date can't be in the future",
    path: ["period_end"],
  });

export const appliance = z.object({
  type: z.enum(applianceTypeKeys, { error: "Pick an appliance" }),
  label: z.string().trim().max(40, "Keep the name under 40 characters"),
  watts: num("watts").pipe(z.number().int("Use a whole number").min(1, "At least 1 watt").max(10000, "Over 10,000 W is too high for a home appliance")),
  hours_per_day: num("hours").pipe(z.number().min(0, "Can't be negative").max(24, "A day has 24 hours")),
  is_inverter: z.enum(["yes", "no", "unknown"]),
});

export const voucherCode = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Enter the voucher code")
    .regex(/^[A-Z0-9]{6}$/, "A code is 6 letters and numbers"),
});

export const barangayName = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters").max(80, "Keep it under 80 characters"),
});

export const store = z.object({
  name: z.string().trim().min(2, "Enter the store name").max(60, "Keep it under 60 characters"),
  email: z.string().trim().min(1, "Enter the owner's email").pipe(z.email("Enter a valid email")).transform((e) => e.toLowerCase()),
});

export const vouchers = z.object({
  store_id: z.uuid("Pick a store"),
  count: num("number of vouchers").pipe(z.number().int("Use a whole number").min(1, "At least 1").max(50, "At most 50 at once")),
  amount: num("amount").pipe(z.number().min(1, "At least ₱1").max(5000, "At most ₱5,000")),
  days: num("days").pipe(z.number().int("Use a whole number").min(1, "At least 1 day").max(90, "At most 90 days")),
});

export const displayName = z.object({
  display_name: z
    .string()
    .trim()
    .max(60, "Keep it under 60 characters")
    .refine((v) => v === "" || v.length >= 2, "Use at least 2 characters, or leave it empty"),
});

export const signUp = credentials.extend(displayName.shape);

export const schemas = { credentials, signUp, bill, appliance, voucherCode, barangayName, store, vouchers, displayName };
export type SchemaKey = keyof typeof schemas;

export type FieldErrors = Record<string, string | undefined>;
export type FormState = { error?: string; ok?: string; fieldErrors?: FieldErrors };

/** First message per field, or null when valid. */
export function fieldErrorsOf(schema: z.ZodType, data: unknown): FieldErrors | null {
  const r = schema.safeParse(data);
  if (r.success) return null;
  const out: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = String(issue.path[0] ?? "_form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Server-side: parse or return a FormState with field errors. */
export function parseForm<S extends z.ZodType>(schema: S, form: FormData): { data: z.infer<S> } | { state: FormState } {
  const raw = Object.fromEntries(form);
  const r = schema.safeParse(raw);
  if (r.success) return { data: r.data };
  const fieldErrors = fieldErrorsOf(schema, raw) ?? {};
  return { state: { error: "Check the highlighted fields.", fieldErrors } };
}
