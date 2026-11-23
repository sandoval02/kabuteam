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
- [ ] Keyboard: every action reachable with Tab/Enter/Esc, focus visible
- [ ] Contrast meets WCAG AA
- [ ] README setup steps work on a fresh clone

## Edge cases to try

- Empty, very long, and special-character input (`<script>`, emoji, 10k chars)
- Double-clicking submit buttons
- Logged-out access to protected pages and endpoints
- Slow or failed AI/external API responses
- Refresh mid-flow

## Automated tests

<!-- Only for logic that would hurt if it broke (auth checks, data transforms, money). Note the command to run them here. -->
