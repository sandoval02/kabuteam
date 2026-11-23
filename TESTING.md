# Testing

## Pre-submission checklist

- [ ] All MVP features work end to end
- [ ] Every button and link does something real
- [ ] No broken routes (visit each one)
- [ ] No console errors or warnings in the browser
- [ ] No layout issues at 375px, 768px and 1280px widths
- [ ] Loading, empty and error states appear correctly (throttle network, use an empty account, kill an API)
- [ ] No secrets in the repo or client bundle (search the build output for key prefixes)
- [ ] No placeholder content
- [ ] `npx impeccable detect src/` and `npx impeccable detect http://localhost:3000` report no findings (or each remaining one is waived with a reason)
- [ ] Keyboard: every action reachable with Tab/Enter/Esc, focus visible
- [ ] Contrast meets WCAG AA
- [ ] README setup steps work on a fresh clone

## Edge cases to try

- Empty, very long, and special-character input (`<script>`, emoji, 10k chars)
- Double-clicking submit buttons
- Logged-out access to protected pages and endpoints
- Slow or failed AI/external API responses
- More than 20 AI extraction attempts in an hour → 429, then works again after the window
- A database/network failure on a data screen → error boundary with “Try again”, not an empty state
- Refresh mid-flow
- Sign up as a store, then sign in as that store before approval → "Waiting for the barangay"; approve on /admin → redeem form appears
- Sign up as admin with a wrong code → no account is created
- Google button on the sign-in page with a Google account that has no Kuryentipid account → told to create one first
- Admin → Photo reading (AI): a wrong key fails with a readable log and Add stays locked; a working key passes, Add unlocks, and editing any field locks it again until a new test
- Homepage month strip: after scrolling down, Oct 1 returns to the very top and is highlighted
- Store payouts (seeded demo has one confirmed and one pending payout):
  1. Issue 2 vouchers; redeem both at a store → admin sees Unpaid ₱100.
  2. Record the payment → Unpaid ₱0 and a pending payout on both sides.
  3. Store taps "I received it" → both sides show Confirmed.
  4. Redeem a 3rd voucher → only that one is Unpaid.
  5. Record it; the store taps "Not received" with a note → the admin sees the note in amber.
  6. Negative: submitting a stale "Record payment" when nothing is unpaid → "Nothing to pay"; another store can't answer this payout; a resident reads no payouts; two simultaneous recordings pay the vouchers once.
- Room check (on a real phone over HTTPS, light and dark; run `npm run db:migrate` first so `room_alerts` exists):
  1. Scan → Room check → Start camera → allow → the rear camera shows. Check now with a TV or lamp on and nobody in view → "May naiwang bukas, walang tao" with ₱ per hour; with a person in view → "Someone is in the room"; everything off → "All clear".
  2. The top **Wasted this month** says "Estimates assume the device is plugged in." A left-on alert appears in **Alerts this month** as **Still on** (warning), with a monitored line ("Left on: … so far · kWh · ₱") that climbs while it stays on. Run another check without switching it off → still one row, the same timer continues. Refresh the page → the same alert is still there and an open one keeps counting. Tap **Mark resolved** → the row says **Resolved** (success) and the total freezes; the latest result and the voice become "Naayos na." with the device rows and ₱/h hidden. With the appliance switched off, the next readable check (tap Check now, or let auto-check run) also resolves it. An unreadable check resolves nothing. In both cases **Wasted this month** at the top goes up by the alert's kWh/₱; reload the page and the list and total are still there. If a save fails, a toast says so.
  3. No bill saved yet → watts only and "Save a bill to see what this costs in pesos".
  4. With the field empty, the hint says it is off, that Check now is manual, and that 5–15 minutes lets the app see when a device is switched off. Type 1 in "Auto-check every (minutes)" → the countdown starts at 1:00 with the cap warning, and a check runs by itself after a minute; 0, 61 or 1.5 show "Use a whole number from 1 to 60."; clearing the field turns auto-check off.
  5. Home → the Room check quick action (and Get started → Check a room on a new account) opens the Room check tab; on a receipt with a big Unaccounted share, the warning links to it.
  6. Switch to the Bill tab, or lock the phone → the camera light goes off; coming back shows Start camera.
  7. Deny the camera permission → a Notice explains how to allow it, and "Check a photo instead" still works.
  8. Use up the hourly cap during auto-check → the limit message says "Auto-check is off." and no more requests are sent.
  9. Storage and the database hold no room photo afterwards.
  10. Voice on: "Checking the room", then the result in Taglish with pesos in words; with auto-check, it speaks again each time. Untick "Speak the result" → silent. On iPhone, tap Check now once first (Safari only starts speech after a tap).
- Monthly voucher budget: set it so ₱155 is left; issue 3 × ₱50 → works; issue 1 × ₱10 → blocked with the amount left; clear the budget → issuing works again. A fully used budget disables Issue and shows a notice.

## Automated tests

- `npm test`: scoring rules (baseline, fair score, cap, low-usage floor, reconciliation including small gaps, badge eligibility, plausibility, swap tips), Room check alert resolution, monitored consumption and monthly waste totals.
- `npm run e2e`: with `npm run dev` running, drives Microsoft Edge through the whole demo loop with throwaway accounts (landing and the month strip, sign-up with the consent check, bill entry, appliances, receipt, real Gemini bill and sticker scans, Room check through Edge's fake camera (a real AI verdict, camera off after a tab change, 403 for a store account), the hourly scan cap shared with room checks, flagging, ranking order, a forged Google token being refused, store self sign-up → pending → admin approval, admin sign-up with a wrong and a right access code, an AI provider test with a bad key, admin review, vouchers, single-use redeem, profile name and theme persistence, sign out, role checks) and fails on console errors. Deletes its accounts afterwards. It needs `ADMIN_SIGNUP_CODE` in `.env.local`; Google's script logs a console error (and the run fails) until `http://localhost` and `http://localhost:3000` are Authorized JavaScript origins of the Google client.
