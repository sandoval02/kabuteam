# Design System: Kuryentipid

**Rule:** no arbitrary colors, font sizes, spacing, radii or shadows. Use only the tokens below. Need a new value? Add it here first, with a reason.

**Direction:** the **Tugon design system** (fonts, shape language, floating nav) with a **Neobank-style light theme** and an **OKX-style dark theme**. Both share one rule, 60 / 30 / 10, with **lime as the only accent**. The UI renders at **90% scale** (`html { font-size: 90% }`; everything is in rem).

### Themes

| | Light (default) | Dark |
|---|---|---|
| 60% page + cards | `#f2f3f0` page, white cards, `#f4f5f2` rows | `#0a0a0a` page, `#141414` cards |
| 30% ink | black `#121412`: text, primary buttons, active nav | light text `#ededed`; lime primary buttons |
| 10% lime `#c6f432` | hero/month cards, chips, rank #1, avatar, wordmark | same, plus this month's chart bar |

- The choice lives in the avatar menu and on Profile: **Light / Dark / System**. It's saved in a `theme` cookie so the server renders the right theme with no flash; **System** follows the OS (`prefers-color-scheme`).
- Text on lime always uses `--color-on-lime` (black), in both themes. Lime is never used as text on white (1.3:1).
- In light mode this month's chart bar is black, because lime on white fails the 3:1 graphics contrast.

### Sizes (compact)

Buttons 40px tall, pill-shaped, 15px bold text. Inputs 40px. Cards 14px padding. Headings: display 28px, section 18px; amounts 24px (all before the 90% scale). Bottom nav 48px, floating pill.

### Color

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-text` | `#ededed` | Body text | 15.7:1 on surface |
| `--color-muted` | `#a3a3a3` | Labels, helper text | 7.3:1 on surface |
| `--color-border-strong` | `#6b6b6b` | Input borders | 3.5:1 on surface |
| `--color-primary` | `#c6f432` | Lime accent | 13.8:1 on surface; dark text on it 15.2:1 |
| `--color-success` | `#4ade80` | Success text | 10:1 |
| `--color-warning` | `#fbbf24` | Unaccounted line, flags | 10.6:1 |
| `--color-error` | `#f87171` | Errors | 6.4:1 |

QR codes stay dark-on-white so any phone camera can scan them. "Continue with Google" uses the app's secondary button (full width, pill) with Google's official four-color G mark (required by Google's branding rules); the G is the only non-token color in the app.

### Typography

| Role | Font | Notes |
|---|---|---|
| Headings `h1`–`h3` | **Sora** 600/700 (`--font-display`) | letter-spacing -0.015em |
| Body, UI | **Plus Jakarta Sans** (`--font-sans`) | |
| Numbers, codes, receipt | **JetBrains Mono** (`.num`, `--font-mono`) | `tabular-nums` |

Sizes: display 28/34, h2 18/24, body 16/26, small 14/20 (minimum), amount-lg 24/32. Landing only: hero, section and lead (fluid), plus **figure** (`--text-figure`, 48→96px, line-height 1) for the homepage's bill total, the one number the page is about; it stays within 2.5× its minimum so 200% zoom still works. Wordmark: on the landing page, the Kuryentipid lockup image (house + bolt + name, 48px tall): `public/logo-wordmark-light.png` (ink letters) in light mode, `public/logo-wordmark-dark.png` (white letters) in dark mode, swapped with the theme-aware `dark:` variant. Login uses the same lockup at 40px. The app header uses the mark alone (`public/logo.png`, 36px). App icons: `src/app/icon.png`, `src/app/apple-icon.png`. Impeccable flags Plus Jakarta Sans as overused; it's waived in `.impeccable/config.json` because it is Tugon's font.

### Spacing

4px base, rendered at 90% (`html { font-size: 90% }`). Use Tailwind's 4px scale (`gap-3`, `px-4`, `py-2.5`, …).
Page gutter: `px-4` on resident screens.

### Radius and shadow

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 14px | Buttons, inputs, chips |
| `--radius-md` | 22px | Cards, tiles, receipt |
| `--radius-lg` | 28px | Hero panels, floating navs |
| `--shadow-receipt` | 1px `border` ring + deep soft drop | Every card (replaces a border) |
| `--shadow-sheet` | ring + stronger drop | Floating navs, sheets |

Navs float: rounded-lg, 45–70% background with `backdrop-blur`, a hairline ring (Tugon's nav).

### Layout and breakpoints

- Mobile-first. Content max width 480px for resident screens (it's a phone app), 960px for admin/store tables.
- Breakpoints: `sm 640px`, `md 768px`, `lg 1024px`.
- Touch targets ≥ 44×44px, ≥ 8px apart.
- Respect safe areas (`env(safe-area-inset-bottom)`) under the bottom nav.

### Iconography

**Lucide** only (`lucide-react`), stroke 1.75, sizes 16 / 20 / 24. No emoji anywhere in the UI. Icon-only buttons need `aria-label`; decorative icons get `aria-hidden`.

| Meaning | Icon |
|---|---|
| Scan | `ScanLine` |
| Receipt | `ReceiptText` |
| Leaderboard | `Trophy` |
| Badge | `Award` |
| Voucher | `Ticket` |
| Unaccounted / flagged | `TriangleAlert` |
| Verified | `BadgeCheck` |
| Room check | `ScanEye` |
| Tip / fix | `Lightbulb` |

### Motion

**App screens:** only to show state change: button press (100ms), toast/sheet 150–200ms, ease-out. No scroll reveals, no count-ups.

**Landing page:** the page is one billing month. The first section stacks the headline (left) with the lead and primary action (right), then a full-width figure: the example bill total in `text-figure` (₱ set smaller and raised, since JetBrains Mono has no ₱) and the same total as a 28px segmented bar with no text (gap 2px, `rounded-sm` blocks; the costliest appliance in `primary-bright`, the rest `border-strong`, Unaccounted `warning`) over a five-column legend that carries each part's ₱, kWh and share. No split hero with a product card beside the copy. A sticky **month strip** under the header lists six days (Oct 1 bill arrives → Month 3 council report); each day links to its section (Oct 1 to the very top), and one lime marker slides (transform and width, 200ms ease-out) to the clicked day or the day whose section is mid-screen. **CSS height transitions** on the fair-score slider bars. Nothing else animates; under `prefers-reduced-motion` both are instant. Each later section shows its date in a left calendar gutter (`text-section`, mono) at `md`+; on phones the strip carries the date. No eyebrow/kicker labels above headings.

## Components

Defined once in `src/components/ui/`. Every interactive component has: default, hover, focus-visible, active, disabled, loading.

| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (filled ink), `secondary` (surface + border), `lime`, `ghost`, `destructive`. Height 40px; full-width on mobile for the screen's primary action. Loading: spinner replaces the icon, label stays, width doesn't change, button disabled. |
| **Input / form** | Label always visible above the field. 40px height, `border-strong` 1px, focus ring `--color-primary`. Helper text below in `text-small` muted; error text replaces helper in `--color-error` with `TriangleAlert`. Numeric fields use `inputmode="decimal"`. |
| **PhotoCapture** | One big target: "Take photo of your bill" with `ScanLine`. Uses `<input type="file" accept="image/*" capture="environment">` (opens the phone camera, no library). Shows a thumbnail after capture with "Retake". |
| **Receipt** | White surface, `--radius-md`, `--shadow-receipt`. Header: barangay name, billing period. Lines: appliance name left, kWh and ₱ right in mono. Dashed `border-dashed` dividers. "Unaccounted" line in `--color-warning` with icon; any material gap appears so the visible lines add up to the footer total. |
| **LeaderboardRow** | Rank (mono), household label (e.g. "Bahay #014", never a full name or address), savings % (mono, primary), badges as small accent chips. Current user's row is pinned at the bottom when off-screen. |
| **Badge chip** | `--color-accent` background, `--color-text` label, `Award` icon, `--radius-sm`. Only for earned badges. |
| **VoucherCard** | Big QR code, 6-character fallback code in mono, store name, amount, expiry. States: active, redeemed (greyed out with "Used on <date>"), expired. |
| **Modal / bottom sheet** | Bottom sheet on mobile, centered modal ≥ md. Focus trapped, Esc and backdrop close, focus returns to trigger. |
| **Navigation** | Resident: floating bottom nav, 4 items: Home, Scan, Ranking, Vouchers. Home's quick actions (4 lime circles): Scan bill, Appliances, Receipt, Room check. Admin and store: simple top bar, single page each. |
| **Login / register** | `/login` and `/login?mode=up` (`&role=store` / `&role=admin` preselects a role). Wordmark lockup in the header, then two columns at `lg` (one column below, form first): title + form card + privacy line; a lime panel listing the billing month (date, who, what) in ink. Sign-up form order: "I'm joining as" role dropdown (`Household`, `Sari-sari store`, `Barangay admin`): a 40px field shows the chosen role's icon and title with a chevron; opening it shows the three original role rows below (`House`/`Store`/`Landmark` icon, title, one-line description; selected row lime), then the role's extra field (store name or admin access code), the consent checkbox (`CheckField`), "Sign up with Google" (secondary button), "or with email", name/email/password, Create account. |
| **Toast** | Bottom-center, 96px above the viewport edge so it clears the floating nav. Success auto-dismisses after 4s; errors stay until dismissed. `role="status"` / `role="alert"`. |
| **Skeleton** | Grey `--color-border` blocks matching the final layout, pulsing (still under reduced motion). Each nav page (Home, Scan, Ranking, Vouchers) has a `loading.tsx`, so a nav tap switches instantly to the skeleton; the tapped nav icon shows a spinner until the page arrives. |
| **PageHero / CardSection** | The Profile layout, used on Profile only (Ranking and Vouchers open with a lime card of real numbers instead): a 96px lime circle (icon or avatar), centered display title and muted subtitle, then content in cards whose `font-semibold` heading (with optional 14px icon) sits inside the card. Home follows it with a centered hero and card-wrapped content. |

## Anti-slop rules

Non-negotiable. Every visual element has a purpose; every interaction does something real.

- No generic SaaS-template look (hero + three feature cards + gradient blob).
- No gradients, glows, glassmorphism, or "eco" leaf illustrations. No greenwashing claims ("save the planet!"); show real pesos and kWh.
- No animation unless it communicates state change.
- No emoji in place of icons.
- No card-in-card nesting.
- No spacing outside the scale.
- No placeholder content (lorem ipsum, fake households, stock filler) in the shipped product. Demo data is clearly seeded real-format data and documented.
- No fake functionality: a button that does nothing gets deleted, not shipped.
- No features outside the README MVP list.
- No walls of text; no generic AI copy ("Unlock the power of…", "Seamlessly…", "Elevate your…"). Write like a helpful barangay tanod, short and plain. Copy in English with Filipino where it's more natural (e.g. "Tipid ka ng 22%!").
- No decoration-only components.

## UX states per screen

### Scan (resident)
- **Primary:** take a photo of the bill. **Secondary:** add appliance photos; enter manually.
- **Loading:** "Reading your bill…" with the photo dimmed underneath; disable buttons.
- **Empty:** the bill form is always shown . Above it, one line on what to photograph and a lime "Take or upload bill photo" button (the appliance sticker button is lime too); a read fills the fields in, with the photo shown above them.
- **Error:** unreadable photo → "Couldn't read this. Retake in better light, or type the numbers." with both actions. Failed rate check → "We'll ask the barangay to check this bill" (goes to review, not a dead end).
- **Success:** extracted fields shown as an editable form; "Save bill" confirms. Below kWh and amount, a live "That's ₱X per kWh" line (amount ÷ kWh); outside ₱8–₱20 it becomes a warning Notice, since the bill will go to barangay review.
- **Layout:** no hero. Bill, Appliances and Room check are a three-part segmented pill switch (`Tabs variant="segmented"`, active pill lime) that sticks under the app header while the form scrolls; `/scan#appliances` and `/scan#room` open those tabs.
- **Mobile:** this *is* the mobile layout; on desktop, the same column centered.

### Room check (resident, third Scan tab)
- **Primary:** Start camera → Check now. **Secondary:** resolve a left-on alert (**Naayos na ito**); auto-check every N minutes (1 to 60, empty = off); check a photo instead; stop camera.
- **Empty:** one muted line on what it does, an info Notice ("Photos are checked by the AI and never saved. Point the camera at the room, not at people."), a lime "Start camera" button and a secondary "Check a photo instead" (`PhotoCapture`). With no camera API, only the photo button, in lime.
- **Camera on:** square video (`rounded-sm`, `surface-2` behind it), then lime "Check now", the latest result, the "Auto-check every (minutes)" number `Field` (placeholder "Off"; its hint carries the countdown, "Next check in 4:32. Keep this page open and the screen on.", plus a cap warning below 3 minutes; outside 1 to 60 the error "Use a whole number from 1 to 60." replaces the hint), and a secondary "Stop camera".
- **Loading:** "Checking the room…" over the dimmed video (as the bill photo), buttons disabled.
- **Error:** camera blocked, missing, busy or ended mid-use, AI failed, or hourly limit → warning Notice with the next step; a failure during auto-check also says "Auto-check is off."
- **Success:** one Notice in an `aria-live` status: **left on, nobody there** (`warning`: "May naiwang bukas, walang tao: TV, Lights.", the AI's one-sentence observation, "₱1.39 kada oras habang bukas." with the amount in mono), **someone is there** (`info`), **all clear** (`success`), or **unclear** (`warning`, retake advice). Below it, one row per device: label left, "100 W · ₱1.26/h" right in mono. With no bill yet, "Save a bill to see what this costs in pesos." Below it, **Alerts this visit**: every left-on alert, most recently active first, up to 10, each with its devices, time (mono), **Bukas pa** (`warning`) or **Naayos na** (`success`), and a running line **"Naiwang bukas: 18 min so far · 0.05 kWh · ₱0.56"** (numbers in mono; kWh only when there is no bill). Repeated checks that still see it on update the same row; the number freezes when the alert resolves. An open row has a secondary **Naayos na ito** button; once resolved, the latest result also shows **Naayos na.** in `success`, and its device rows and ₱/h are hidden. The next readable check that no longer sees the alert's devices resolves it automatically.
- **Voice:** "Speak the result" checkbox (`CheckField`, on by default). Says "Checking the room." when a check starts, then the same words as the result Notice, with pesos in words ("1 piso at 39 sentimo kada oras."), or the error. Browser speech, `fil-PH`; a new line cuts off the last one. It is the result read aloud, not an alarm.
- **Motion:** none beyond the shared button press and the pulsing `ScanLine` while checking. No alarm siren, scan line or REC badge.

### Receipt (resident)
- **Primary:** see what costs the most. **Secondary:** open a swap tip; add a missed appliance.
- **Loading:** receipt skeleton.
- **Empty:** no bill scanned → "Scan your bill to see your receipt" + Scan button.
- **Error:** reconciliation can't run (no appliances) → show the bill total with "Add appliances to break this down".
- **Success:** full receipt, top 3 lines with a swap tip each.

### Ranking (resident)
- **Primary:** see my rank and %. **Secondary:** see badges earned.
- **Loading:** row skeletons.
- **Empty:** fewer than 2 households this month → "You're the first! Ranking starts when neighbors join." Not an empty table.
- **Error:** "Couldn't load the ranking" + Retry.
- **Success:** list with my row highlighted/pinned.
- **Hero:** no icon. A lime card with my real standing: "#3 of 12 households", then fair score, % saved vs last year, and points behind the household above (or lead over #2 when first). Not on this month's ranking → the card says so and links to Scan.
- **Loading (Ranking and Scan):** each `loading.tsx` mirrors its page's real layout (rank hero + rows; pill switch + bill form), like every other `loading.tsx` (Home, Vouchers, Profile).

### Vouchers (resident)
- **Primary:** show QR at the store. **Secondary:** see used/expired.
- **Empty:** "Finish in the top savers this month to earn a voucher." + link to Ranking.
- **Success:** VoucherCard full-screen with brightness hint.

### Store (store owner)
- **Primary:** scan or type a voucher code → Redeem.
- **Error:** already used → "Used on <date> at <store>"; expired; not for this store. Each is a distinct, clear message.
- **Success:** large confirmation with amount to discount.
- **Payments:** pending payouts appear as cards above "Redeemed here" ("₱X from the barangay · date · method ref"), with "I received it" (primary, confirm dialog) and "Not received" (secondary, opens a required note, confirm dialog). "Redeemed here" opens with "Waiting for payment" and "Paid"; each voucher row says Unpaid, Pending, Paid or Disputed. Empty: no cards and no history section.

### Admin (barangay)
- **Primary:** approve/reject flagged bills. **Secondary:** set monthly voucher pool; approve store sign-ups; add AI fallback providers.
- **Partner stores:** each row shows Unpaid (bold) and Paid (muted), any pending payout as a muted line, a disputed one as a warning Notice with the store's note, a "Record payment" form only when Unpaid > 0, and a `<details>` payment history with status in `success` / `warning` / `muted`.
- **Voucher budget:** "Budget this month: ₱X of ₱Y used, ₱Z left" above the issue form; a live "This issue: up to N × ₱A = ₱T" line under the fields; when nothing is left, a warning Notice and a disabled Issue button.
- **AI providers:** the chain is a numbered list (server settings, added providers with last test result, manual entry). The add form unlocks "Add to the chain" only after "Run test" passes; the log is a mono list on `surface-2`, verdict line in `success`/`error`.
- **Empty:** "No bills to review."
- **Success:** toast + the row leaves the queue.
