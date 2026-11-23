# Design System: TipidTayo

**Rule:** no arbitrary colors, font sizes, spacing, radii or shadows. Use only the tokens below. Need a new value? Add it here first, with a reason.

**Direction:** Swiss minimal, built around a **printed receipt**. Paper-white surfaces, monospace numbers, dashed dividers, one green for "saved / go". It should look like a trustworthy utility tool, not a startup landing page. Generated with `ui-ux-pro-max` (style: Minimalism & Swiss, variance 3, motion 2), then adjusted:
- the palette background moved from mint to warm paper, and primary darkened to emerald-700 so white text passes AA;
- the suggested fonts (Syncopate / Space Mono, tagged "music festival") were replaced. **Inter** (requested by the project owner) is the UI font; **JetBrains Mono** is used for numbers so peso amounts line up. Impeccable flags Inter as overused; that finding is waived with the reason in `.impeccable/config.json`.

**Light mode only.** Users scan bills in daylight and in dim kitchens; one well-tested theme beats two half-tested ones. Dark mode is out of scope.

## Tokens

Defined once in `src/styles/tokens.css`, exposed to Tailwind via `@theme`. Components use Tailwind classes mapped to these tokens, never raw hex.

### Color

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-primary` | `#047857` | Primary buttons, links, "saved" figures | 5.48:1 on white |
| `--color-primary-hover` | `#065F46` | Hover/pressed primary | |
| `--color-on-primary` | `#FFFFFF` | Text on primary | 5.48:1 |
| `--color-accent` | `#FCD34D` | Badges and vouchers **only** (the "reward" color) | text 12.1:1 on it |
| `--color-bg` | `#F7F6F2` | Page background (receipt paper) | |
| `--color-surface` | `#FFFFFF` | Receipt, cards, inputs | |
| `--color-text` | `#1C1917` | Body text, receipt numbers | 17.5:1 |
| `--color-text-muted` | `#57534E` | Labels, helper text | 7.6:1 |
| `--color-border` | `#E7E5E4` | Dividers, card borders (decorative) | |
| `--color-border-strong` | `#78716C` | Input borders, focus-adjacent UI (needs 3:1) | 4.8:1 |
| `--color-success` | `#065F46` on `#ECFDF5` | Success toasts, "verified" state | 7.3:1 |
| `--color-warning` | `#B45309` | "Unaccounted" line, flagged-for-review | 5.0:1 |
| `--color-error` | `#B91C1C` | Errors, destructive actions | 6.5:1 |
| `--color-focus` | `#047857` | 2px focus ring, 2px offset | |

Never use color alone to carry meaning: the "Unaccounted" line also has an alert icon and a label; leaderboard rank changes show ▲/▼ glyphs with text.

### Typography

| Token | Size / line-height / weight | Font | Use |
|---|---|---|---|
| `--text-display` | 32 / 40 / 600 | Inter | Screen title (one per screen) |
| `--text-h2` | 20 / 28 / 600 | Inter | Section headings |
| `--text-body` | 16 / 24 / 400 | Inter | Default |
| `--text-small` | 14 / 20 / 400 | Inter | Helper text, captions (minimum size) |
| `--text-amount-lg` | 28 / 36 / 600 | JetBrains Mono | Receipt total, savings % |
| `--text-amount` | 16 / 24 / 500 | JetBrains Mono | Receipt line amounts, kWh, ranks |

- Fonts via `next/font/google` (self-hosted, no layout shift): **Inter** (variable), **JetBrains Mono** 500/600.
- Numbers always use `tabular-nums` and JetBrains Mono so columns align.
- Peso format: `₱1,234.50` via `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`.

### Spacing

4px base: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`.
Page gutter: `--space-4` on mobile, `--space-6` from `md`.

### Radius and shadow

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Buttons, inputs, badges |
| `--radius-md` | 10px | Cards, modals, the receipt |
| `--shadow-sm` | `0 1px 2px rgb(28 25 23 / 0.08)` | The receipt only (it "sits on" the page) |
| `--shadow-md` | `0 8px 24px rgb(28 25 23 / 0.16)` | Modals and bottom sheets only |

Cards use a border **or** a shadow, never both. Most cards use a border.

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

### Motion

**App screens:** only to show state change: button press (100ms), toast/sheet 150–200ms, ease-out. No scroll reveals, no count-ups.

**Landing page** (requested by the project owner): three pieces of motion, each explaining a real mechanic:
- **Three.js** street of example houses: bar height = the real fair-score formula; drag to orbit, hover for the numbers. Auto-rotate off under reduced motion. A screen-reader table carries the same data.
- **GSAP** ScrollTrigger: the example receipt unrolls as you scroll and step numbers fill in. Text keeps full contrast at every scroll position.
- **Motion** springs on the fair-score slider bars.

Everything is disabled under `prefers-reduced-motion` (final state shown). Three.js loads client-side only, after the page text.

## Components

Defined once in `src/components/ui/`. Every interactive component has: default, hover, focus-visible, active, disabled, loading.

| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (filled primary), `secondary` (surface + `border-strong`), `ghost` (text only), `destructive` (filled error). Height 44px; full-width on mobile for the screen's primary action. Loading: spinner replaces the icon, label stays, width doesn't change, button disabled. |
| **Input / form** | Label always visible above the field. 44px height, `border-strong` 1px, focus ring `--color-focus`. Helper text below in `text-small` muted; error text replaces helper in `--color-error` with `TriangleAlert`. Numeric fields use `inputmode="decimal"`. |
| **PhotoCapture** | One big target: "Take photo of your bill" with `ScanLine`. Uses `<input type="file" accept="image/*" capture="environment">` (opens the phone camera, no library). Shows a thumbnail after capture with "Retake". |
| **Receipt** | White surface, `--radius-md`, `--shadow-sm`. Header: barangay name, billing period. Lines: appliance name left, kWh and ₱ right in mono. Dashed `border-dashed` dividers. "Unaccounted" line in `--color-warning` with icon. Footer: bill total (must equal the sum). |
| **LeaderboardRow** | Rank (mono), household label (e.g. "Bahay #014", never a full name or address), savings % (mono, primary), badges as small accent chips. Current user's row is pinned at the bottom when off-screen. |
| **Badge chip** | `--color-accent` background, `--color-text` label, `Award` icon, `--radius-sm`. Only for earned badges. |
| **VoucherCard** | Big QR code, 6-character fallback code in mono, store name, amount, expiry. States: active, redeemed (greyed out with "Used on <date>"), expired. |
| **Modal / bottom sheet** | Bottom sheet on mobile, centered modal ≥ md. Focus trapped, Esc and backdrop close, focus returns to trigger. |
| **Navigation** | Resident: bottom nav, 4 items max: Scan, Receipt, Ranking, Vouchers. Admin and store: simple top bar, single page each. |
| **Toast** | Bottom, above nav. Success auto-dismisses after 4s; errors stay until dismissed. `role="status"` / `role="alert"`. |
| **Skeleton** | Grey `--color-border` blocks matching the final layout, for receipt and leaderboard loading. |

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
- **Empty:** first visit, one big PhotoCapture plus one line on what to photograph.
- **Error:** unreadable photo → "Couldn't read this. Retake in better light, or type the numbers." with both actions. Failed rate check → "We'll ask the barangay to check this bill" (goes to review, not a dead end).
- **Success:** extracted fields shown as an editable form; "Looks right" confirms.
- **Mobile:** this *is* the mobile layout; on desktop, the same column centered.

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

### Vouchers (resident)
- **Primary:** show QR at the store. **Secondary:** see used/expired.
- **Empty:** "Finish in the top savers this month to earn a voucher." + link to Ranking.
- **Success:** VoucherCard full-screen with brightness hint.

### Store (store owner)
- **Primary:** scan or type a voucher code → Redeem.
- **Error:** already used → "Used on <date> at <store>"; expired; not for this store. Each is a distinct, clear message.
- **Success:** large confirmation with amount to discount.

### Admin (barangay)
- **Primary:** approve/reject flagged bills. **Secondary:** set monthly voucher pool; add partner stores.
- **Empty:** "No bills to review."
- **Success:** toast + the row leaves the queue.
