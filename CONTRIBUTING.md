# Contributing

## Branches

- `main` is always demoable. Never push broken code to it.
- Work on short-lived branches: `feat/<thing>`, `fix/<thing>`, `docs/<thing>`.
- Merge small and often (several times a day). Pull `main` before starting new work.

## Commits

- Imperative, specific: `Add login form validation`, not `updates`.
- One logical change per commit.
- Never commit `.env`, keys or credentials.

## Pull requests

- Describe what changed and how you tested it.
- One teammate glances at it before merge if anyone is free; otherwise self-review the diff.
- Screenshots for UI changes.

## Before merging

- App runs.
- No console errors.
- Design system followed (tokens, components).
