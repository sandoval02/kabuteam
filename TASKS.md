# Tasks: Kuryentipid

Order matters: the core loop first, polish last. Each task is about 2 hours or less. Times are a share of the total hackathon time, so scale them to your event's length.

**Cut line:** if you're behind at the 50% mark, drop the admin page (approve flagged bills directly in Supabase) and badges other than "Efficient Already". Never cut: scan, receipt, leaderboard, voucher redeem.

## Phase 0: Setup (first ~5%)

- [x] Create repo, Next.js app (TypeScript strict, Tailwind, ESLint)
- [x] Tokens in `src/app/globals.css` (`@theme`); fonts via `next/font`
- [x] Supabase project; `.env.local` filled
- [ ] Vercel project linked (add the same env vars in Vercel) **(needs your Vercel account)**
- [ ] Collect demo material: 3+ real Meralco bill photos (with consent), 6+ appliance sticker photos **(needs real photos; synthetic samples are in `scripts/fixtures/`)**

## Phase 1: Core receipt (to ~35%)

| # | Task | Depends on | Owner | Done |
|---|---|---|---|---|
| 1.1 | `lib/scoring`: effectiveRate, reconcile, fairScore, plausibility + assert checks | — | | [x] |
| 1.2 | `lib/extraction`: Zod schemas + fallback chain (Gemini models from env → optional Claude → manual), with a check that a forced 429 falls through to the next step | — | | [x] |
| 1.3 | `POST /api/extract/bill` and `/appliance` (size/type checks, manual fallback on failure) | 1.2 | | [x] |
| 1.4 | UI primitives: Button, Input, PhotoCapture, Toast, Skeleton | tokens | | [x] |
| 1.5 | Scan screen: bill photo → editable fields → confirm | 1.3, 1.4 | | [x] |
| 1.6 | Appliance capture: sticker photo or pick from list, hours per day | 1.3, 1.4 | | [x] |
| 1.7 | Receipt screen with Unaccounted line and top-3 swap tips | 1.1, 1.5, 1.6 | | [x] |

**Checkpoint:** a real bill + real stickers produce a correct receipt on a phone.

## Phase 2: Community loop (to ~65%)

| # | Task | Depends on | Owner | Done |
|---|---|---|---|---|
| 2.1 | Migrations: tables, constraints, RLS, leaderboard view, seed barangay + store | — | | [x] |
| 2.2 | Email + password login, profile with role + household label | 2.1 | | [x] |
| 2.3 | Save bills/appliances; compute score on approve; flag on plausibility failure | 1.1, 2.1 | | [x] |
| 2.4 | Ranking screen (current month, my row pinned, empty state) | 2.3 | | [x] |
| 2.5 | Badges awarded from scores (First Scan, 10% Club, Efficient Already, Top 3) | 2.3 | | [x] |
| 2.6 | Vouchers: issue to top savers, VoucherCard with QR + fallback code | 2.1 | | [x] |
| 2.7 | Store page: enter/scan code → atomic redeem, clear error per case | 2.6 | | [x] |
| 2.8 | Admin page: flagged queue approve/reject, voucher pool, partner stores | 2.3 | | [x] |

**Checkpoint:** two accounts in the same barangay; the smaller house ranks higher by %; voucher redeemed once, second try rejected.

## Phase 3: Integrate and test (to ~85%)

- [x] Landing page (Three.js, GSAP, Motion), added on request
- [x] `npm test` and `npm run e2e` pass

- [ ] Run [TESTING.md](TESTING.md) end to end on a real phone **(you; the automated run at 375px passes)**
- [x] Extraction accuracy check on synthetic bill + sticker: every field read correctly, including the 13-bar usage chart (`gemini-3.5-flash-lite`). Repeat with real bills.
- [x] Seed demo barangay with realistic households: `npm run seed:demo` (7 households, 1 flagged bill for the review demo)
- [x] Fix blockers only (redeem function ambiguity, missing grants, form reset bug, stale-CSS issue)
- [x] Room check: TipidWatch's live-camera energy check as a third Scan tab (shared AI chain and cap, ₱/hour from the bill, photos never stored), with e2e coverage through a fake camera
- [x] Room check alerts resolve by tap (**Naayos na ito**) or automatically when the next readable check no longer sees the device
- [x] Room check: one open alert per continuous left-on event, with a live monitored time and estimated kWh/₱ that freezes when resolved
- [x] Room check: resolved estimates saved to `room_alerts` and shown as **Nasayang this month**
- [ ] Run `npm run db:migrate` to create `room_alerts` before the demo **(you)**
- [ ] Room check on a real phone over HTTPS, per [TESTING.md](TESTING.md) **(you)**

## Phase 4: Polish and submit (final ~15%)

- [x] Mobile pass at 375px; copy pass. Validation on every field, confirm dialogs, toasts, light/dark mode, profile page, 90% UI scale
- [x] Demo script written: [DEMO.md](DEMO.md)
- [ ] Rotate the API keys and database password that were shared during setup **(team)**
- [ ] Set the real admin email in `ADMIN_EMAILS` before that person signs up; rename "Demo Barangay" on the admin page **(team)**
- [ ] Rehearse the demo twice **(team)**
- [ ] Backup screen recording of the full flow in case venue Wi-Fi fails **(team)**
- [x] Roadmap slide content: meter camera, in [DEMO.md](DEMO.md#roadmap-slide-meter-camera)
- [x] README accurate (setup, screenshots, demo accounts)
- [ ] Submitted **(team)**
