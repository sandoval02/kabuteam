# Contributing

## Branches

- `main` is always demoable. Never push broken code to it.
- Work on short-lived branches: `feat/<thing>`, `fix/<thing>`, `docs/<thing>`.
- Merge small and often (several times a day). Pull `main` before starting new work.

## Commits

- Conventional prefix, then an imperative, specific summary: `feat: add login form validation`, not `updates`.
  - `feat` new behavior · `fix` bug fix · `docs` documentation only · `perf` faster, same behavior · `refactor` same behavior, cleaner code · `test` tests only · `chore` tooling, config, assets.
  - Optional scope: `fix(auth): …`, `feat(admin): …`.
- One logical change per commit.
- No AI co-author trailers (`Co-Authored-By: …`) in commit messages.
- Never commit `.env`, keys or credentials.

## Pull requests

- Describe what changed and how you tested it.
- One teammate glances at it before merge if anyone is free; otherwise self-review the diff.
- Screenshots for UI changes.

## Before merging

- App runs.
- No console errors.
- Design system followed (tokens, components).
