# Wire and fuse

Wire and fuse at https://motorhometools.co.uk/power/wire.html picks a flexible copper cable and a fuse from current, one-way length and an allowed voltage drop. Required mm² = (2 × amps × one-way metres × 0.0175) ÷ allowed volts. Allowed volts = system voltage × drop% / 100. The page steps up to the next size in its cable table that also carries the current. The fuse is about 1.1 × current, and it cannot exceed the chosen cable’s amp rating.

## Sub-features

- `wire-inverter-feed` uses the inverter’s recommended continuous watts ÷ battery volts, over 2 m at 3% drop.
- `wire-custom` uses the Custom run preset: 20 A, 3 m, 3% drop, 12 V.
- `wire-presets` cover solar, fridge, heater fan, water pump and a general leisure run.

## How to get to it (user POV)

- From the inverter page, follow “Next: size the DC cable and fuse”.
- Open https://motorhometools.co.uk/power/wire.html.
- Ask “wire”, “fuse”, or “electrical cable”, then follow the Open link. Bare “cable” does not match: it posts an unmatched note and offers no Wire link.

Inputs: preset buttons in `#presets` (`data-preset`), `#current-a`, `#watts`, `#one-way-length`, `#drop-pct`, voltage buttons in `#voltages`.

## Driving it with verify-motorhometools

Preconditions:

- Fresh context, so the inverter suggestion is the default kettle: 1440 W recommended ÷ 12 V = 120 A. One-way length 2 m. Drop 3% (0.36 V allowed).

- **Inverter feed.** Open `/power/wire.html`. Required copper is (2 × 120 × 2 × 0.0175) ÷ 0.36 = 23.33 mm², which steps up to 25 mm² (125 A). Fuse target 132 A cannot exceed the cable, so the fuse is 125 A. Drop on 25 mm² is 0.336 V, shown as `0.34` V and `2.8`%. A correct result is `#cable-mm2` `25`, `#fuse-amps` `125`, `#wiring-amps` `120`, `#drop-v` `0.34`, `#drop-pct-out` `2.8`.
- **Custom run.** Choose the button `Custom run (you type the figures)` (`data-preset="custom"`). That preset is 20 A, 3 m, 3% drop, 12 V. Required mm² is 5.83, so the cable is 6 mm² (40 A) and the fuse is 25 A. Drop is 0.35 V (`2.9`%). A correct result is `6`, `25`, `20`, `0.35`, `2.9`.
- **Proof.** Screenshot `power-wire-custom.png`.

`./.cursor/skills/verify-motorhometools/scripts/drive.js` does both rows.

EXPECTED comes from `power/assets/calc.js` `calcWiring` (copper resistivity 0.0175, return run × 2, cable steps, fuse × 1.1 capped by the cable rating) and the formatters in `power/assets/wire.js`. Inverter-feed current is recommended inverter watts ÷ volts, not ÷ efficiency.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Fresh profile. Inverter DC feed, 12 V, 2 m one way, 3% drop. Suggested current 1440 W ÷ 12 V = 120 A | `#cable-mm2` 25, `#fuse-amps` 125, `#wiring-amps` 120, `#drop-v` 0.34, `#drop-pct-out` 2.8. Required mm² = (2 × 120 × 2 × 0.0175) ÷ 0.36 = 23.33, next step 25 mm² / 125 A | Same as EXPECTED | none | PASS |
| Preset `custom`: 20 A, 3 m, 3% drop, 12 V, inverter suggestion off | `#cable-mm2` 6, `#fuse-amps` 25, `#wiring-amps` 20, `#drop-v` 0.35, `#drop-pct-out` 2.9. Required mm² = (2 × 20 × 3 × 0.0175) ÷ 0.36 = 5.833, next step 6 mm² | Same as EXPECTED | none | PASS |

## Gotchas

- The default feed follows inverter watts ÷ volts. It does not also divide by inverter efficiency. Editing the inverter loads in the same browser changes this current.
- Typing in `#current-a` turns the inverter suggestion off. A later visit still on “Inverter DC feed” is not the 120 A case if that box was cleared.
- The cable table is flexible battery cable, not thin chassis wire. A 25 mm² result is not a thinwall rating.
- Phone landscape (`844×390`) covers this form with the rotate gate. Use portrait.
