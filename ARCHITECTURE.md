# Architecture: TipidTayo

## Overview

One Next.js app (App Router, TypeScript) deployed on Vercel. The browser takes photos and renders screens. Next.js server code (Route Handlers and Server Actions) does the photo extraction with Claude, the fair-score maths, and voucher redemption. Supabase provides Postgres, login and photo storage. Row Level Security (RLS) enforces who can read and write what, so a bug in the UI can't leak another household's bill.

```
[Phone browser] ──photo──▶ [Next.js server] ──image──▶ [Claude API (vision)]
       ▲                        │      ▲                       │
       │                        ▼      └───── JSON fields ◀────┘
       └──── screens ──── [Supabase: Auth · Postgres (RLS) · Storage]
```

## Boundaries

- **Browser:** capture photos, show forms/receipt/ranking, light validation for UX.
- **Server (Next.js):** calls the AI models (holds `GEMINI_API_KEY` and the optional `ANTHROPIC_API_KEY`), validates every input with Zod, computes reconciliation and fair score, redeems vouchers. All writes that matter go through the server.
- **Database:** constraints and RLS are the last line of defense (unique account number, single-use voucher, role checks).
- The browser never holds a secret key. Only `NEXT_PUBLIC_SUPABASE_URL` and the Supabase anon key are public.

## Roles

| Role | Can |
|---|---|
| `resident` | Scan own bills/appliances, see own receipt, see the barangay leaderboard (household labels only), see own vouchers |
| `store` | Redeem vouchers for their own store |
| `admin` | Review flagged bills, set voucher pool, manage partner stores, for their barangay |

Stored in `profiles.role`. Login: Supabase Auth with email + password or **Google OAuth**. Password sign-up runs on the server and creates the user already confirmed (no email round-trip). Google sign-in sends the browser to Google and back to `/auth/callback`, which exchanges the code for a session; the `on_auth_user_created` trigger creates the profile and household on first sign-in either way. Emails in `ADMIN_EMAILS` become admins on password sign-up or in the OAuth callback; admins turn an account into a store owner from the admin page.

## AI extraction (fallback chain)

Photos are read by a **chain of models tried in order**. The first one that returns output passing our Zod schema wins. If every model fails, the user gets the manual entry form, so the chain never dead-ends.

```
1. gemini-3.5-flash-lite  (free: 15 RPM, 500/day)
2. gemini-3.1-flash-lite  (free: 15 RPM, 500/day, separate quota)
3. gemini-3.8-flash       (free: 5 RPM, 20/day: strongest free model, kept as the accuracy backstop)
4. Claude Haiku 5.5       (only if ANTHROPIC_API_KEY is set, paid, ~₱0.03/scan)
5. Manual entry form      (always)
```

Limits are per Google Cloud **project**, not per API key: extra keys from the same project add no quota. Order is set by `GEMINI_MODELS`; on demo day, move `gemini-3.8-flash` first if the Lite models misread real bills.

- **Configured by env, not code:** `GEMINI_MODELS` is a comma-separated list, so models can be swapped when Google renames or retires them, without a deploy. Pick current Flash / Flash-Lite IDs from the AI Studio model list; Google's model names and free limits change often. A step whose key is missing is skipped.
- **Move to the next model on:** HTTP 429 (quota/rate limit), 5xx, timeout (20s per attempt), a safety block or refusal, or output that fails Zod validation.
- **Don't move on for:** `readable: false` (a bad photo won't improve with another model: ask for a retake), or 400/413 bad input (fix the input instead). This saves quota.
- **One schema, every provider:** Zod schemas below are the single source. Convert with `z.toJSONSchema()` for Gemini (`responseMimeType: "application/json"` + `responseJsonSchema`; verified working on `gemini-3.5-flash-lite` 2026-11-23. Constrain free-text fields like `appliance_type` with a Zod enum: the test returned `"REFRIGERATOR"` in caps) and pass to Claude via `zodOutputFormat()`. Every response is **re-validated with Zod on our server** whatever the provider says, because a fallback model is exactly where shape drift appears.
- **SDKs:** `@google/genai` (`ai.models.generateContent`, image as `inlineData` base64). `@anthropic-ai/sdk` only for the optional Claude step (`client.messages.parse`, `output_config.effort: "low"`).
- **Image input:** resize client-side to ≤ 1600px longest edge (canvas) before upload, JPEG/PNG/WebP, ≤ 8 MB, checked server-side.
- **Logging:** record which step served each scan (`gemini:<model>` / `anthropic:<model>` / `manual`), plus the failure reason for skipped steps, server-side only. It shows when a quota is running out.
- **Privacy:** Gemini's free tier may use submitted content to improve Google's products, and bills contain names and account numbers. For the hackathon, use only bills from people who agreed. Before real residents use it, enable billing on the Gemini project (paid-tier data isn't used for training) or rely on the Claude step.
- Every extracted value is shown to the user as **editable** before saving. The AI suggests, the user confirms.

```ts
// src/lib/extraction/extract.ts (shape, not final code)
type Step = { name: string; run: (img: Img, schema: ZodSchema) => Promise<unknown> };

for (const step of steps) {              // steps built from env; missing keys skipped
  try {
    const parsed = schema.safeParse(await withTimeout(step.run(img, schema), 20_000));
    if (parsed.success) return { data: parsed.data, servedBy: step.name };
    log(step.name, "invalid_output");
  } catch (err) {
    if (isBadInput(err)) throw err;      // 400/413: don't burn other quotas
    log(step.name, reasonOf(err));       // 429, 5xx, timeout, safety
  }
}
return { data: null, servedBy: "manual" }; // UI shows manual entry form
```

```ts
// Schemas: src/lib/extraction/schemas.ts
const BillSchema = z.object({
  account_number: z.string(),
  billing_period_start: z.string(),   // ISO date
  billing_period_end: z.string(),
  kwh: z.number(),
  amount_due: z.number(),             // PHP
  history: z.array(z.object({ month: z.string(), kwh: z.number() })), // 12-month chart on the bill
  readable: z.boolean(),              // false = ask user to retake
});

const ApplianceSchema = z.object({
  appliance_type: z.string(),         // "refrigerator", "aircon", ...
  watts: z.number().nullable(),       // null if sticker shows only amps/volts and can't be derived
  is_inverter: z.boolean().nullable(),
  readable: z.boolean(),
});
```

## Core logic (pure functions, unit-tested)

All in `src/lib/scoring/`, with no I/O, so they're testable with plain asserts.

1. **Effective rate** = `amount_due ÷ kwh`.
2. **Reconcile:** raw estimate per appliance = `watts × hours/day × days ÷ 1000`. If the raw sum is less than the bill kWh, the gap becomes the **Unaccounted** line, shown when it's > 15% of the bill. If the raw sum is more than the bill kWh, scale every appliance down proportionally so the lines total the bill. Peso per line = `kWh × effective rate`.
3. **Fair score:**
   - `baseline` = history entry for the same month last year; else mean of the last 3 history entries.
   - `savings% = (baseline − kwh) ÷ baseline`, clamped to `[−100%, 30%]`.
   - If `kwh ≤ 100`: `score = max(savings%, 15%)` and award "Efficient Already".
4. **Plausibility:** flag for review if effective rate is outside ₱8–₱20/kWh, if the account number belongs to another household, or if the user edited an extracted kWh/amount by more than 10%.

## API conventions

- Mutations use **Server Actions**; the two extraction calls are **Route Handlers** (`POST /api/extract/bill`, `POST /api/extract/appliance`) because they take multipart image uploads.
- JSON responses: success `{ data }`, error `{ error: { code, message } }`. Status codes: 200/201, 400 bad input, 401, 403, 404, 409 conflict (e.g. voucher already used), 413 image too large, 502 AI provider failed.
- Uploads: max 8 MB, image types only, checked server-side.

## Data model (Supabase Postgres)

| Table | Key fields | Constraints / notes |
|---|---|---|
| `barangays` | `id`, `name` | |
| `profiles` | `id` (= auth user), `role`, `barangay_id`, `household_label` | role ∈ resident/store/admin |
| `households` | `id`, `profile_id`, `account_number` | `account_number` UNIQUE |
| `bills` | `id`, `household_id`, `period_start`, `period_end`, `kwh`, `amount_due`, `history` (jsonb), `photo_path`, `status` | status ∈ pending/approved/flagged/rejected; UNIQUE(`household_id`, `period_end`) |
| `appliances` | `id`, `household_id`, `type`, `watts`, `hours_per_day`, `is_inverter` | |
| `scores` | `bill_id`, `baseline_kwh`, `savings_pct`, `score` | one per approved bill |
| `badges` | `household_id`, `code`, `awarded_at` | UNIQUE(`household_id`, `code`) |
| `stores` | `id`, `barangay_id`, `name`, `owner_profile_id` | |
| `vouchers` | `id`, `code`, `household_id`, `store_id`, `amount`, `expires_at`, `redeemed_at` | `code` UNIQUE; redeem = `UPDATE … SET redeemed_at = now() WHERE code = $1 AND redeemed_at IS NULL AND expires_at > now()`, so it's single-use even with double-taps |

The leaderboard is a SQL view over `scores` joined to `profiles.household_label`, for the current month and barangay. It never exposes account numbers or names.

RLS: residents read/write only rows linked to their own household; everyone in a barangay can read the leaderboard view; store owners can update only vouchers for their store; admins only rows in their barangay.

Bill photos go in a private Storage bucket, readable by the owner and their barangay admin only.

## State management

Server Components fetch data directly; Server Actions mutate and `revalidatePath`. Local UI state with `useState`. No global store, no client data-fetching library.

## Error handling

- Zod-validate every server input; return `400` with a plain message.
- Never send stack traces or Supabase errors to the client; log server-side.
- AI failure → manual entry form (never a dead end).
- Every screen handles loading, empty, error and success (see DESIGN_SYSTEM.md).

## Environment variables

See [.env.example](.env.example). `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SECRET_KEY` and `SUPABASE_DB_PASSWORD` are server-only and must never get a `NEXT_PUBLIC_` prefix.

## Folder structure

```
/
├── src/
│   ├── app/
│   │   ├── (resident)/scan/        # bill + appliance capture
│   │   ├── (resident)/receipt/
│   │   ├── (resident)/ranking/
│   │   ├── (resident)/vouchers/
│   │   ├── store/                  # redeem page
│   │   ├── admin/                  # review + voucher pool
│   │   ├── login/
│   │   └── api/extract/{bill,appliance}/route.ts
│   ├── components/
│   │   ├── ui/                     # Button, Input, PhotoCapture, Receipt, Toast, ...
│   │   └── <feature>/
│   ├── lib/
│   │   ├── extraction/             # Claude client + Zod schemas
│   │   ├── scoring/                # reconcile, fairScore, plausibility (+ tests)
│   │   └── supabase/               # server + browser clients
│   ├── components/landing/     # landing page: 3D scene, GSAP receipt, fair-score demo
│   └── app/globals.css         # design tokens (@theme)
├── supabase/migrations/            # SQL schema + RLS policies + seed + grants
├── scripts/                        # db-migrate.mjs, e2e.mjs, fixtures/
├── public/
└── *.md
```

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-11-23 | Merge bill-scan receipt with barangay competition; meter camera on roadmap | Each fixes the other's weakness (verification ↔ retention); camera is hardware risk |
| 2026-11-23 | Next.js + Supabase + Claude, single repo | One deployable; Supabase gives auth, DB, storage and RLS without writing a backend |
| 2026-11-23 | Baseline = same month last year from the bill's printed history | Removes seasonality and baseline gaming without extra data entry |
| 2026-11-23 | Email + password, created server-side as confirmed (replaces magic link) | Supabase's built-in mailer sends only a few emails per hour, enough to break a live demo; phone OTP needs a paid SMS provider |
| 2026-11-23 | Next.js 16 `cacheComponents` off | Every screen depends on the signed-in user; standard dynamic rendering is simpler |
| 2026-11-23 | Migrations applied with `scripts/db-migrate.mjs` (pg), not the Supabase CLI | The CLI binary would not install on Windows; the script tracks applied files in `_migrations` |
| 2026-11-23 | Explicit `grant`s in a migration | This Supabase project does not auto-grant new tables to `service_role` / `authenticated` |
| 2026-11-23 | Landing page with Three.js, GSAP, Motion, Inter font | Requested by the project owner; each animation shows a real mechanic, reduced motion respected; Inter waived in `.impeccable/config.json` |
| 2026-11-23 | Gemini (free) first, fallback chain Flash → Flash-Lite → optional Claude Haiku → manual entry | Zero cost for the hackathon; separate per-model quotas plus a fallback keep scanning working when one quota or provider fails |
| 2026-11-23 | Light mode only | One well-tested theme; dark mode not needed for MVP |
| 2026-11-23 | Google OAuth sign-in beside email/password; role promotion in `/auth/callback` | Less friction for residents (no password to create/remember). Email/password is kept for demo, store and admin accounts. The callback reuses the `ADMIN_EMAILS` rule so a Google sign-in can still become a barangay admin |
