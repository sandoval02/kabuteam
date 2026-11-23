# Demo: TipidTayo in under 2 minutes

**Before you go on stage**
- `npm run seed:demo` has been run (demo barangay with 7 households, 1 bill waiting for review).
- Two phones (or two browser windows): one signed in as **resident**, one as **store**. Admin on a laptop.
- Demo accounts: `resident@`, `neighbor@`, `admin@`, `store@tipidtayo.test` (password from the team, not in this repo).
- Printed sample bill and an appliance sticker ready. If Wi-Fi is bad, use the backup recording.
- Theme set to light on every device (avatar menu → Theme → Light) so the projector stays readable.

## Script

| Time | Say | Do |
|---|---|---|
| 0:00 | "This is Mang Jun's Meralco bill. ₱1,469. One number. He has no idea which appliance is eating it." | Hold up the bill. |
| 0:10 | "TipidTayo reads it." | Resident phone → **Scan** → Take photo. Fields fill in, including the 12-month chart. **Looks right, save** → confirm. The receipt opens. |
| 0:30 | "Now his appliances." | Scan the aircon sticker: 1,050 W, non-inverter. Set 2 h a day. **Add appliance**. |
| 0:45 | "Here's his bill as a receipt. The aircon is half of it, and part of the bill isn't explained by anything he owns. That's the Unaccounted line: a worn ref seal, standby devices, or a leak." | The **Receipt** screen is already open. |
| 1:00 | "The fix: an inverter aircon saves about ₱300 a month." | Point at **Change this first**. |
| 1:10 | "Now the fair part. Mang Jun's small house is ranked #1 at 22%, above the mansion at 6%. Everyone competes against their own bill from the same month last year." | **Ranking**. |
| 1:25 | "Top savers get vouchers at the sari-sari store." | Admin laptop → **Issue vouchers** → confirm. Resident → **Vouchers**: show the QR. |
| 1:40 | "Aling Nena scans it. Accepted. Try again: already used." | Store phone → redeem, then redeem the same code again. |
| 1:50 | "Fair, verified, local. SDG 7, one barangay at a time." | End on the landing page. |

**If a step fails live:** scanning falls back to typing the numbers (show that as a feature: "the AI suggests, the resident confirms"). The flagged bill (Bahay #068, ₱3/kWh) is already waiting in the admin queue if you need to show the review step.

## Roadmap slide: Meter camera

**Title:** Next: daily feedback from the meter

- An old phone pointed at the electric meter counts the pulse-LED blinks (or disc turns): live watts, no wiring.
- Daily progress instead of waiting for the monthly bill: "Today you're 12% under your baseline."
- **Meter-Verified** badge: readings come from the meter, not a photo of a bill.
- Water meter leak alert: the leak wheel spinning at 3 a.m. means water is running.
- No new hardware, no AI per frame: plain image processing on a phone the household already has.

Footer line: *Built on the same fair-score engine. No ESP32 required.*
