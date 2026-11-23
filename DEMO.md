# Demo: Kuryentipid in under 2 minutes

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
| 0:10 | "Kuryentipid reads it." | Resident phone → **Scan** → Take photo. Fields fill in, including the 12-month chart. **Looks right, save** → confirm. The receipt opens. |
| 0:30 | "Now his appliances." | Scan the aircon sticker: 1,050 W, non-inverter. Set 2 h a day. **Add appliance**. |
| 0:45 | "Here's his bill as a receipt. The aircon is half of it, and part of the bill isn't explained by anything he owns. That's the Unaccounted line: a worn ref seal, standby devices, or a leak." | Tap **View receipt**. |
| 1:00 | "The fix: an inverter aircon saves about ₱300 a month." | Point at **Change this first**. |
| 1:10 | "Now the fair part. Mang Jun's small house is ranked #1 at 22%, above the mansion at 6%. Everyone competes against their own bill from the same month last year." | **Ranking**. |
| 1:25 | "Top savers get vouchers at the sari-sari store." | Admin laptop → **Issue vouchers** → confirm. Resident → **Vouchers**: show the QR. |
| 1:40 | "Aling Nena scans it. Accepted. Try again: already used." | Store phone → redeem, then redeem the same code again. |
| 1:50 | "Fair, verified, local. SDG 7, one barangay at a time." | End on the landing page. |

**If a judge asks "a bill is monthly, what about daily?"** Resident phone → **Scan → Room check → Start camera**, point it at a lamp or TV that is on with nobody in view, **Check now**: the phone says "Checking the room", then reads out "May naiwang bukas, walang tao" with the ₱ per hour from Mang Jun's own bill. Switch it off, then tap **Naayos na ito** (or **Check now** again) to show the alert turn into **Naayos na.** Turn the volume up first. Then the roadmap slide. (Needs a saved bill for the pesos; uses one of the 20 AI reads per hour.)

**If a step fails live:** scanning falls back to typing the numbers (show that as a feature: "the AI suggests, the resident confirms"). The flagged bill (Bahay #068, ₱3/kWh) is already waiting in the admin queue if you need to show the review step.

## Panel questions about Room check

Answer with the number or the rule first.

| Question | Answer |
|---|---|
| Isn't this a CCTV inside people's homes? | No recording. Each check sends one frame to the AI and it is discarded; nothing is saved in storage or the database. Only that resident sees the result, and nothing reaches the ranking or the admin. The AI is asked whether someone is there, never who. |
| What does it cost to run? | The same free AI chain as the bill. Every check counts toward the 20 AI reads per account per hour, so auto-check can never run past that; any failure turns it off. |
| How do you avoid false alarms? | The AI lists only what is clearly on and says "unclear" instead of guessing. Whether it is waste is decided by our code, not the AI: something on **and** nobody in view. |
| Where do the pesos per hour come from? | The household's own bill rate (amount ÷ kWh) times the appliance's watts: from their own scanned sticker if they have one, else a typical value. A 100 W TV at ₱12.56/kWh is ₱1.26 an hour. |
| Why not smart plugs or sensors? | No hardware to buy: a phone the household already has. |
| Why only electricity, not water leaks? | SDG 7, and every peso is priced from the electric bill. The prototype's water check was left out on purpose. |
| Does it change the ranking? | No. The ranking still comes only from verified bills. Room check is the resident's own tool for cutting waste before the next bill. |

## Roadmap slide: Meter camera

**Title:** Next: daily feedback from the meter

- An old phone pointed at the electric meter counts the pulse-LED blinks (or disc turns): live watts, no wiring.
- Daily progress instead of waiting for the monthly bill: "Today you're 12% under your baseline."
- **Meter-Verified** badge: readings come from the meter, not a photo of a bill.
- Water meter leak alert: the leak wheel spinning at 3 a.m. means water is running.
- No new hardware, no AI per frame: plain image processing on a phone the household already has.

Footer line: *Built on the same fair-score engine. No ESP32 required.*
