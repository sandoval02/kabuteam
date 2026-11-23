# Tasks: TipidTayo

Order matters: the core loop first, polish last. Each task is about 2 hours or less. Times are a share of the total hackathon time, so scale them to your event's length.

**Cut line:** if you're behind at the 50% mark, drop the admin page (approve flagged bills directly in Supabase) and badges other than "Efficient Already". Never cut: scan, receipt, leaderboard, voucher redeem.

## Phase 0: Setup (first ~5%)

- [x] Create repo, Next.js app (TypeScript strict, Tailwind, ESLint)
- [x] Tokens in `src/app/globals.css` (`@theme`); fonts via `next/font`
- [x] Supabase project; `.env.local` filled
- [ ] Vercel project linked (add the same env vars in Vercel)
- [ ] Collect demo material: 3+ real Meralco bill photos (with consent), 6+ appliance sticker photos

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
| 2.2 | Magic-link login, profile with role + household label | 2.1 | | [x] |
| 2.3 | Save bills/appliances; compute score on approve; flag on plausibility failure | 1.1, 2.1 | | [x] |
| 2.4 | Ranking screen (current month, my row pinned, empty state) | 2.3 | | [x] |
| 2.5 | Badges awarded on score (First Scan, 10% Club, Efficient Already, Top 3) | 2.3 | | [x] |
| 2.6 | Vouchers: issue to top savers, VoucherCard with QR + fallback code | 2.1 | | [x] |
| 2.7 | Store page: enter/scan code → atomic redeem, clear error per case | 2.6 | | [x] |
| 2.8 | Admin page: flagged queue approve/reject, voucher pool, partner stores | 2.3 | | [x] |

**Checkpoint:** two accounts in the same barangay; the smaller house ranks higher by %; voucher redeemed once, second try rejected.

## Phase 3: Integrate and test (to ~85%)

- [x] Landing page (Three.js, GSAP, Motion), added on request
- [x] `npm test` and `npm run e2e` pass

- [ ] Run [TESTING.md](TESTING.md) end to end on a real phone
- [ ] Extraction accuracy check on all collected bills/stickers; fix prompts/schemas
- [ ] Seed demo barangay with realistic households (documented as demo data)
- [ ] Fix blockers only; no new features

## Phase 4: Polish and submit (final ~15%)

- [ ] Mobile pass at 375px; copy pass (plain, short, no AI-sounding copy)
- [ ] Demo script: Mang Jun's story, under 2 minutes, rehearsed twice
- [ ] Backup screen recording of the full flow in case venue Wi-Fi fails
- [ ] Roadmap slide: meter camera (daily feedback, Meter-Verified badge, leak alerts)
- [ ] README accurate (setup, screenshots); submitted

## Demo script (draft)

1. "This is Mang Jun's Meralco bill: ₱3,140. One number." Scan it live.
2. Scan his ref and aircon stickers. The receipt appears: the aircon is 48%; 62 kWh are Unaccounted.
3. Swap tip: inverter aircon saves ₱X a month and pays for itself in Y months.
4. Ranking: his small house is #1 at 22% saved, above the mansion's 6%.
5. Voucher: show the QR; switch to the store phone and redeem. Try it again: "Already used."
6. Close: fair, verified, local. SDG 7 in one barangay.
