# Room check: bringing TipidWatch into Kuryentipid

Checklist for turning the standalone TipidWatch prototype (`index.html`, "Smart Phone CCTV") into a Kuryentipid feature: a phone camera that spots lights and appliances left on in an empty room and says what that costs in pesos.

Work on branch `feat/room-check`. Follow [AGENTS.md](../AGENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md) and [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md); where this list and DESIGN_SYSTEM.md disagree, DESIGN_SYSTEM.md wins.

## 0. Decide before building

- [ ] **Scope: energy only.** Kuryentipid is about electricity (SDG 7). Drop the prototype's water-leak detection.
- [ ] **Placement:** a third tab, **Room check**, on the resident Scan page (`Bill | Appliances | Room check`, opened by `/scan#room`). No new bottom-nav item: the nav stays at 4.
- [ ] **Who:** residents only (same as bill and sticker scans).
- [ ] **How often:** "Check now" plus an optional auto-check every **5, 10 or 15 minutes** while the page is open. Not every 5 seconds (see §5).
- [ ] **Photos are never stored.** The frame is analysed and discarded; only the text result is shown.
- [ ] Add "Room check" to README §4 Features and remove "real-time monitoring" from the out-of-scope list. The meter camera stays on the roadmap.

## 1. Do not port these parts of the prototype

| In `index.html` | Why it goes | Replaced by |
|---|---|---|
| Gemini API key typed into the page, kept in `localStorage`, sent as `?key=` from the browser | Anyone using the site could copy the key ([ARCHITECTURE.md](../ARCHITECTURE.md): the browser never holds a secret) | Server route that uses the existing AI chain (§3) |
| Hard-coded `gemini-2.5-flash` REST call | Bypasses the fallback chain and the admin's added providers | `extract()` in `src/lib/extraction/extract.ts` |
| "DEMO AI" / "STAGE TEST" random scenarios (`buildDemoAnalysis`) | Fake results ([DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) anti-slop: no fake functionality) | Real AI result, or a clear error |
| Fixed savings per resolved alert (`IMPACT`: 15 L, 0.05 kWh) | Invented numbers | Real ₱/hour from the resident's bill rate and appliance watts (§3) |
| `WATER_WASTE` and `BOTH` categories | Out of scope (§0) | Energy only |
| Snapshot log in `localStorage` | Home photos lingering on the device | Session-only list of text results |
| Alarm sound and spoken alerts | Not in the design system's motion and feedback rules | Visible result plus a short vibration on phones that support it |
| API & Settings drawer | No keys in the browser | Nothing: admins manage providers on `/admin` |

## 2. Port these (the actual function)

- [ ] Live rear-camera preview with `getUserMedia` (same pattern as the store's QR scanner in `src/app/store/redeem-form.tsx`). Stop all tracks when the tab closes, the camera is turned off, or the page is hidden.
- [ ] Switch front/rear camera (optional, only if more than one camera exists).
- [ ] **Check now:** grab one frame from the video into a canvas, resize to at most 1600 px (reuse `resizeImage` from `src/components/photo-capture.tsx`), send it as JPEG.
- [ ] **Auto-check** select (Off / 5 / 10 / 15 min) with a visible countdown; pause while the page is hidden (`visibilitychange`).
- [ ] No camera, or permission denied: fall back to `PhotoCapture` (take or upload a photo) so the feature never dead-ends.
- [ ] Result per check: **energy waste found** or **all clear**, one-sentence observation, the devices found on, and the cost per hour.
- [ ] Session list of the latest results (newest first, up to 10) with time and verdict.
- [ ] Keep the prototype's safe prompt rules: judge only what is visible; never identify people; answer "unclear" instead of guessing.

## 3. Connect it to the system (server)

- [ ] **Migration** `supabase/migrations/20261123001000_room_check.sql`: allow `'room'` in `extraction_attempts.kind` (drop and re-add the check constraint). Additive only; `main` keeps working.
- [ ] `src/lib/extraction/schemas.ts`: add `RoomExtraction` (Zod) and `ROOM_PROMPT`:
  - `readable` (boolean): false if too dark or blurry
  - `people_present` (boolean)
  - `devices_on`: array of `{ type: enum(applianceTypeKeys), note }`, max 5. Reuse the existing appliance enum so names match the receipt.
  - `waste` (boolean): true only when something is clearly on **and** nobody is present
  - `observation` (string, one sentence)
- [ ] `src/lib/extraction/route-helpers.ts`: widen `kind` to `"bill" | "appliance" | "room"`. Room checks share the existing 20-per-hour cap per user.
- [ ] New route `src/app/api/extract/room/route.ts`:
  - [ ] `readImageRequest(request, "room")` for auth, the resident-only check, type and size checks, and the rate limit.
  - [ ] `extract(image, RoomExtraction, ROOM_PROMPT)`, so the whole fallback chain applies (Gemini, then Claude, then admin-added providers).
  - [ ] **Cost per hour:** watts from the resident's own appliance of that type (`getAppliances`), else the typical watts in `APPLIANCE_TYPES`; rate from the latest bill (`effectiveRate(amount_due, kwh)` via `getLatestBill`). With no bill yet, show watts only and say "scan your bill to see pesos".
  - [ ] Response `{ data: { result, devices: [{ type, label, watts, pesosPerHour }], servedBy } }`; errors `{ error: { code, message } }` with 400, 401, 403, 413, 429 or 502 as in the API conventions.
  - [ ] **Do not upload the photo to Storage.** Log only `servedBy`.
- [ ] No proxy change: `src/proxy.ts` already lets `/api` routes through, and the route checks auth itself.

## 4. Connect it to the system (screens)

- [ ] New client component `src/app/(resident)/scan/room-check.tsx`.
- [ ] `src/app/(resident)/scan/page.tsx`: add the third tab `{ id: "room", label: "Room check" }`, wrapped in `CardSection` with the `ScanLine` icon like the other tabs.
- [ ] Reuse only existing components: `CardSection`, `Button` / `buttonStyles`, `SelectField`, `Notice`, `Skeleton`, `PhotoCapture`, sonner `toast`. No new components without adding them to DESIGN_SYSTEM.md.
- [ ] States (AGENTS.md rule 9):
  - [ ] **Empty:** one line on what Room check does, plus "Start camera".
  - [ ] **Loading:** "Checking the room…" with the frame dimmed; buttons disabled.
  - [ ] **Error:** permission denied (how to allow the camera), no HTTPS, AI failed (try again), hourly limit reached (when it resets).
  - [ ] **Success:** waste found (warning tone, `TriangleAlert`) or all clear (`BadgeCheck`).
- [ ] `src/app/(resident)/scan/loading.tsx`: the pill switch skeleton shows three segments.
- [ ] Accessibility: results in an `aria-live="polite"` region; the video has a label; every control is reachable by keyboard; 44 px targets.

## 5. Quota and privacy guardrails

- [ ] Minimum auto-check interval of 5 minutes (12 per hour), inside the 20-per-hour cap. The prototype's 5-second interval would be about 720 calls an hour for one phone, more than the whole barangay's free Gemini quota.
- [ ] Stop auto-check and say so when the server returns 429.
- [ ] A visible line before starting: "Photos go to the AI to be checked and are not saved. Point the camera at the room, not at people."
- [ ] The prompt never asks who is in the room, only whether someone is.
- [ ] Nothing about Room check reaches the ranking or the admin; it is the resident's own tool.

## 6. Design alignment (prototype → Kuryentipid)

| Prototype | Kuryentipid (DESIGN_SYSTEM.md) |
|---|---|
| Name "TipidWatch", shield logo | Kuryentipid; the feature is called **Room check** |
| Dark navy `#0B1120` page, `#1E293B` panels | Theme tokens: `bg-bg`, `bg-surface`, `bg-surface-2`; works in light and dark |
| Emerald `#10B981` "safe" | `text-success` / `bg-success-bg` |
| Amber `#F59E0B` "energy" | `text-warning` / `bg-warning-bg`, with the `TriangleAlert` icon |
| Rose `#F43F5E` "critical" | `text-error` (errors only) |
| Cyan `#06B6D4` "water" | Removed (water out of scope) |
| Radial-gradient glows, blur panels | None (anti-slop: no gradients or glows) |
| Inter font, Tailwind from a CDN | Sora headings, Plus Jakarta Sans body, JetBrains Mono for numbers (`.num`); the project's Tailwind build |
| Custom colors in a Tailwind config | Tokens in `src/app/globals.css` only; no new values |
| Pulsing REC badge, scanning animations | Motion only for state change: button press, the result appearing (150–200 ms) |
| Mixed icon styles | `lucide-react` only, stroke 1.75: `ScanLine`, `Camera`, `TriangleAlert`, `BadgeCheck`, `Plug` |
| Camera action buttons | `buttonStyles.lime` for "Start camera" / "Check now" (as the Scan page's photo button), `secondary` for the rest |
| English alarm text | Short, plain Taglish in the app's voice, e.g. "May nakabukas na TV, walang tao. ₱1.26 kada oras." |
| Sizes in px | rem at the 90% UI scale; radius `rounded-sm` / `rounded-md`; `shadow-receipt` on the card |

## 7. Tests and docs

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`.
- [ ] `scripts/e2e.mjs`:
  - [ ] the Room check tab renders;
  - [ ] `POST /api/extract/room` with a fixture image returns the schema shape;
  - [ ] a non-resident gets 403;
  - [ ] the request counts toward the hourly cap.
- [ ] Manual on a real phone over HTTPS (Vercel preview): permission prompt, rear camera, auto-check countdown, the page hidden then visible, denied-permission fallback.
- [ ] `npx impeccable detect src/` and `npx impeccable detect http://localhost:3000`, both clean.
- [ ] Docs:
  - [ ] README §4 Features and §13 scope;
  - [ ] ARCHITECTURE.md: AI section and the decision log (energy-only, no stored photos, shared hourly cap, minimum 5-minute interval);
  - [ ] DESIGN_SYSTEM.md: Scan UX states for Room check;
  - [ ] TESTING.md: the manual steps above.
- [ ] Keep `index.html` out of the repo root. If the team wants it for reference, move it to `docs/prototypes/tipidwatch.html`.

## 8. Done when

- [ ] Works end to end on a phone and desktop, light and dark, with no console errors.
- [ ] Every item above is checked, or crossed out with a reason.
- [ ] One commit per logical step with conventional prefixes (`feat(scan): …`, `docs: …`), pushed to `feat/room-check`.
- [ ] Pull request into `main` with screenshots; a teammate reviews it before merging.
