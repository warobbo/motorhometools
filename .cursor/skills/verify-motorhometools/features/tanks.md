# Tanks

Holding tanks at https://motorhometools.co.uk/water/tanks.html turn the Water page’s daily litres into days until the fresh tank runs dry, the grey tank fills, or the cassette needs emptying. Stretch days are the shortest of those. Fresh usable = tank × start% / 100. Grey and cassette usable = tank × (1 − start% / 100). Days = usable ÷ that water’s daily litres.

## Sub-features

- `tanks-default` uses Water’s default daily litres and the default tank sizes.
- `tanks-limiter` names whichever tank runs out first.
- `tanks-shared` reads `watertools.systemProfile`. Changing Water changes these days.

## How to get to it (user POV)

- From Water or Gas, choose Tanks.
- Open https://motorhometools.co.uk/water/tanks.html .
- Ask “tanks” or “grey water”, then follow the Open link.
- The guide https://motorhometools.co.uk/guides/fresh-waste-tanks.html links here.

Inputs: `#freshTankLitres` (default 100), `#greyTankLitres` (default 90), black kind, `#blackTankLitres` (default 18), `#tripDays`, `#freshStartPercent` (default 100), `#greyStartPercent` (default 0), `#blackStartPercent` (default 0). Daily fresh, grey and cassette litres come from the Water profile, not from extra fields on this form.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context, so Water is still the default: fresh 18.5 L/day, grey 11 L/day, cassette 2.5 L/day.
- Tanks: fresh 100 L starting full, grey 90 L starting empty, cassette 18 L starting empty.

- **Default stretch.** Fresh days = 100 ÷ 18.5 = 5.405…, shown as `5.4`. Grey days = 90 ÷ 11 = 8.181…, shown as `8.2`. Cassette days = 18 ÷ 2.5 = 7.2. The shortest is fresh, so `#stretch-days` is `5.4`.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` opens `/water/tanks.html` in a fresh context. Screenshot `tanks-default.png`.

EXPECTED comes from `water/assets/tank-calc.js` `calcTanks` using `calcWater` defaults, then `formatDays` in `water/assets/tank-app.js` (one decimal under 10 days). It is not a guessed stop interval.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. Water defaults (18.5 / 11 / 2.5 L per day). Fresh 100 L at 100%, grey 90 L at 0%, cassette 18 L at 0% | `#stretch-days` 5.4, `#fresh-days` 5.4, `#grey-days` 8.2, `#black-days` 7.2 | Same as EXPECTED | none | PASS |

A second input that changes Water first (for example the 68 L trip edit) changes these days. That combined case was not driven. Its EXPECTED would have to be recalculated from the edited Water result; this file does not invent one.

## Gotchas

- Stretch days follow the Water habits saved in this browser. They are not a fixed property of the tank sizes alone.
- Fresh “days” assume the tank starts full. Grey and cassette “days” assume they start empty. A different start percent is a different sum.
- The cassette days here use Water’s flush litres. The Cassette page has its own flush fields and can disagree if those were edited separately.
- Each field has one label. A number label wraps the input and does not also use `for`. Toilet waste type is named once, from `#black-kind-label`.
