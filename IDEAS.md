# TipidTayo: The Idea

> Your electric bill, itemized. Scan your Meralco bill and appliance stickers to see what each appliance costs you, then compete with your barangay on **% saved**, not raw kWh, for sari-sari store vouchers.

**Hackathon theme:** SDG 7, Affordable and Clean Energy (target 7.1 affordable access, 7.3 energy efficiency). Also touches SDG 11 (sustainable communities).
**Judging:** technical quality, functionality, innovation, originality, presentation/demo, at 20% each.

---

## 1. The problem

- An electric bill is **one number**. Households can't cut what they can't see, so they switch off lights (which barely matter) while an old ref or non-inverter aircon eats most of the bill.
- People who do save get no feedback, recognition or reward, so they stop.
- Community saving drives that rank by **raw kWh** are unfair: a mansion can "save" more kWh by accident than a small house uses in a month.

## 2. Who it's for

| User | What they do |
|---|---|
| **Resident** (main user) | Scans their bill and appliances, sees the receipt, competes, earns vouchers |
| **Barangay admin** | Runs the challenge, reviews suspicious bills, issues vouchers |
| **Sari-sari store owner** | Redeems vouchers at their store |

## 3. The two twists

### Twist 1: Fair scoring
You compete against **your own usage**, not your neighbors' kWh. A small house can beat a mansion.

| Rule | Why |
|---|---|
| Baseline = **same month last year**, read from the 12-month chart printed on the bill (else the average of the last 3 months) | Removes the summer penalty; you can't inflate a past month to game it |
| Savings % = (baseline − this month) ÷ baseline, **capped at 30%** | An empty house on vacation can't win |
| Households at **≤ 100 kWh** score at least **15%** ("Efficient Already" badge) | Homes already using very little aren't punished for having nothing left to cut |
| **One account number = one household** | Can't enter the same bill twice |
| Rate must be ₱8–₱20/kWh; numbers edited more than 10% from the scan get flagged | Catches someone else's bill or an edited photo; flagged bills go to the admin |

Example: small house 150 → 117 kWh = **22%**. Big house 1,000 → 940 kWh = **6%**. The small house ranks higher even though the big one saved more kWh.

### Twist 2: The receipt has to add up
Most energy apps multiply wattage × guessed hours, and the totals never match the bill. TipidTayo **calibrates the appliance estimates to the real bill total**. Usage the appliances can't explain shows as an **"Unaccounted" line**, which can point to a forgotten appliance, a worn ref door seal, standby devices, or a wiring leak.

## 4. What the app does (built and working)

| Who | Screen | What it does |
|---|---|---|
| Visitor | Landing `/` | 3D barangay (Three.js) where bar height = % saved; a receipt that prints as you scroll (GSAP); a slider that runs the real fair-score formula (Motion) |
| Resident | **Scan** | Photo of the bill (AI reads it) or type it in; every number editable before saving. Appliances by sticker photo or picked from a list |
| Resident | **Receipt** | Peso cost per appliance, Unaccounted line, top 3 changes with monthly saving and payback months, badges |
| Resident | **Ranking** | Barangay ranking by fair score, own row highlighted |
| Resident | **Vouchers** | QR code + 6-character code; shows used/expired |
| Admin | **Admin** | Approve/reject flagged bills, add partner stores, issue vouchers to top savers, rename barangay |
| Store | **Store** | Type or camera-scan a code; each voucher works **once only** |

**Badges:** First Scan · 10% Club · Efficient Already · Top 3

## 5. How it works

- **App:** Next.js 16 (TypeScript) + Tailwind CSS, one project for screens and server code
- **Database, login, photos:** Supabase (Postgres with row-level security, email + password login, private photo bucket)
- **AI photo reading:** Google Gemini (free tier), with a fallback chain:
  1. `gemini-3.5-flash-lite` (500/day)
  2. `gemini-3.1-flash-lite` (500/day, separate limit)
  3. `gemini-3.8-flash` (20/day, most accurate)
  4. Claude Haiku (only if an Anthropic key is added)
  5. Manual entry form, so scanning never dead-ends
- **Hosting (planned):** Vercel

The model order is one line in `.env.local` (`GEMINI_MODELS`). On demo day, put `gemini-3.8-flash` first if the Lite models misread real bills.

## 6. Demo story (under 2 minutes)

1. "This is Mang Jun's Meralco bill: ₱3,140. One number." Scan it live.
2. Scan his ref and aircon stickers. The receipt appears: the aircon is about half the bill, and part of it is **Unaccounted**.
3. Swap tip: an inverter aircon saves ₱X a month and pays for itself in Y months.
4. Ranking: his small house is **#1 at 22%**, above the mansion's 6%.
5. Voucher: show the QR, redeem it on the store phone, then try again: "Already used."
6. Close: fair, verified, local. SDG 7 in one barangay.

## 7. Ideas for later (roadmap, not in the MVP)

- **Meter camera:** an old phone pointed at the meter counts pulse-LED blinks or disc turns for live watts, and spots a spinning water-meter wheel at 3 a.m. as a leak. Daily feedback instead of monthly, plus a "Meter-Verified" badge. No ESP32 or AI needed per frame, just image processing.
- **Clean cooking ("Per Plate"):** cost and smoke per meal on charcoal, LPG and electric, with a partial-switch plan (SDG 7.1.2).
- **More barangays:** cross-barangay and city-level rankings.
- **Phone sign-up:** SMS codes for residents without email (needs a paid SMS provider).
- **Trends:** savings over several months.
- **Other utilities:** bill formats beyond Meralco, and water bills.

## 8. To-do before the demo

**Must do**
- [ ] Test Gemini on 3+ real Meralco bill photos (with the owners' permission), including the 12-month chart
- [ ] Rotate the API keys and database password that were shared during setup
- [ ] Set the real admin email in `ADMIN_EMAILS` before that person signs up
- [ ] Deploy to Vercel with the same env vars

**Demo prep**
- [ ] Collect 6+ appliance sticker photos
- [ ] Rename "Demo Barangay" on the admin page
- [ ] Rehearse the demo script twice; record a backup video of the full flow
- [ ] Make a roadmap slide for the meter camera

## 9. Run it

Needs Node.js 22+.

```bash
git clone https://github.com/sandoval02/kabuteam.git
cd kabuteam
git switch feat/tipidtayo-mvp
npm install
# get .env.local from the team privately (never commit it), put it in this folder
npm run dev        # open http://localhost:3000
```

Checks: `npm test` (scoring rules) and `npm run e2e` (full flow in Microsoft Edge, with the dev server running).

**Demo accounts:** ask the team for the demo logins (one each for resident, neighbor, admin and store). Passwords are not stored in this repo.

## 10. Where the details live

| File | What's in it |
|---|---|
| [README.md](README.md) | Project overview, stack, setup |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Data model, AI chain, scoring rules, decision log |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Colors, fonts, components, anti-slop rules |
| [TASKS.md](TASKS.md) | Task breakdown and demo script |
| [TESTING.md](TESTING.md) | QA checklist |
| [AGENTS.md](AGENTS.md) | Rules for AI coding agents |
