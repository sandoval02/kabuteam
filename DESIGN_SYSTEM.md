# Design System

**Rule:** no arbitrary colors, font sizes, spacing, radii or shadows. Use only the tokens below. Need a new value? Add it here first, with a reason.

## Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--color-primary` | | Primary actions, links |
| `--color-primary-hover` | | |
| `--color-secondary` | | Secondary actions |
| `--color-accent` | | Highlights only, sparingly |
| `--color-bg` | | Page background |
| `--color-surface` | | Cards, panels, inputs |
| `--color-border` | | Dividers, input borders |
| `--color-text` | | Body text |
| `--color-text-muted` | | Secondary text |
| `--color-success` | | |
| `--color-warning` | | |
| `--color-error` | | |

Text/background pairs must meet WCAG AA (4.5:1 body, 3:1 large text and UI).

Dark mode: <!-- yes/no. If yes, add a second value column. -->

### Typography

| Token | Size / line-height / weight | Use |
|---|---|---|
| `--text-display` | | Page title (one per screen) |
| `--text-h1` | | |
| `--text-h2` | | |
| `--text-body` | | Default |
| `--text-small` | | Captions, helper text |

Font family: <!-- max two: one for UI/body, optionally one for headings. --> Monospace: <!-- -->

### Spacing

4px base: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`, `--space-16: 64px`.

### Radius and shadow

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | | Inputs, buttons |
| `--radius-md` | | Cards, modals |
| `--shadow-sm` | | Raised elements (dropdowns) |
| `--shadow-md` | | Modals only |

### Layout and breakpoints

- Max content width: <!-- e.g. 1200px -->. Grid: <!-- e.g. 12 columns, --space-6 gutter -->.
- Breakpoints: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`. Design mobile-first.
- Minimum touch target: 44×44px.

### Iconography

One icon set only: <!-- e.g. Lucide -->. One stroke width, sizes 16/20/24px. No emoji in UI.

## Components

Define each once and reuse it. Every interactive component specifies: default, hover, focus-visible, active, disabled, loading.

| Component | Spec |
|---|---|
| Button | Variants: primary, secondary, ghost, destructive. Sizes: sm, md. Loading shows spinner and keeps width. |
| Input / form | Label always visible (no placeholder-as-label). Helper text and error text below, error uses `--color-error` plus an icon. |
| Card | Surface + border **or** shadow, never both. Used only to group related content. |
| Modal / dialog | Focus trapped, Esc closes, returns focus to trigger. Destructive confirm uses the destructive button. |
| Navigation | <!-- top bar / sidebar / tabs; mobile behavior --> |
| Toast | Success and error feedback. Auto-dismiss success after ~4s; errors stay until dismissed. |

## Anti-slop rules

Non-negotiable. Every visual element has a purpose; every interaction does something real.

- No generic SaaS-template look (hero + three feature cards + gradient blob).
- No decorative gradients, glows or glassmorphism.
- No animation unless it communicates state change (loading, enter/exit, feedback). Max ~200ms.
- No emoji in place of icons.
- No card-in-card nesting; not everything needs a rounded box.
- No spacing outside the scale.
- No placeholder content (lorem ipsum, "John Doe", stock filler) in the shipped product.
- No fake functionality: a button that does nothing gets deleted, not shipped.
- No features outside the MVP list.
- No walls of text; no generic AI copy ("Unlock the power of…", "Seamlessly…", "Elevate your…").
- No decoration-only components.

## UX states (per screen)

Copy this block into [TASKS.md](TASKS.md) or the screen's ticket for every major screen:

```
Screen:
Primary action:
Secondary actions:
Navigation (in / out / back):
Loading:      skeleton or spinner — what exactly?
Empty:        what the user sees + the one action to fix it
Error:        message in plain words + retry / recovery action
Success:      feedback shown
Mobile:       what changes below md
```

No dead ends: every state has a way forward.
