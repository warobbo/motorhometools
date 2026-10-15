# Water

Fresh water at https://motorhometools.co.uk/water/ estimates litres per day and for the trip. People-units = adults + children × 0.7. Shower litres per day = people-units × showers per person per day × litres per shower. Drinking = people-units × litres per person. Cassette flushes = (adults + children) × flushes × litres per flush, with no child factor. Fresh = showers + washing up + laundry + drinking + cassette. Grey = fresh − drinking − cassette. Trip litres = daily × days. Weight uses 1 litre = 1 kg.

## Sub-features

- `water-default` opens the default profile: 2 adults, 2 days, 5 cassette flushes, 37 L for the trip. That is not the Weekend preset button.
- `water-edited` changes shower length, showers per day, and turns cassette flushes off.
- `water-weight` shows the trip’s fresh water in kilograms.
- `water-persist` stores `watertools.systemProfile`, which Gas, Tanks and Cassette also read.

## How to get to it (user POV)

- On the home page, choose the Water card.
- Open https://motorhometools.co.uk/water/ . `/water` redirects to `/water/`.
- Ask “water” or “fresh water”, then follow the Open link.
- From Gas, Tanks or Cassette, choose Water in the tool nav.
- The anchor `/water/#weight` is the same page, scrolled to the weight card.

Inputs are on `#usage-form`: `#adults`, `#children`, `#tripDays`, `#freshTankLitres`, `#showersPerPersonPerDay`, shower buttons `[data-shower]` (`short` 6 L, `normal` 12 L, `long` 20 L), `#washUpLitresPerDay`, `#drinkCookLitresPerPersonPerDay`, `#laundryEnabled`, `#cassetteEnabled`.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context, so no saved `watertools.systemProfile`.
- Portrait or desktop. A short landscape viewport covers the form with the rotate gate.

- **Default.** 2 adults, 0 children, 2 days, short shower (6 L) at 0.5 per person per day, washing up 5 L, drinking 2.5 L per person, cassette on (5 × 0.25 L per person), laundry off, fresh tank 100 L. Showers 6 L/day, washing up 5, drinking 5, cassette 2.5. Fresh 18.5 L/day × 2 = 37 L. Grey = 18.5 − 5 − 2.5 = 11 L/day × 2 = 22 L.
- **Edited.** Choose Normal (12 L), set `#showersPerPersonPerDay` to 1, untick `#cassetteEnabled`. Showers become 24 L/day. Fresh = 24 + 5 + 5 = 34 L/day × 2 = 68 L. Grey = 34 − 5 = 29 L/day × 2 = 58 L. The weight note includes `About 68 kg`.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` performs both. Screenshot `water-edited.png`.

EXPECTED comes from `water/assets/calc.js` `calcWater`, then the en-GB formatters in `water/assets/app.js` (`formatLitres`). It is not a guessed total.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. 2 adults, 0 children, 2 days, short shower 6 L, 0.5 showers/person/day, wash 5 L, drink 2.5 L/person, cassette on, laundry off | `#total-trip` 37, `#total-daily` 18.5, `#grey-trip` 22, `#grey-daily` 11 | Same as EXPECTED | none | PASS |
| Same people and trip. Normal shower 12 L, 1 shower/person/day, cassette off | `#total-trip` 68, `#total-daily` 34, `#grey-trip` 58, `#grey-daily` 29. Weight note contains `About 68 kg` | Same as EXPECTED | none | PASS |

## Gotchas

- The Weekend preset button (`data-preset="weekend"`) uses 4 cassette flushes and shows 36 L for the trip (`#total-daily` 18). The default row is 5 flushes and 37 L. Do not click Weekend when checking the default.
- Children count as 0.7 for showers and drinking, and as a full person for cassette flushes. Mixing those up fails a family preset.
- Grey water is not “all the fresh water”. Drinking and cassette flushes are left out of grey.
- This profile is shared with Gas, Tanks and Cassette. A water edit changes those pages in the same browser.
- Phone landscape (`844×390`) shows “Turn your phone upright” and marks the calculator inert.
- Each number field has one label. The label wraps the input. It does not also use a `for` attribute. Shower length is named once, from `#shower-length-label`. Gas, Tanks and Cassette follow the same rule.
- The browser `theme-color` on Water pages is `#1e4f43`, the same pine as the rest of the site.
