# Daily Power

Daily Power at https://motorhometools.co.uk/power/ turns appliance watts, hours and quantity into watt-hours per day, then amp-hours at 12 V and 24 V. A row counts only when its Use box is ticked. Wh = watts × hours × quantity. Amp-hours = Wh ÷ voltage. Optional inverter loss multiplies the total by `1 + loss% / 100` (default 12%, clamped 0–50).

## Sub-features

- `power-default` shows the starter list with inverter loss off.
- `power-fridge-only` leaves only the compressor fridge ticked.
- `power-loss` adds 12% inverter loss on that fridge row.
- `power-limits` clamps watts to 0–20000, hours to 0–24 and quantity to 1–99, and says so on the row.
- `power-persist` stores the profile in `localStorage` key `powertools.systemProfile` for Battery, Solar and the other Power tools.

## How to get to it (user POV)

- On the home page, choose the Power card.
- Open https://motorhometools.co.uk/power/ directly. `/power` (no slash) redirects to `/power/`.
- Ask “solar”, “battery”, “kettle” or another power word, then follow the Open link. Bare power words that do not name Battery, Solar, Inverter or Wire land here.
- From another Power tool, choose Daily Power in the tool nav.

Inputs are one card per appliance: Use checkbox, `#watts-<id>`, `#hours-<id>`, `#qty-<id>`. The loss checkbox is `#inverter-loss`. Preset buttons live in `#presets` (`data-preset` `weekend`, `family`, `fulltime`, `defaults`).

## Driving it with verify-motorhometools

Preconditions:

- Fresh context, so no saved `powertools.systemProfile`.
- Portrait or desktop. Do not use a short landscape viewport; the rotate gate covers the form.

- **Default load.** Open `/power/`. A correct result is `#total-wh` `917`, `#total-ah12` `76.4`, `#total-ah24` `38.2`. That is the starter list with loss off: 916.5 Wh (45×10 fridge, 8×4 lights, 42×0.25 pump, 18×4 heater, 10×2×2 phones, 60×2 laptop, 24×3 fan, 28×2 TV, 8×8 inverter idle). The page rounds 916.5 Wh to `917`, 76.375 Ah to `76.4` and 38.1875 Ah to `38.2`. Wave 3, kettle, induction hob and electric water heater start unticked and add nothing.
- **Fridge only.** Untick every Use box except Compressor fridge (45 W, 10 h, quantity 1). A correct result is `450`, `37.5`, `18.8` (450 ÷ 12 = 37.5 Ah; 450 ÷ 24 = 18.75 Ah, shown as `18.8`).
- **Inverter loss.** Tick `#inverter-loss`. A correct result is `504`, `42`, `21`. `#loss-note` reads `Includes 54 Wh inverter loss (12%). Appliance loads before loss: 450 Wh.`
- **Proof.** Screenshot `power-daily-fridge-loss.png`. Untick the loss box again before opening Battery if the next proof expects 450 Wh.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` performs these steps. Screenshot `power-daily-fridge-loss.png` and `power-daily-hours-clamp.png`.

EXPECTED comes from `power/assets/calc.js` (`applianceWh`, `calcTotals`, `applyInverterLoss`, `readApplianceField`) and the en-GB formatters in `power/assets/app.js`. The 917 Wh label is 916.5 rounded by that formatter, not a separate guess.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile, inverter loss off. Starter rows as shipped (fridge 45 W × 10 h, lights 8×4, pump 42×0.25, heater 18×4, phone 10×2×2, laptop 60×2, fan 24×3, TV 28×2, inverter idle 8×8; Wave 3, kettle, hob and electric water heater off) | `#total-wh` 917, `#total-ah12` 76.4, `#total-ah24` 38.2 | Same as EXPECTED | none | PASS |
| Only Compressor fridge ticked: 45 W, 10 h, quantity 1. Loss off | `#total-wh` 450, `#total-ah12` 37.5, `#total-ah24` 18.8 | Same as EXPECTED | none | PASS |
| That fridge row, `#inverter-loss` ticked at 12% | `#total-wh` 504, `#total-ah12` 42, `#total-ah24` 21. `#loss-note` is `Includes 54 Wh inverter loss (12%). Appliance loads before loss: 450 Wh.` | Same as EXPECTED | none | PASS |
| Only the fridge ticked, then Hours / day set to 30 | Field `#hours-fridge` becomes 24. `#total-wh` 1,080, `#total-ah12` 90, `#total-ah24` 45. Note: `Maximum is 24 hours a day. This row uses 24 h.` Formula: 45 × 24 × 1, because hours clamp to 24 (`MAX_APPLIANCE_HOURS`) | Same as EXPECTED | none | PASS |

## Gotchas

- If `dist/` exists, the browser runs minified `dist/power/assets/*.js`, not the readable source. `npm test` still loads the source. Rebuild with `npm run build` after a formula change or the page and the tests will disagree.
- Totals stuck on `0` mean the calculator script did not run.
- Editing Daily Power changes what Battery and Solar read from the same profile. The drive script checks that on purpose, in one context, then uses a new context for the default Battery and Solar figures.
- Hours above 24 are brought back to 24 and the row says so. Do not expect the typed 30 to stay in the Wh figure. The explanation note is removed if a later input event sees the already-clamped 24. Fill 30 once.
- Each appliance field has one label. The label wraps the number. It does not also use a `for` attribute.
