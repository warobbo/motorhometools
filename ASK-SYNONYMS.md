# Ask synonym coverage (Font owns this)

Wayne lock, 15 Sep 2026: **Wayne must never discover missing Ask synonyms by typing.** Font QA owns Ask coverage permanently.

## Same-change rule

When a hub adds a starter appliance or default label, update `assets/router.js` in the **same change**. Do not wait for an unmatched Ask log.

| Hub | Source of truth |
| --- | --- |
| Power | `warobbo/power-tool` `assets/defaults.js` — `STARTER_IDS` / `starterSet()` and `INVERTER_LOAD_IDS` / `inverterStarterSet()` |
| Gas | `warobbo/mhwater` `assets/gas-defaults.js`, `assets/gas-calc.js` (Calor / LPG / bottles / cooking / heating / fridge-on-gas) |
| Water | `warobbo/mhwater` `assets/defaults.js` (shower, wash-up, laundry, drink/cook, fresh) |
| Tanks | `warobbo/mhwater` `assets/tank-defaults.js` (fresh / grey / black holding tanks) |
| Cassette | `warobbo/mhwater` `assets/cassette-defaults.js` plus toilet / loo / chemical toilet |
| Payload | `warobbo/motorhome-payload-calculator` — MAM, MIRO, Mass in Service, axle, weighbridge, remaining payload |
| Tyres | Existing pressure / psi / bar / CP only. Do not invent sidewall pressure synonyms. |

## Routing locks (do not reverse)

- Bare fridge / freezer / coolbox / oven → **Power**. Gas / absorption / 3-way fridge → **Gas**.
- Standalone grill → **Gas** (with BBQ). Electric grill / air fryer / air fry / Wonder Oven → **Power**.
- Bare axle / axles / front axle / rear axle → **Payload**.
- Radio / stereo / bluetooth / speaker / charger / USB → **Power** (12 V leisure kit, same bucket as lights, TV, phone charge).
- Diesel heater / heater fan / 12 V pump → **Power** (electrical draw). Gas heater / heating / BBQ / grill stay **Gas**.
- Toilet / loo / cassette → **Cassette**.
- Ask opens a page. It never invents a pressure, weight or legal number.
- Co-pilot Ask (Phase A) runs before this list for multi-factor Payload questions and Tyres HOLD. Font still owns hub keywords here. Do not teach the co-pilot invented kg.

## How to add a word

1. Put the name token in the matching seed list in `assets/router.js`.
2. Add a row to the regression table in `tests/router.test.js`.
3. Run `npm test`.

Seen twice in unmatched Ask logs → add a synonym the same way. No campsite or route words.
