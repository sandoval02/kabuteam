---
version: 1
slug: "src-components-landing-landing-tsx"
primary_target: "src/components/landing/landing.tsx"
related_targets: ["src/app/page.tsx"]
---

## Scope

Homepage `/` for signed-out visitors (signed-in users redirect to their role's home). Mode: Persuade. Established world: DESIGN_SYSTEM.md (owner kept the brand, 2026-11-23).

Audience: residents (primary action: create a household account and scan a bill), barangay officials (run a pilot, set up as admin), sari-sari store owners (sign up as a store), and hackathon judges (understand the mechanism fast). Proof is the real scoring formula and labelled example data; no testimonials, users or measured savings exist.

## Direction contract

THESIS: The homepage is one Meralco billing cycle walked day by day, and each role enters on the day its job happens. It refuses the category page: split hero over three equal feature cards, a badge grid, and a centred slogan CTA.

OWN-WORLD: DESIGN_SYSTEM.md tokens only. `#f2f3f0` ground; white paper for the bill stub, receipt and voucher; ink `#121412` for type, rules and primary buttons; lime only on today's day in the strip and the #1 rank. JetBrains Mono for dates, kWh and pesos; Sora headlines at landing scale. The month strip is a 2px ink rule with hairline day columns.

STORY: The visitor learns the bill can become a receipt that adds up (Oct 2), that the ranking is fair by % against your own last year (Oct 31), that rewards stay local (Nov 3) and that a barangay can run it cheaply (Month 3). Residents create an account; store owners sign up as a store; officials set up as barangay admin.

FIRST VIEWPORT: Nav (logo, Sign in, Create account). Under it the six-day month strip, Oct 2 lime. Top band: h1 "Your bill is one number. Make it a receipt." left; lead, primary "Scan your first bill →" and the store/admin sign-up links right, bottom-aligned. Then a 2px ink rule and the full-width figure: the example bill total at `text-figure` (₱ set small and raised), the same total as a 28px segmented bar (costliest appliance in `primary-bright`, the rest `border-strong`, Unaccounted amber), and a five-part legend with ₱ and kWh, captioned as an example. Revised 2026-11-23 at the owner's request: the earlier copy-left / receipt-card-right split was the category template.

FORM: "One month in the barangay", #4 on my ordered list of 7, seed:f6f5b253be8a5d96. Signature interaction: the strip sticks under the nav and its lime marker follows the day you are reading; each day is a link to its section. Motion: only the marker's 200ms ease-out move and the fair-score slider's spring; none under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Store pay-back process (barangay decides); the page must not promise a schedule.
- ₱12,000/year is an example (10 winners × ₱100 × 12 months), labelled as such.
