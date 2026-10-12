# Solar

Solar at https://motorhometools.co.uk/power/solar.html sizes a panel array from daily watt-hours, peak sun hours, a loss percent and a margin. Array watts = daily Wh × (1 + margin% / 100) ÷ (peak sun hours × (1 − loss% / 100)). Panel counts are the array watts rounded up to 100 W, 200 W and 400 W panels.

## Sub-features

- `solar-default` uses Daily Power’s total, spring/autumn sun, 25% loss and 10% margin.
- `solar-season` switches summer (4.5 h), spring/autumn (3 h) and winter (1.2 h).
- `solar-manual` accepts a typed daily Wh instead of the Daily Power total.

## How to get to it (user POV)

- From Battery or Daily Power, follow the next-tool link to Solar.
- Open https://motorhometools.co.uk/power/solar.html.
- Ask “solar”, then follow the link to `/power/solar.html`.
- The guide https://motorhometools.co.uk/guides/solar-reality-check.html links here.

Inputs: season buttons in `#seasons`, `#peak-sun-hours` (0.5–12, default 3), `#loss-pct` (default 25), `#margin-pct` (default 10), optional `#manual-wh`.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context, so daily energy is the default 916.5 Wh.
- Season is spring/autumn (3 peak sun hours). Loss 25%. Margin 10%.

- **Default array.** Open `/power/solar.html`. Energy needed = 916.5 × 1.10 = 1008.15 Wh. Effective hours = 3 × 0.75 = 2.25. Array = 1008.15 ÷ 2.25 = 448.066… W. A correct result is `#array-watts` `448`, `#panels-100` `5`, `#panels-200` `3`, `#panels-400` `2`.
- **After fridge-only Daily Power.** In the same browser that saved 450 Wh, open Solar. Energy needed is 495 Wh and the array is 220 W: 3 × 100 W, 2 × 200 W, 1 × 400 W.
- **Proof.** Screenshots `power-solar-default.png` and `power-solar-from-fridge.png`.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` runs both rows below.

EXPECTED comes from `power/assets/calc.js` `calcSolarArray` and `panelCounts`, then `formatWatts` in `power/assets/solar.js`.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. Daily 916.5 Wh, spring/autumn 3 peak hours, 25% loss, 10% margin | `#array-watts` 448, `#panels-100` 5, `#panels-200` 3, `#panels-400` 2. Worked sum: 916.5 × 1.10 ÷ (3 × 0.75) = 448.066… W, then ceil to panel counts | Same as EXPECTED | none | PASS |
| Same solar settings after Daily Power was saved as fridge-only 450 Wh | `#array-watts` 220, `#panels-100` 3, `#panels-200` 2, `#panels-400` 1. Worked sum: 450 × 1.10 ÷ 2.25 = 220 W | Same as EXPECTED | none | PASS |

## Gotchas

- Winter at 1.2 peak hours on the same daily load needs a much larger array. Do not expect `448` after choosing Winter.
- Peak sun hours are clamped to 0.5–12. A typed 0 does not stay zero.
- Solar reads `powertools.systemProfile`. A previous Daily Power edit changes `#array-watts`.
