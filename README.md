# <Project Name>

> One sentence: what it does and for whom.

**Status:** Pre-flight — no feature code until every box in [Pre-Flight Checklist](#pre-flight-checklist) is ticked.

---

## Pre-Flight Checklist

No coding begins until all of these are done. AI agents must refuse feature work while any box is unchecked (see [AGENTS.md](AGENTS.md)).

- [ ] Problem and target users are clear (§1)
- [ ] MVP features are defined, out-of-scope list written (§1)
- [ ] Tech stack is selected (§3)
- [ ] Design system is documented ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md))
- [ ] Anti-slop rules are established ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#anti-slop-rules))
- [ ] Required skills and integrations are identified (§2)
- [ ] Architecture is planned ([ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] Project structure is agreed upon ([ARCHITECTURE.md](ARCHITECTURE.md#folder-structure))
- [ ] AI agent instructions are ready ([AGENTS.md](AGENTS.md))
- [ ] Initial task breakdown is complete ([TASKS.md](TASKS.md))

---

## 1. Project overview

| | |
|---|---|
| **Problem** | <!-- The specific pain, in one or two sentences. Who feels it, how often. --> |
| **Target users** | <!-- A concrete person, not "everyone". --> |
| **Value proposition** | <!-- Why this beats what they do today. --> |
| **Hackathon theme** | <!-- --> |
| **Judging criteria** | <!-- List each criterion and how the demo proves it. --> |

### MVP (must work at demo time)

1. <!-- The one user journey the demo shows end to end. -->
2.
3.

### Out of scope

- <!-- Anything tempting that is NOT being built. Writing it down is what stops scope creep. -->

## 2. Required skills

Delete rows that do not apply. Every remaining row needs an owner.

| Skill | Covers | Owner |
|---|---|---|
| UI/UX design | User flows, usability, visual hierarchy | |
| Frontend | Components, layouts, responsive UI | |
| Backend | APIs, business logic | |
| Database | Schema, relationships, queries | |
| AI integration | Prompts, model APIs, tool calling | |
| Authentication | Login, permissions, security | |
| Git/GitHub | Branching, commits, collaboration | |
| Testing | Functional and edge-case testing | |
| Deployment | Hosting, environment configuration | |
| Accessibility | Keyboard navigation, contrast, semantics | |

## 3. Technology stack

Every entry needs a one-line reason. No dependency gets added later without one.

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | | |
| Backend framework | | |
| Database | | |
| Auth provider | | |
| AI/LLM provider | | |
| UI component library | | |
| Styling | | |
| Deployment | | |
| External APIs | | |

## 4. Getting started

```bash
# Fill in once the stack is chosen
git clone <repo>
cp .env.example .env   # then fill in values
# install
# run
```

## 5. Execution workflow

1. **Research**: problem, users, judging criteria.
2. **Define the MVP**: what must work. Nothing else.
3. **Design system**: tokens, type, components ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)).
4. **Architecture**: stack, data model, structure ([ARCHITECTURE.md](ARCHITECTURE.md)).
5. **Build the core journey first.**
6. **Integrate and test** ([TESTING.md](TESTING.md)).
7. **Polish and submit**: UI quality, mobile, demo run-through, docs accurate.

## 6. Security and reliability

- Validate all user input at the server; sanitize anything rendered from untrusted sources.
- Secrets live in `.env` only, never in code or commits. `.env` is gitignored.
- Every API endpoint checks authentication and authorization.
- External API calls handle timeouts and failures with a visible error state.
- Review new dependencies before adding (maintenance, size, known vulnerabilities).

## Project docs

| File | Purpose |
|---|---|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Design tokens, components, anti-slop rules, UX states |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture, schema, API conventions, folder structure, coding standards |
| [AGENTS.md](AGENTS.md) | Rules for AI coding agents |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Git and collaboration rules |
| [TASKS.md](TASKS.md) | Hackathon task breakdown |
| [TESTING.md](TESTING.md) | QA checklist |
| [.env.example](.env.example) | Required environment variables |
