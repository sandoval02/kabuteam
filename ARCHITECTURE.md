# Architecture: Kuryentipid

## Overview

One Next.js app (App Router, TypeScript) deployed on Vercel. The browser takes photos and renders screens. Next.js server code (Route Handlers and Server Actions) does the photo extraction with Gemini (and an optional Claude fallback), the fair-score maths, and voucher redemption. Supabase provides Postgres, login and photo storage. Role checks live in the server code; RLS is defense in depth so a UI bug cannot read another household's rows.

```
[Phone browser] ──photo──▶ [Next.js server] ──image──▶ [Gemini API (vision), optional Claude fallback]
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
| `resident` | Scan own bills/appliances, run Room check, see own receipt, see the barangay leaderboard (household labels only), see own vouchers |
| `store` | Redeem vouchers for their own store |
| `admin` | Review flagged bills, set voucher pool, manage partner stores, for their barangay |

Stored in `profiles.role`, chosen at sign-up. Login: Supabase Auth with email + password, or Google. Sign-up runs on the server and creates the user already confirmed (no email round-trip), then sets the role and `profiles.consented_at`.

- **Admin:** needs `ADMIN_SIGNUP_CODE` (checked with a constant-time compare; under 12 characters means admin sign-up is closed). Emails in `ADMIN_EMAILS` always become admins.
- **Store:** sign-up creates a `stores` row with `approved_at = null`. Only approved stores can be picked when issuing vouchers; the admin approves or declines (decline deletes the store and makes the account a household). Admins can still link an existing account as a store by email (approved at once).

**Google sign-in** uses Google Identity Services, not Supabase OAuth. The app's own "Continue with Google" button (design-system secondary style, Google's four-color G) opens Google's popup through the GIS token client; Google returns a short-lived access token, which is submitted with the same sign-in/sign-up form (so role and consent still apply). The server checks it with Google's `tokeninfo` endpoint: it must have been issued to `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (a token minted for any other app is refused) and carry a verified email; the name comes from Google's userinfo endpoint. Then the server starts a Supabase session with `admin.generateLink({ type: "magiclink" })` + `verifyOtp({ token_hash })`. No email is sent and no client secret is used. `generateLink` creates a bare user for an unknown email, so it is only called for accounts that already exist. Google-created accounts carry `app_metadata.signup = "google"` so a failed password sign-in can say "use Google". A Google sign-in for an email with no account is refused on the sign-in page and sent to sign-up to pick a role.

## AI extraction (fallback chain)

Photos are read by a **chain of models tried in order**. The first one that returns output passing our Zod schema wins. If every model fails, the user gets the manual entry form, so the chain never dead-ends.

```
1. gemini-3.5-flash-lite  (free: 15 RPM, 500/day)
2. gemini-3.1-flash-lite  (free: 15 RPM, 500/day, separate quota)
3. gemini-3.8-flash       (free: 5 RPM, 20/day: strongest free model, kept as the accuracy backstop)
4. Claude Haiku 5.5       (only if ANTHROPIC_API_KEY is set, paid, ~₱0.03/scan)
5. Providers the admin added on /admin, oldest first (OpenAI-compatible, Claude or Gemini)
6. Manual entry form      (always)
```

Limits are per Google Cloud **project**, not per API key: extra keys from the same project add no quota. Order is set by `GEMINI_MODELS`; on demo day, move `gemini-3.8-flash` first if the Lite models misread real bills.

- **Configured by env, not code:** `GEMINI_MODELS` is a comma-separated list, so models can be swapped when Google renames or retires them, without a deploy. Pick current Flash / Flash-Lite IDs from the AI Studio model list; Google's model names and free limits change often. A step whose key is missing is skipped.
- **Move to the next model on:** HTTP 429 (quota/rate limit), 5xx, timeout (15s per attempt), a safety block or refusal, or output that fails Zod validation.
- **Don't move on for:** `readable: false` (a bad photo won't improve with another model: ask for a retake), or 400/413 bad input (fix the input instead). This saves quota.
- **One schema, every provider:** Zod schemas below are the single source. Convert with `z.toJSONSchema()` for Gemini (`responseMimeType: "application/json"` + `responseJsonSchema`; verified working on `gemini-3.5-flash-lite` 2026-11-23. Constrain free-text fields like `appliance_type` with a Zod enum: the test returned `"REFRIGERATOR"` in caps) and pass to Claude via `zodOutputFormat()`. Every response is **re-validated with Zod on our server** whatever the provider says, because a fallback model is exactly where shape drift appears.
- **SDKs:** `@google/genai` (`ai.models.generateContent`, image as `inlineData` base64). `@anthropic-ai/sdk` only for the optional Claude step (`client.messages.parse`, `output_config.effort: "low"`).
- **Image input:** resize client-side to ≤ 1600px longest edge (canvas) before upload, JPEG/PNG/WebP, ≤ 8 MB, checked server-side.
- **Logging:** record which step served each scan (`gemini:<model>` / `anthropic:<model>` / `manual`), plus the failure reason for skipped steps, server-side only. It shows when a quota is running out.
- **Privacy:** Gemini's free tier may use submitted content to improve Google's products, and bills contain names and account numbers. For the hackathon, use only bills from people who agreed. Before real residents use it, enable billing on the Gemini project (paid-tier data isn't used for training) or rely on the Claude step.
- Every extracted value is shown to the user as **editable** before saving. The AI suggests, the user confirms.

### Room check

The resident's Scan page has a third tab that turns the phone camera into a check for appliances left on in an empty room (energy only; ported from the TipidWatch prototype, [cathdevz/tipidwatch](https://github.com/cathdevz/tipidwatch)).

- **Browser** (`src/app/(resident)/scan/room-check.tsx`): `getUserMedia` rear camera; **Check now** grabs the current frame with `createImageBitmap(video)` and posts it through the same `postPhoto` / `resizeImage` (≤ 1600px JPEG) as bill photos. Optional auto-check every 1 to 60 minutes (typed; anything else is refused with a message) with a visible countdown. Without a camera (or with permission denied) the same check runs on a taken or uploaded photo. A 1-second tick runs while the camera is on; it turns the camera off when the tab panel or the page is hidden. After `play()` the track must still be `live` (else it is a camera error), and its `ended` event turns the camera off with a message, so a camera that dies (another app, a phone call) never leaves a frozen frame that looks live. Results live in component state only (latest 10, this visit).
- **Server** (`POST /api/extract/room`): `readImageRequest(request, "room")` (resident only, type and size checks, shared hourly cap), then `extract(image, RoomExtraction, ROOM_PROMPT)` through the whole fallback chain. The model returns `readable`, `people_present`, `devices_on: [{ type }]` (the appliance enum, so names match the receipt) and a one-sentence `observation`. **Waste is decided by our code**, not the model: readable, nobody present, and at least one device on.
- **Cost:** for each device, watts come from the household's own appliance of that type, else the typical watts in `APPLIANCE_TYPES`; ₱/hour = `pesosPerHour(watts, effectiveRate(amount_due, kwh))` from the latest bill. With no bill yet, the response has watts only and the screen asks for a bill.
- **Response:** `{ data: { check: { readable, peoplePresent, waste, observation, devices: [{ type, label, watts, pesosPerHour }] }, servedBy } }`. When every AI step fails it is `check: null` with `servedBy: "manual"` (a 200, like the bill and sticker routes); the screen says the room could not be checked and turns auto-check off.
- **Privacy:** the photo is never uploaded to Storage or written to the database; only `servedBy` is logged. The prompt asks whether someone is present, never who, and tells the model not to describe people.

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

### Admin-added providers

The admin page shows the chain and adds fallbacks without a deploy (`src/app/admin/ai-actions.ts`, table `ai_providers`).
- **Kinds:** Gemini and Claude use their SDKs; everything else (OpenAI, xAI Grok, Groq, OpenRouter, a custom `https://` base URL) uses the OpenAI-compatible `/chat/completions` API with the image as a data URL and `response_format: json_object`. Presets live in `src/lib/extraction/presets.ts`. A 400 from these providers doesn't stop the chain (it usually means the model can't take images or JSON mode).
- **Test before adding:** "Run test" sends `scripts/fixtures/sample-bill.jpg` to that provider alone and returns a step-by-step log (request, timing, what it read, PASS/FAIL). A pass returns a token signed with HMAC-SHA256 over the exact settings and a hash of the key, valid 15 minutes; "Add" re-checks it server-side, so nothing untested can be saved. "Test again" re-runs it with the stored key and saves the log.
- **Keys:** encrypted with AES-256-GCM (`src/lib/secret-box.ts`), key derived from `SUPABASE_SECRET_KEY`; only the last 4 characters are ever sent to the browser, and error messages have the key masked. Rotating the Supabase secret key makes saved keys unreadable: the chain skips them and the admin re-adds them. The table has RLS on and no grants for `anon`/`authenticated`.

## Core logic (pure functions, unit-tested)

All in `src/lib/scoring/`, with no I/O, so they're testable with plain asserts.

1. **Effective rate** = `amount_due ÷ kwh`.
2. **Reconcile:** raw estimate per appliance = `watts × hours/day × days ÷ 1000`. If the raw sum is less than the bill kWh, the gap becomes the **Unaccounted** line for any material gap (above 0.5 kWh rounding noise), so the visible lines add up; the warning notice is reserved for gaps > 15% of the bill. If the raw sum is more than the bill kWh, scale every appliance down proportionally so the lines total the bill. Peso per line = `kWh × effective rate`.
3. **Fair score:**
   - `baseline` = history entry for the same month last year; else mean of the last 3 history entries.
   - `savings% = (baseline − kwh) ÷ baseline`, clamped to `[−100%, 30%]`.
   - If `kwh ≤ 100`: `score = max(savings%, 15%)` and award "Efficient Already".
4. **Plausibility:** flag for review if effective rate is outside ₱8–₱20/kWh, if the account number belongs to another household, if the user edited an extracted kWh/amount by more than 10%, or if reported savings exceed 50% vs last year (a manual baseline with no bill history).

## API conventions

- Mutations use **Server Actions**; the three extraction calls are **Route Handlers** (`POST /api/extract/bill`, `/appliance`, `/room`) because they take multipart image uploads.
- JSON responses: success `{ data }`, error `{ error: { code, message } }`. Status codes: 200/201, 400 bad input, 401, 403, 404, 409 conflict (e.g. voucher already used), 413 image too large, 429 hourly scan cap reached, 502 AI provider failed.
- Uploads: max 8 MB, image types only, checked server-side.

## Data model (Supabase Postgres)

| Table | Key fields | Constraints / notes |
|---|---|---|
| `barangays` | `id`, `name` | |
| `profiles` | `id` (= auth user), `role`, `barangay_id`, `household_label`, `display_name`, `avatar_path`, `consented_at` | role ∈ resident/store/admin; `consented_at` = privacy consent at sign-up (RA 10173) |
| `households` | `id`, `profile_id`, `account_number` | `account_number` UNIQUE |
| `bills` | `id`, `household_id`, `period_start`, `period_end`, `score_month`, `kwh`, `amount_due`, `baseline_kwh`, `history` (jsonb), `photo_path`, `status`, `flag_reasons`, `served_by` | status ∈ approved/flagged/rejected; UNIQUE(`household_id`, `score_month`) |
| `appliances` | `id`, `household_id`, `type`, `watts`, `hours_per_day`, `is_inverter` | |
| `scores` | `bill_id`, `household_id`, `barangay_id`, `score_month`, `baseline_kwh`, `savings_pct`, `score` | one per approved bill; UNIQUE(`household_id`, `score_month`) |
| `badges` | `household_id`, `code`, `awarded_at` | UNIQUE(`household_id`, `code`) |
| `stores` | `id`, `barangay_id`, `name`, `owner_profile_id`, `approved_at` | one store per owner; `approved_at` null = waiting for the admin |
| `vouchers` | `id`, `code`, `household_id`, `store_id`, `amount`, `score_month`, `expires_at`, `redeemed_at` | `code` UNIQUE; one per household per month; redeem = `UPDATE … SET redeemed_at = now() WHERE code = $1 AND redeemed_at IS NULL AND expires_at > now()`, so it's single-use even with double-taps |
| `extraction_attempts` | `profile_id`, `kind`, `created_at` | best-effort hourly scan cap (20/user/hour across all kinds); kind ∈ bill/appliance/room; server-only |
| `ai_providers` | `preset`, `base_url`, `model`, `api_key_enc`, `key_hint`, `last_test` | admin-added fallback providers; key encrypted; server-only |
| `payouts` | `store_id`, `amount`, `voucher_count`, `method`, `reference`, `recorded_by`, `paid_at`, `status`, `store_note`, `responded_at` | status ∈ pending/confirmed/disputed; written only by `record_payout` / `respond_payout`; never deleted. `vouchers.payout_id` links each redeemed voucher to at most one payout |
| `barangays.voucher_budget` | | monthly voucher cap in pesos; null = no cap |

Indexes cover the common reads: `bills(household_id, period_end)`, `appliances(household_id, created_at)`, `scores(barangay_id, score_month, score)`, `profiles(barangay_id)`, `stores(barangay_id)`, and `vouchers(store_id, redeemed_at)` / `vouchers(household_id, created_at)`.

The leaderboard is built by queries in `src/lib/data.ts` over `scores` joined to `profiles.household_label`, for the latest scored month and the viewer's barangay. It never exposes account numbers or names. Top 3 badges are awarded by `scoreBill` when at least two households have scores in that month.

RLS: signed-in users can read their own profile, household, bills, appliances, scores, badges and vouchers; stores and barangays are readable. Role restrictions (store/admin) are enforced in server actions and pages, which use the server-only client for the reads and writes they authorize.

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
│   │   ├── (resident)/home/        # default resident dashboard
│   │   ├── (resident)/scan/        # bill + appliance capture, room check
│   │   ├── (resident)/receipt/
│   │   ├── (resident)/ranking/
│   │   ├── (resident)/vouchers/
│   │   ├── (resident)/profile/     # display name, avatar, theme
│   │   ├── store/                  # redeem page
│   │   ├── admin/                  # review + voucher pool
│   │   ├── login/
│   │   └── api/extract/{bill,appliance,room}/route.ts
│   ├── components/
│   │   ├── ui.tsx, field.tsx, form.tsx  # Button, Field, Notice, Card, validated forms, toasts
│   │   ├── landing/                # homepage: month strip, example data, fair-score demo
│   │   └── <feature>/
│   ├── lib/
│   │   ├── extraction/             # Gemini + optional Claude client, Zod schemas, scan cap
│   │   ├── scoring/                # reconcile, fairScore, plausibility (+ tests)
│   │   └── supabase/               # server + browser clients
│   └── app/globals.css             # design tokens (@theme)
├── supabase/migrations/            # SQL schema + RLS policies + seed + grants
├── scripts/                        # db-migrate.mjs, e2e.mjs, seed-demo.mjs, fixtures/
├── public/
└── *.md
```

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-11-23 | Merge bill-scan receipt with barangay competition; meter camera on roadmap | Each fixes the other's weakness (verification ↔ retention); camera is hardware risk |
| 2026-11-23 | Next.js + Supabase + Gemini, single repo | One deployable; Supabase gives auth, DB, storage and RLS without writing a backend |
| 2026-11-23 | Baseline = same month last year from the bill's printed history | Removes seasonality and baseline gaming without extra data entry |
| 2026-11-23 | Email + password, created server-side as confirmed (replaces magic link) | Supabase's built-in mailer sends only a few emails per hour, enough to break a live demo; phone OTP needs a paid SMS provider |
| 2026-11-23 | Next.js 16 `cacheComponents` off | Every screen depends on the signed-in user; standard dynamic rendering is simpler |
| 2026-11-23 | Migrations applied with `scripts/db-migrate.mjs` (pg), not the Supabase CLI | The CLI binary would not install on Windows; the script tracks applied files in `_migrations` |
| 2026-11-23 | Explicit `grant`s in a migration | This Supabase project does not auto-grant new tables to `service_role` / `authenticated` |
| 2026-11-23 | Landing page with Three.js, GSAP, CSS transitions, Tugon type system | Requested by the project owner; each animation shows a real mechanic, reduced motion respected; the 3D scene and GSAP load only when needed; the font choice is documented in DESIGN_SYSTEM.md |
| 2026-11-23 | Gemini (free) first, fallback chain Flash → Flash-Lite → optional Claude Haiku → manual entry | Zero cost for the hackathon; separate per-model quotas plus a fallback keep scanning working when one quota or provider fails |
| 2026-11-23 | Light and dark themes, saved in a `theme` cookie | The Tugon/Neobank light theme and OKX-style dark theme share one token set; the cookie lets the server render the right theme without a flash |
| 2026-11-23 | Hide the Next.js dev indicator; route-level `loading.tsx` skeletons on resident pages | The dev badge covered the bottom nav's Scan tab and flashed "Rendering…" on every navigation; skeletons give immediate feedback while the dynamic page renders |
| 2026-11-23 | Show an Unaccounted line for every material gap, not only >15% | The core promise is a receipt whose visible lines add up to the bill; the 15% threshold now only controls the warning notice |
| 2026-11-23 | 10% Club uses actual savings; Top 3 is awarded from the leaderboard | The low-usage floor should lift the ranking score, not falsely claim 10% savings; Top 3 needs at least two scored households |
| 2026-11-23 | Pin the viewer's ranking row while it is off-screen | Keeps "where am I?" visible on a long list without changing the rank order |
| 2026-11-23 | Native `BarcodeDetector` for QR scanning, typed code everywhere | No extra scanner dependency; typing is the universal fallback and the demo-safe path |
| 2026-11-23 | Flag >50% savings vs last year for barangay review | Manual entry has no bill history to verify the baseline; this catches the most obvious inflated values |
| 2026-11-23 | Cap AI extraction at 20 attempts per user per hour (`extraction_attempts`) | A signed-in account could otherwise burn the free Gemini quota; the fixed-window check fails open if the limiter table is unavailable |
| 2026-11-23 | Route error boundaries and a branded 404; data reads throw instead of returning empty | A database or network failure must not look like “no bill” or “no ranking” |
| 2026-11-23 | Admin/store auth lives in a segment `layout.tsx` above their loading UI | The skeleton must not show an admin/store shell to the wrong role before the redirect |
| 2026-11-23 | Baseline security headers in `next.config.ts` | `nosniff`, referrer policy, frame denial, camera-only permissions and HSTS; a strict CSP is deferred until the Next runtime is tested with it |
| 2026-11-23 | ~~Google sign-in via Supabase OAuth (PKCE, `/auth/callback`)~~ Superseded the same day, see below | The provider was never enabled in Supabase and the Google client had no matching redirect URI |
| 2026-11-23 | Failed sign-in reports "not registered" / "uses Google" / "wrong password" via the service-role-only `auth_email_status()` function | Requested by the project owner. Trade-off: it reveals whether an email has an account (account enumeration); acceptable for a barangay demo, revisit with rate limiting before wider launch |
| 2026-11-23 | Land on the receipt after saving a bill | The receipt is the product's payoff and the demo's "wow" moment; it saves a Home → Full receipt tap |
| 2026-11-23 | Ranking shows both the score and the actual % saved, and labels the low-usage floor | The list still sorts by score, but nobody mistakes the floor for real savings |
| 2026-11-23 | A rejected bill can be replaced for the same month; old score and photo are cleared | Gives the resident a recovery path without weakening one-bill-per-month uniqueness |
| 2026-11-23 | Admin review shows account last 4, AI/manual source, inline photo and next voucher recipients | Faster, more trustworthy review; the leaderboard still never exposes account numbers |
| 2026-11-23 | Sign-up picks a role: Household, Sari-sari store (admin approves before it can get vouchers), Barangay admin (needs `ADMIN_SIGNUP_CODE`) | Requested by the project owner: stores and admins had no way to create their own accounts. The code and the approval step stop anyone from making themselves an admin or a fake store that collects barangay money |
| 2026-11-23 | Privacy consent checkbox at sign-up, stored as `profiles.consented_at` | Data Privacy Act (RA 10173); listed as an open item in the pilot brief |
| 2026-11-23 | Google sign-in through Google Identity Services + server-verified ID token + `generateLink`/`verifyOtp` session, replacing Supabase OAuth | Works with only the public client ID and JavaScript origins (no Supabase provider setup, no redirect URI, no client secret in the app), and keeps role choice and consent in the same form. Trade-off: one `tokeninfo` request per Google sign-in |
| 2026-11-23 | Homepage rebuilt as "one billing month" (sticky day strip, one section per role's day); Three.js and GSAP removed | Requested by the project owner (remove template look). The 3D street and scroll-printed receipt had no place in the chosen structure, and the GSAP receipt rendered blank until scrolled |
| 2026-11-23 | Admin can add AI fallback providers from the admin page, each tested on a sample bill before it can be saved; keys encrypted in the database | Requested by the project owner: when the free Gemini quota runs out, scanning should fall back to another provider (OpenAI, Claude, Grok, Groq, ...) without a redeploy. The signed test token makes "tested before adding" a server rule, not a UI hint |
| 2026-11-23 | Homepage hero: the bill total at `text-figure` above a full-width segmented bar of what each appliance costs, instead of copy-left / receipt-card-right | Requested by the project owner: the split hero is the stock landing-page layout. The new one shows "one number becomes a receipt" in a single glance |
| 2026-11-23 | Store payouts are written only through two `security definer` functions (`record_payout`, `respond_payout`); no insert/update/delete policies | The function checks who is calling (admin of the store's barangay, or the store's owner) and locks the vouchers it pays, so no page bug or crafted request can pay a voucher twice or answer another store's payout |
| 2026-11-23 | The payout amount is computed inside `record_payout` from the store's unpaid redeemed vouchers, never sent by the client | The barangay pays exactly what was redeemed; a tampered form can't change the figure. A voucher redeemed after a payout simply joins the next one |
| 2026-11-23 | Payouts are never edited after the store answers and never deleted (`on delete restrict` from vouchers and stores) | They are the audit trail both sides rely on; a disputed payout stays visible and is settled in person |
| 2026-11-23 | Monthly voucher budget is per `score_month` and counts issued vouchers, not redeemed ones; checked again on the server in `issueVouchers` | The barangay never owes more than it set aside, even if every voucher is later redeemed. Two admins issuing at the same instant could both pass the check (noted in code); a locking DB function is the fix if that ever matters |
| 2026-11-23 | Google button drawn by the app (secondary style + official G) using the GIS token client, instead of Google's rendered button | Google's rendered button only offers Google's own color presets, so it never matched the app in either theme; the token client lets the app style it, needs no client secret, and the server still verifies the token was issued to our client ID |
| 2026-11-23 | Room check (from the TipidWatch prototype) is a third tab on Scan, not a new nav item or a separate app | It is another way for a resident to find waste, so it belongs beside the bill and appliance scans; the bottom nav stays at 4. It reuses sign-in, the AI chain, the scan cap and the design system instead of TipidWatch's own API key, tables and dashboard |
| 2026-11-23 | Room check is energy only; TipidWatch's water-leak detection was dropped | Kuryentipid is about electricity (SDG 7) and prices everything from the electric bill; there is no water bill to price a leak against |
| 2026-11-23 | Room check photos are never stored, and its results never leave the resident's screen | Photos of the inside of a home are more sensitive than a bill; nothing about it is needed by the ranking or the admin |
| 2026-11-23 | Room check shares the 20-per-hour AI cap; any failure turns auto-check off | TipidWatch checked every 5 seconds (about 720 calls an hour from one phone, more than the whole free Gemini quota). The server cap, not the interval, is what protects the quota |
| 2026-11-23 | Auto-check interval is typed by the resident, 1 to 60 minutes (replaces fixed 5 / 10 / 15) | Requested by the project owner, also to test it quickly. Below 3 minutes the hint warns that the 20 checks an hour run out; the 429 then turns auto-check off, so a short interval costs at most one hour's cap |
| 2026-11-23 | Home's fourth quick action is Room check instead of Ranking | Ranking is already in the bottom nav; a fifth action does not fit at 375px. Room check also appears in Home's Get started list and the receipt's Unaccounted warning |
| 2026-11-23 | "Waste" is computed on the server (readable, nobody present, something on), and the ₱/hour comes from the household's own bill and appliances | The model only reports what it sees; the rule and the money stay in our code, like the fair score. Replaces TipidWatch's fixed "0.05 kWh saved" per alert |
