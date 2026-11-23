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
- [ ] Google sign-in reaches Google, returns to the app and lands on the right home; cancelling shows a recoverable error
- [ ] Email/password sign-in and sign-up still work
- [ ] Contrast meets WCAG AA
- [ ] README setup steps work on a fresh clone

## Edge cases to try

- Empty, very long, and special-character input (`<script>`, emoji, 10k chars)
- Double-clicking submit buttons
- Logged-out access to protected pages and endpoints
- Google OAuth cancelled on the consent screen, and `/auth/callback` opened with no code
- Slow or failed AI/external API responses
- Refresh mid-flow

## Automated tests

- `npm test`: scoring rules (baseline, fair score, cap, low-usage floor, reconciliation, plausibility, swap tips).
- `npm run e2e`: with `npm run dev` running, drives Microsoft Edge through the whole demo loop with throwaway accounts (landing, sign-up, bill entry, appliances, receipt, a real Gemini sticker scan, flagging, ranking order, admin review, vouchers, single-use redeem, role checks) and fails on console errors. Deletes its accounts afterwards.
