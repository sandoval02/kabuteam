# Instructions for AI coding agents

Read this file in full before every task.

## Gate

If any box in the README's **Pre-Flight Checklist** is unchecked, do not write feature code. Help complete the missing planning item instead, and say which one is missing.

## Rules

1. Read [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) before changing anything.
2. Understand the existing code a change touches before editing it. Reuse existing components and helpers.
3. Follow the design system exactly: tokens only, existing components only. No new colors, sizes or spacing values.
4. Follow the anti-slop rules in DESIGN_SYSTEM.md. They are not optional. The Impeccable design hook checks UI files after each edit; fix its findings before calling work done, and run `npx impeccable detect src/` (plus `npx impeccable detect http://localhost:3000` for contrast/tiny-text rules) before merging UI changes. Where Impeccable and DESIGN_SYSTEM.md disagree, DESIGN_SYSTEM.md wins.
5. Build only what the MVP list in README §1 describes. Never invent undocumented features, screens or buttons.
6. Do not overwrite or rewrite working features without stating why.
7. Do not add a dependency unless it is listed in README §3, or you state the reason and it is approved.
8. Every interactive element must work. No placeholder handlers, no `TODO` buttons, no mock data in shipped paths.
9. Handle loading, error, empty and success states for every data-driven view.
10. Never put secrets in code, logs or client bundles.
11. Test the change (run it, and run existing tests) before calling it done. Report failures honestly.
12. Update the relevant doc when behavior, structure or decisions change; add significant decisions to the ARCHITECTURE.md decision log.
13. Working functionality beats impressive-looking mockups.

## Definition of done

- Works end to end in the running app.
- Matches the design system on mobile and desktop.
- No console errors.
- Relevant items in [TESTING.md](TESTING.md) pass.
- Docs still accurate.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
