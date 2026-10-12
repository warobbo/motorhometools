# Inverter

The inverter calculator at https://motorhometools.co.uk/power/inverter.html sizes a 230 V inverter from the loads ticked on at once. Recommended continuous watts = running watts × (1 + margin% / 100). Recommended surge is the larger of the combined surge and that continuous figure. DC amps shown on the summary use running watts ÷ efficiency ÷ system voltage (the cable page does not divide by efficiency again).

## Sub-features

- `inverter-default` starts with only the kettle ticked.
- `inverter-loads` add or remove 230 V loads, each with running watts, surge watts and quantity.
- `inverter-voltage` switches the DC amp columns between 12 V and 24 V.

## How to get to it (user POV)

- From Solar or Daily Power, follow the next-tool link.
- Open https://motorhometools.co.uk/power/inverter.html.
- Ask “inverter” or “microwave”, then follow the Open link. Microwave and the other inverter-load names route to Power; the inverter page itself is the one that lists 230 V loads.

Inputs: load cards in `#load-list` (Use, watts, surge, quantity), `#efficiency-pct` (default 88, range 50–100), `#margin-pct` (default 20), voltage buttons in `#voltages`.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context. Only “Kettle” is ticked: 1200 W running, 1200 W surge, quantity 1. Margin 20%. Efficiency 88%. System voltage 12 V.

- **Default kettle.** Open `/power/inverter.html`. Recommended continuous = 1200 × 1.20 = 1440 W. Surge recommendation is also 1440 W because the kettle surge does not exceed that. DC amps at 12 V = 1200 ÷ 0.88 ÷ 12 = 113.636…, shown as `114`. At 24 V that is `56.8`. A correct result is `#inverter-continuous` `1,440`, `#inverter-surge` `1,440`, `#inverter-amps12` `114`, `#inverter-amps24` `56.8`.
- **Proof.** Screenshot `power-inverter-default.png`.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` opens `/power/inverter.html` in a fresh context.

EXPECTED comes from `power/assets/calc.js` `calcInverter` and `formatWatts` / `formatAmps` in `power/assets/inverter.js`. The headline is the margined size. The amps divide running watts by efficiency.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. Kettle only, 1200 W running and surge, quantity 1, margin 20%, efficiency 88%, 12 V system | `#inverter-continuous` 1,440, `#inverter-surge` 1,440, `#inverter-amps12` 114, `#inverter-amps24` 56.8. Worked sum: 1200 × 1.20 = 1440 W; 1200 ÷ 0.88 ÷ 12 = 113.636… A, shown as 114 | Same as EXPECTED | none | PASS |

## Gotchas

- The headline watts are the recommended size (load plus margin), not the bare 1200 W nameplate.
- The amp figures divide by efficiency. The Wire page’s inverter-feed current does not. 120 A on Wire and 114 A here are both correct for this kettle.
- Unticked loads contribute nothing. The induction hob starts off, so the default is not 1200 + 1600.
