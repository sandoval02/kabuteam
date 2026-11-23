# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Residents** of one barangay who pay their own Meralco bill (primary). On a phone, often a shared family phone, at home or at a barangay assembly. Job: understand what their bill pays for, cut the right appliance, and keep saving month to month.
- **Barangay officials** (captain, council, secretary as admin). Job: decide to run the pilot, review flagged bills, issue monthly vouchers, approve partner stores, report savings to the council.
- **Sari-sari store owners.** Job: sign up as a partner store, redeem voucher codes at the counter, get paid back by the barangay.
- **Hackathon judges** see the product once, on a projector, and score it (technical quality, functionality, innovation, originality, demo; 20% each).

## Product Purpose

Turns a household's Meralco bill into an itemized receipt (per-appliance pesos that add up to the real bill), lets the phone camera catch appliances left on in an empty room (Room check, priced per hour from the same bill), ranks barangay neighbors by percent saved against their own same month last year, and rewards the top savers with vouchers at local sari-sari stores. SDG 7 (targets 7.1, 7.3). Success: households scan every month and the barangay's total kWh drops against last year.

## Positioning

Fair and verified, with no hardware. You compete against your own last year (capped at 30%, 15% floor for homes at 100 kWh or less), so a small house can beat a mansion. The receipt is calibrated to the bill, and what appliances can't explain is shown as an "Unaccounted" line. Rewards stay local: one barangay, its own stores, its own budget.

## Operating Context

- Between bills: the resident can run Room check any day to catch what was left on.
- Monthly loop: resident scans the new bill → suspicious bills go to the admin → admin issues vouchers to top savers at month end → resident shows QR at a partner store → store redeems once → barangay pays the store back (outside the app).
- Sign-up picks a role: resident, store owner (admin approves the store before it can receive vouchers), or barangay admin (needs the barangay's admin access code, or an email in ADMIN_EMAILS).
- Pilot: one barangay, about 50 households, 2 to 3 partner stores, 3 months. One Meralco billing cycle = one ranking round.

## Capabilities and Constraints

- Next.js web app in the phone browser; Supabase (auth, Postgres with RLS, private storage); Gemini vision with a fallback chain ending in manual entry. The admin can add more providers (OpenAI, Claude, Grok, Groq, ...) after a sample-bill test.
- Email + password or Google sign-in. Privacy consent at sign-up (Data Privacy Act, RA 10173).
- Room check: live camera or photo, energy only, photos never stored; a resolved alert saves only its estimated kWh/₱ for the household's own monthly total; shares the 20-per-hour AI cap (auto-check every 1 to 60 minutes, typed by the resident).
- Out of scope: meter camera, water/leak detection, payments, multiple barangays, non-Meralco bills, SMS/push, native app.
- Undecided: how and when the barangay pays stores back; voucher value and winner count (council decides; ₱100 × 10 winners is only an example).

## Brand Commitments

- Name: Kuryentipid. Logo lockup and mark in `public/` and `src/app/icon.png`.
- Visual system is binding: DESIGN_SYSTEM.md (Tugon fonts and shapes, lime as the only accent, light + dark themes). The owner chose to keep it for the homepage redesign (2026-11-23).
- Voice: short and plain, like a helpful barangay tanod. English with Filipino where natural ("Tipid ka ng 22%!"). No greenwashing; show pesos and kWh.

## Evidence on Hand

- The real scoring formula (`src/lib/scoring`) and example households (`src/components/landing/example-data.ts`, labelled "Example").
- Demo barangay seed (`scripts/seed-demo.mjs`, `@tipidtayo.test` accounts). Synthetic bill and sticker photos in `scripts/fixtures/`.
- No real users, testimonials, partner barangays, or measured savings yet. Do not invent any.

## Product Principles

1. Fair beats big: rank by percent against yourself, never raw kWh.
2. The numbers must add up: every receipt reconciles to the real bill.
3. The AI suggests, the resident confirms; every path has a manual fallback.
4. Local by design: one barangay, its own stores, its own money.
5. Privacy by default: neighbors see a household number, % saved and badges only.

## Accessibility & Inclusion

WCAG AA contrast, 44px touch targets, keyboard reachable, reduced motion respected. Many residents use older or shared phones on slow data; screens must work at 375px and without the 3D scene.
