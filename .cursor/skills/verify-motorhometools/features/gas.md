# Gas

Gas / LPG at https://motorhometools.co.uk/water/gas.html estimates kilograms from cooking, heating, a gas fridge and a boiler. Cooking kg/day = people-units × meals per day × a style rate (light 0.025, normal 0.04, heavy 0.07 kg per person-unit per meal). People-units = adults + children × 0.7. Heating is 0.18 kg/h, gas fridge 0.016 kg/h, boiler 0.12 kg/h. Bottle days = bottle kg ÷ kg per day. Bottles needed = trip kg ÷ bottle kg, rounded up. Butane and propane use the same kg rates. The default bottle is 7 kg butane.

## Sub-features

- `gas-default` is summer cooking only: 2 adults, 2 normal meals, heating off, 7 kg butane, 2 days.
- `gas-heavy-meal` is one heavy meal a day for those two adults.
- `gas-heating` adds heater hours. The default drive does not turn heating on.
- `gas-prefill` accepts a query string from Ask. The default drive uses the form, not a prefill URL.

## How to get to it (user POV)

- From Water, choose Gas in the tool nav.
- Open https://motorhometools.co.uk/water/gas.html .
- Ask “gas”, “Calor” or “bottle”, then follow the Open link.
- The guide https://motorhometools.co.uk/guides/gas-lpg-basics.html links here.

Inputs: `#adults`, `#children`, `#tripDays`, `#mealsPerDay`, cooking buttons `[data-cooking]`, heating buttons `[data-heating]`, `#heatingHours`, `#fridgeGasEnabled`, `#boilerEnabled`, gas type and bottle buttons, `#bottleKg`.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context. Gas then starts from its own defaults (2 adults, 2 days, summer, normal cooking, heating off, fridge off, boiler off, 7 kg butane), not from a half-edited Water profile.

- **Default.** Cooking = 2 × 2 × 0.04 = 0.16 kg/day. Trip = 0.32 kg. Bottle days = 7 ÷ 0.16 = 43.75, shown as `44` because the page rounds day counts of 10 or more to a whole number. Bottles needed = 1.
- **One heavy meal.** Set `#mealsPerDay` to 1 and choose Heavy. Cooking = 2 × 1 × 0.07 = 0.14 kg/day. Trip = 0.28 kg. Bottle days = 7 ÷ 0.14 = 50. Bottles needed = 1.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` performs both. Screenshot `gas-heavy-meal.png`.

EXPECTED comes from `water/assets/gas-calc.js` `calcGas` and the formatters in `water/assets/gas-app.js`. It is not a guessed bottle life.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. 2 adults, 2 normal meals/day, heating off, 7 kg butane, 2 days | `#total-trip` 0.32, `#total-daily` 0.16, `#bottle-days` 44, `#bottles-needed` 1 | Same as EXPECTED | none | PASS |
| Same people, trip and bottle. 1 heavy meal/day, heating still off | `#total-trip` 0.28, `#total-daily` 0.14, `#bottle-days` 50, `#bottles-needed` 1 | Same as EXPECTED | none | PASS |

## Gotchas

- `44` days is the rounded label for 43.75. A proof that expects the raw 43.75 in the heading will fail on a correct page.
- Heating, fridge and boiler are off in both cases above. Turning heating on (0.18 kg/h) dwarfs the cooking line. Do not compare a winter preset with these figures.
- A saved Water profile can change adults and trip length on Gas. Use a fresh context for the default row.
- The bottle picker at `/water/bottles.html` is still a coming-soon page. It is not this calculator.
