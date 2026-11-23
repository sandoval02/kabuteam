# Design System: TipidTayo

**Rule:** no arbitrary colors, font sizes, spacing, radii or shadows. Use only the tokens below. Need a new value? Add it here first, with a reason.

**Direction:** the **Tugon design system** (fonts, shape language, floating nav) with a **Neobank-style light theme** and an **OKX-style dark theme**. Both share one rule, 60 / 30 / 10, with **lime as the only accent**. The UI renders at **90% scale** (`html { font-size: 90% }`; everything is in rem).

### Themes

| | Light (default) | Dark |
|---|---|---|
| 60% page + cards | `#f2f3f0` page, white cards, `#f4f5f2` rows | `#0a0d0b` page, `#121a15` cards |
| 30% ink | black `#121412`: text, primary buttons, active nav | light text `#e8efe9`; lime primary buttons |
| 10% lime `#c6f432` | hero/month cards, chips, rank #1, avatar, wordmark | same, plus this month's chart bar |

- The choice lives in the avatar menu and on Profile: **Light / Dark / System**. It's saved in a `theme` cookie so the server renders the right theme with no flash; **System** follows the OS (`prefers-color-scheme`).
- Text on lime always uses `--color-on-lime` (black), in both themes. Lime is never used as text on white (1.3:1).
- In light mode this month's chart bar is black, because lime on white fails the 3:1 graphics contrast.

### Sizes (compact)

Buttons 40px tall, pill-shaped, 15px bold text. Inputs 40px. Cards 14px padding. Headings: display 28px, section 18px; amounts 24px (all before the 90% scale). Bottom nav 48px, floating pill.

### Color

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-text` | `#e8efe9` | Body text | 15.2:1 on surface |
| `--color-muted` | `#9aab9f` | Labels, helper text | 7.4:1 on surface |
| `--color-border-strong` | `#5f7566` | Input borders | 3.6:1 on surface |
| `--color-primary` | `#c6f432` | Lime accent | 13.8:1 on surface; dark text on it 15.2:1 |
| `--color-success` | `#4ade80` | Success text | 10:1 |
| `--color-warning` | `#fbbf24` | Unaccounted line, flags | 10.6:1 |
| `--color-error` | `#f87171` | Errors | 6.4:1 |

QR codes stay dark-on-white so any phone camera can scan them.

### Typography

| Role | Font | Notes |
|---|---|---|
| Headings `h1`–`h3` | **Sora** 600/700 (`--font-display`) | letter-spacing -0.015em |
| Body, UI | **Plus Jakarta Sans** (`--font-sans`) | |
| Numbers, codes, receipt | **JetBrains Mono** (`.num`, `--font-mono`) | `tabular-nums` |

Sizes: display 32/38, h2 20/28, body 16/26, small 14/20 (minimum), amount-lg 28/36. Wordmark: "Tipid**Tayo**" in Sora bold, "Tayo" in lime. Impeccable flags Plus Jakarta Sans as overused; it's waived in `.impeccable/config.json` because it is Tugon's font.

### Spacing

4px base: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`.
Page gutter: `--space-4` on mobile, `--space-6` from `md`.

### Radius and shadow

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Buttons, inputs (Tugon) |
| `--radius-md` | 10px | Cards, tiles, receipt |
| `--radius-lg` | 16px | Hero panels, floating navs |
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
