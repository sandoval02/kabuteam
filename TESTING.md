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
- Monthly voucher budget: set it so ₱155 is left; issue 3 × ₱50 → works; issue 1 × ₱10 → blocked with the amount left; clear the budget → issuing works again. A fully used budget disables Issue and shows a notice.

## Automated tests

- `npm test`: scoring rules (baseline, fair score, cap, low-usage floor, reconciliation including small gaps, badge eligibility, plausibility, swap tips).
- `npm run e2e`: with `npm run dev` running, drives Microsoft Edge through the whole demo loop with throwaway accounts (landing and the month strip, sign-up with the consent check, bill entry, appliances, receipt, real Gemini bill and sticker scans, the hourly scan cap, flagging, ranking order, a forged Google token being refused, store self sign-up → pending → admin approval, admin sign-up with a wrong and a right access code, an AI provider test with a bad key, admin review, vouchers, single-use redeem, profile name and theme persistence, sign out, role checks) and fails on console errors. Deletes its accounts afterwards. It needs `ADMIN_SIGNUP_CODE` in `.env.local`; Google's script logs a console error (and the run fails) until `http://localhost` and `http://localhost:3000` are Authorized JavaScript origins of the Google client.
