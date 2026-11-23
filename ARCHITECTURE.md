# Architecture

## Overview

<!-- 3–5 sentences: what runs where, and how a request flows from user to data and back. A small diagram is fine. -->

```
[Browser] → [Frontend] → [API] → [Database]
                           ↘ [AI / external APIs]
```

## Boundaries

- **Frontend** owns: rendering, client state, input validation for UX.
- **Backend** owns: business logic, authorization, the authoritative input validation, all calls that need secrets (AI keys, third-party APIs).
- The frontend never holds a secret key.

## API conventions

- Base path: `/api`. Resource nouns, plural: `GET /api/items`, `POST /api/items`, `GET /api/items/:id`.
- JSON in and out. Success: `{ "data": ... }`. Error: `{ "error": { "code": "STRING_CODE", "message": "Human readable" } }`.
- Status codes: 200/201 success, 400 bad input, 401 unauthenticated, 403 forbidden, 404 not found, 500 server error.

## Data model

<!-- One table per entity: field, type, constraints. Note relationships. Use DB constraints (NOT NULL, UNIQUE, FK) over app-level checks. -->

| Entity | Fields | Relations |
|---|---|---|
| | | |

## State management

<!-- Server state (fetch/cache library or plain fetch) vs local UI state. Pick the simplest that works; no global store unless two distant components share mutable state. -->

## Error handling

- API errors map to the error shape above; never leak stack traces to the client.
- UI shows a plain-language message plus a recovery action (retry, go back).
- External/AI calls: timeout, one retry max, then a visible error state.

## Environment variables

Listed in [.env.example](.env.example). Server-only variables never get a public prefix (e.g. `NEXT_PUBLIC_`, `VITE_`).

## Folder structure

<!-- Replace with the real structure once the stack is chosen. Example for a single full-stack app: -->

```
/
├── src/
│   ├── app/            # routes / pages
│   ├── components/
│   │   ├── ui/         # design-system primitives (Button, Input, Card, Modal)
│   │   └── <feature>/  # feature components
│   ├── lib/            # shared helpers, API client, db client
│   ├── server/         # API handlers, business logic
│   └── styles/         # tokens.css (single source of design tokens)
├── public/
├── .env.example
└── *.md                # project docs
```

## Coding standards

- Reuse components from `components/ui`; never restyle a primitive inline.
- Small components, one job each. Extract only when reused or clearly simpler.
- No duplicated logic; no abstraction with a single user.
- Descriptive names. Files: `kebab-case`; components: `PascalCase`; functions/vars: `camelCase`.
- Strict typing on (`"strict": true` if TypeScript).
- Every data-driven view handles loading, error, empty and success.
- No secrets in code.

## Decision log

Record significant decisions here: date, decision, reason.

| Date | Decision | Why |
|---|---|---|
| | | |
