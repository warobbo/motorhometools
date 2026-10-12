# Battery

Battery size at https://motorhometools.co.uk/power/battery.html turns daily watt-hours into a bank size. With a fresh profile it uses Daily Power’s total. Energy needed = daily Wh × days of autonomy × (1 + contingency% / 100). Bank Wh = energy needed ÷ (usable% / 100). LiFePO4 usable is 80%. AGM is 50%. Amp-hours = bank Wh ÷ voltage.

## Sub-features

- `battery-default` sizes a bank from the untouched Daily Power total.
- `battery-from-daily` follows a Daily Power total saved in the same browser.
- `battery-chemistry` switches LiFePO4, AGM and a custom usable percent.
- `battery-manual` lets the visitor type a daily Wh instead of the Daily Power total.

## How to get to it (user POV)

- From Daily Power, follow “Next: size a battery”.
- Open https://motorhometools.co.uk/power/battery.html.
- Ask “battery” or “leisure battery”, then follow `Open Battery to enter your figures`.
- The guide https://motorhometools.co.uk/guides/battery-size-plain-english.html links here.

Inputs: `#days-autonomy` (default 2, range 0.5–14), chemistry buttons in `#chemistry`, `#contingency` (default 10), optional `#custom-usable`, optional manual `#manual-wh`.

## Driving it with verify-motorhometools

Preconditions:

- For the default figures, a fresh context (empty `powertools.systemProfile`).
- For the fridge follow-through, the same context that just saved fridge-only Daily Power at 450 Wh with inverter loss off.

- **Default.** Open `/power/battery.html`. Daily energy is 916.5 Wh. Two days × 10% contingency = 2016.3 Wh needed. At 80% usable the bank is 2520.375 Wh. A correct result is `#bank-ah12` `210`, `#bank-ah24` `105`, `#bank-wh` `2,520`.
- **After fridge-only Daily Power.** With 450 Wh saved, two days and 10% contingency need 990 Wh, and an 80% LiFePO4 bank is 1237.5 Wh. A correct result is `103`, `51.6`, `1,238`.
- **Proof.** Screenshots `power-battery-default.png` and `power-battery-from-fridge.png`.

The drive script runs both.

EXPECTED comes from `power/assets/calc.js` `calcBatteryBank` (2 days, LiFePO4 80% usable, 10% contingency) and `formatAh` / `formatWh` in `power/assets/battery.js`. Bank Wh is rounded by that formatter (`2,520` and `1,238`).

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. Daily Power default 916.5 Wh, 2 days, LiFePO4, 10% contingency | `#bank-ah12` 210, `#bank-ah24` 105, `#bank-wh` 2,520. Worked sum: 916.5 × 2 × 1.10 ÷ 0.80 = 2520.375 Wh | Same as EXPECTED | none | PASS |
| Same battery settings after Daily Power was saved as fridge-only 450 Wh, loss off | `#bank-ah12` 103, `#bank-ah24` 51.6, `#bank-wh` 1,238. Worked sum: 450 × 2 × 1.10 ÷ 0.80 = 1237.5 Wh | Same as EXPECTED | none | PASS |

## Gotchas

- A Battery page opened after a Daily Power edit is not on the defaults. Clear site data or use a new context before expecting `210` Ah.
- AGM at the same 916.5 Wh daily figure is a larger bank (50% usable, not 80%). Do not compare an AGM result with the LiFePO4 numbers above.
- Manual daily Wh (`useManualWh`) ignores the Daily Power list until the visitor turns that off.
