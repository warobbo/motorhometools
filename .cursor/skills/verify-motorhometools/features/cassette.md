# Cassette

The cassette planner at https://motorhometools.co.uk/water/cassette.html estimates days until a toilet cassette needs emptying. Waste per day = (adults + children) × flushes per person per day × litres per flush. Children are a full person here. Days until empty = litres still free ÷ waste per day. With the cassette starting empty, free litres are the whole cassette. Empties for the trip = ceil((already in the cassette + waste for the trip) ÷ cassette litres).

## Sub-features

- `cassette-default` is 2 adults, 5 flushes, 0.25 L, 18 L cassette, starting empty, 2-day trip.
- `cassette-shared` can inherit people, trip length and flush size from the Water profile when that profile is already saved.

## How to get to it (user POV)

- From Water, Gas or Tanks, choose Cassette.
- Open https://motorhometools.co.uk/water/cassette.html .
- Ask “cassette”, “toilet” or “loo”, then follow the Open link.
- The guide https://motorhometools.co.uk/guides/cassette-toilet-empty.html links here.

Inputs: `#adults`, `#children`, `#tripDays`, black kind, `#blackTankLitres`, flushes per person, litres per flush, start percent. Defaults when nothing is saved: 2 adults, 0 children, 2 days, cassette, 18 L, 5 flushes, 0.25 L, start 0%.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context, so the page uses those defaults rather than an edited Water or Tanks profile.

- **Default.** Waste = 2 × 5 × 0.25 = 2.5 L/day. Trip waste = 5 L. Days = 18 ÷ 2.5 = 7.2. Empties = ceil(5 ÷ 18) = 1. The trip litre label is `5.0` because this page’s `formatLitres` shows one decimal for amounts from 1 L up to 100 L.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` opens `/water/cassette.html`. Screenshot `cassette-default.png`.

EXPECTED comes from `water/assets/cassette-calc.js` `calcCassette` and `formatDays` / `formatLitres` in `water/assets/cassette-app.js`. It is not a guessed empty interval.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. 2 adults, 0 children, 2 days, 18 L cassette, 5 flushes × 0.25 L, start 0% | `#empty-days` 7.2, `#waste-daily` 2.5, `#waste-trip` 5.0, `#empties-needed` 1. The 5 L trip is labelled `5.0` by `formatLitres` in `water/assets/cassette-app.js` (one decimal from 1 L up to 100 L) | Same as EXPECTED | none | PASS |

## Gotchas

- A 2-day trip does not empty an 18 L cassette (5 L of waste, labelled `5.0`). Days until empty stay 7.2. Do not expect the trip length to appear in `#empty-days`, and do not expect a bare `5` with no decimal.
- There is no child factor on this page. A family preset is not 0.7 × flushes.
- Ask can prefill `blackTankLitres` with a multiplied total (two cassettes stored as one litre figure). The form has no cassette-count field. A prefilled 36 L cassette is a different case from this 18 L default.
- Each field has one label. A number label wraps the input and does not also use `for`. Toilet waste type is named once, from `#black-kind-label`.
