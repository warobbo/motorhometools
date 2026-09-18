# Co-pilot Ask (Phase A Payload + Phase Gas + Phase Cassette estimate)

Wayne lock, 18 Sep 2026: natural-language Ask may call **only** existing calculator maths. Answer first, labelled assumptions second. Never invent plated MAM / MIRO, tyre pressures, or legal limits. Tyres is HOLD. No homepage Ask resize. No campsite / trip planner.

This hub still talks to Payload as a signpost (`https://motorhomepayload.co.uk/`). Phase A adds a Payload-first answer **before** the synonym router, using the sibling maths — not guessed formulas.

## How this hub talks to Payload today

| Path | What happens |
| --- | --- |
| Home / Ask tiles | New tab to `motorhomepayload.co.uk` |
| Synonym router | Weight words (MAM, MIRO, axle, weighbridge…) open Payload |
| Co-pilot (this phase) | Multi-factor NL → intent schema → `computePayload()` → **rough answer first**, then assumptions + calculator CTA (query-string prefill) |
| Unmatched Ask | `POST /api/ask` JSONL / stdout — no invented answer |

The live Payload page does **not** yet read query-string prefill (only Tyres uses `?front=` / `?rear=`). Ask still appends Payload field keys (`freshCap`, `gas6`, `bikes`, `bikeKg`, `rackKg`, …) so a later sibling change can apply them. Remaining-payload questions also encode the visitor’s kg as `mam=<remaining>&miro=0` (same empty-base trick as the Ask maths) — that handoff depends on the sibling Payload URL-prefill PR. The CTA says Ask is a quick guide; Payload is where you enter accurate data. The answer-card link must keep that query string; Ask stays on the thread (`navigate: false`).

There is no Payload HTTP maths API. Registration lookup (`/api/vehicle-lookup`) stays on the sibling host and is **not** called from Ask (no plated-weight invention, no DVLA key here).

## Inventory — Payload inputs / outputs

Source: [warobbo/motorhome-payload-calculator](https://github.com/warobbo/motorhome-payload-calculator) commit `611d2207d6e91d4a48fb3dc2c66d957092c59a59`.

### Inputs Ask may fill (Phase A)

| Slot | Sibling field | Maths |
| --- | --- | --- |
| Remaining payload the visitor already knows | Treated as `mam` with `miro = 0` so `remaining = available − named items` | Same as `mam − (base + added)` with empty base |
| MAM + Mass in Service | `mam`, `miro` | `remaining = mam − (miro + added)` |
| Fresh water litres (`l` / litre(s) / liter(s) / `ltr` / `ltrs`) | `freshCap` × `freshFill` / 100 | **1 kg per litre** |
| Gas bottles 6 / 9 / 13 kg labels | `gas6` / `gas9` / `gas13` × full-bottle kg | Full defaults **13 / 18.5 / 28 kg** (gas + steel cylinder) |
| Pedal bikes, kg omitted | `bikes`, `bikeKg` | **14 kg each** — labelled Payload pedal-bike default |
| Bike rack, not specified | `rackKg` when `bikes > 0` | **12 kg** — labelled Payload rack default |
| Pedal bikes with typed kg | `bikes`, `bikeKg` (+ rack default unless a rack kg is typed) | `kg × qty` + rack |
| E-bikes with typed kg | `customItems` (`CustomKit.itemKg`) | `kg × qty`. **No e-bike kg default** (they vary; no standard) |

### Sibling inputs Ask does **not** silently apply

First-paint DEFAULTS on the tool (extra adult, 50% of a 90 L tank, one 6 kg bottle, LiFePO4, toolbox, 20 kg misc, …) are **not** copied into Ask. Only named slots, plus the labelled bike / rack / water / gas standards above. Driver 75 kg / 90% diesel rules exist in `computePayload()` for fidelity if those fields are set later; Phase A leaves them at zero.

Electrical presets (`BATT_KG`, `SOLAR_KG`), axle check, DVLA plate lookup, and tyre tables are out of Phase A.

### Outputs

- Plain-English **answer first** (used / remaining)
- Assumptions in plain English (water 1 kg/L, gas full-bottle, bike 14 kg, rack 12 kg, “remaining” vs MAM)
- Soft follow-up when a default was used (“If your bikes differ, tell me the kg and I’ll recalculate”)
- Gaps only for true unknowns with no standard (e-bike kg, tank litres, plated MAM / MIRO)
- Calculator CTA: open Payload to fine-tune; Ask is a quick guide
- `usedKg` / `remainingKg` from `computePayload()`
- Deep-link to Payload with query keys where known

## Honesty / conversation rules

- Missing pedal-bike kg → apply **14 kg** and **12 kg rack**, labelled. Do not refuse.
- Incomplete tokens like “3 b” in a payload question → infer bikes, or ask **one** short clarifying question, then compute. Do not dump blockers.
- Unknown e-bike kg → gap / ask for kg. Do not use the 14 kg pedal default.
- No remaining payload and no MAM → refuse plated invention, still hand off to Payload.
- Fresh water with litres (including UK `100ltrs` / `100 ltr`) → include at **1 kg per litre**. Do not drop the item.
- Water mentioned with no litres (and full tank with no litres) → gap. Do not invent a tank size. Do not silently omit.
- Tyres / PSI / bar / pressure → HOLD message only. Do not open a calculated pressure.
- Power / Water duration questions → stay in Ask with an honest “not calculated yet” card and a soft calculator CTA. Do not auto-open a tab. Do not invent Ah, watts, or tank litres-per-day. **Phase B Power, Phase C Water.**
- Gas BBQ / outdoor-cook / bottle-days → **Phase Gas estimate**: cooking-line only from mhwater `gas-calc.js` (`light` 0.025 / `normal` 0.04 / `heavy` 0.07 kg per person-unit per meal; child factor 0.7). BBQ / barbecue N times a day → `mealsPerDay = N` (default 2), `cookingStyle = heavy`, labelled as a heavy-cook proxy — **not** a separate outdoor BBQ kg/h. Default bottle **7 kg butane** (`butane7`) if none named. Heating / fridge-on-gas / boiler stay **off** for these longevity questions unless the visitor said otherwise. Soft CTA uses the mhwater `buildGasPrefillHref` contract on `https://motorhomewater.co.uk/gas.html` (landed [mhwater#18](https://github.com/warobbo/mhwater/pull/18)): `adults`, `children`, `tripDays` (only if named), `mealsPerDay`, `cookingStyle`, `heatingLevel`, `heatingHours` (only if level omitted), `fridgeGasEnabled` (0|1), `boilerEnabled` (0|1), `boilerLevel` / `boilerHours` (only if boiler on), `gasType`, `bottleId`, `bottleKg` (custom bottles only). BBQ twice/day example: `mealsPerDay=2&cookingStyle=heavy&adults=2&heatingLevel=off&fridgeGasEnabled=0&boilerEnabled=0&gasType=butane&bottleId=butane7` → 0.28 kg/day, ~25 days on 7 kg. Stay in Ask — no `window.open`.
- Cassette empties / days / 2nd cassette → **Phase Cassette estimate**: flush-litre empty-days from mhwater `cassette-calc.js` labelled defaults only (`blackTankLitres` **18**, `flushesPerPersonPerDay` **5**, `litresPerFlush` **0.25**, `startPercent` **0**, `blackKind` **cassette**). Adults default **2** when “for 2” / couple / unspecified. Children **0** unless said (full person, no Gas child factor). `wasteDaily = (adults + children) × flushes × litresPerFlush`. `daysOne = usable / wasteDaily` where `usable = blackTankLitres × (1 − startPercent/100)`. For 2nd / second / spare / extra cassette: `daysTwo = (2 × usable) / wasteDaily`, `extraDays = daysTwo − daysOne` (≈ `daysOne` when start is empty). Soft CTA uses the same field names on `https://motorhomewater.co.uk/cassette.html`: `adults`, `children`, `tripDays` (only if named), `blackKind`, `blackTankLitres`, `flushesPerPersonPerDay`, `litresPerFlush`, `startPercent`. Example for two people: `adults=2&children=0&blackKind=cassette&blackTankLitres=18&flushesPerPersonPerDay=5&litresPerFlush=0.25&startPercent=0` → 2.5 L/day, **7.2 days** one cassette, **~7 extra / ~14 total** with a spare. `cassetteCount` is not sent (mhwater still plans one cassette); spare days stay in Ask prose. Stay in Ask — no `window.open`. Bare “cassette” / “toilet” / “open cassette” keep the later soft CTA.
- Gas fridge / heating / winter / boiler as the topic (no BBQ / cook meals) → later stub. Do not invent those burn hours in Ask.
- Campsite / route / trip planner → unmatched capture. Hard stop.

Tone: guidance / solutions. Gaps are secondary notes, not the headline. Strong pink/red styling is for true unknowns with no standard, or Tyres HOLD — not for labelled bike / water / gas assumptions.

## Extension point

`assets/copilot.js` `DOMAINS`: `payload` (live), `gas` (Phase Gas cooking-line estimate), `cassette` (Phase Cassette empty-days estimate), `tyres` (hold), `power` (Phase B stub), `water` (Phase C stub). Later stubs and Gas fridge / heating questions answer in Ask and hand off with a soft CTA.

Parse is deterministic. `handleAsk(text, { llmParse })` may refine **slots only**; maths stay in `computePayload()`, `calcGasCooking()`, or `calcCassetteDays()`. No paid LLM API is wired. Leave it off.

## Phase Gas — cooking-line inventory

Source: [warobbo/mhwater](https://github.com/warobbo/mhwater) `assets/gas-calc.js` `calcGas()` **cooking row only**.

| Slot | Default if omitted | Maths |
| --- | --- | --- |
| Adults | **2** | person-units = adults + children × **0.7** |
| Children | 0, or 1 if children/kids mentioned with no number | child factor 0.7 |
| BBQ / barbecue N times a day | N, or **2** if BBQ named without N | `mealsPerDay = N`, `cookingStyle = heavy` (0.07 kg) |
| Cooking style | `normal` (0.04) unless BBQ / heavy / light named | labelled GasCalc rates only |
| Bottle | **7 kg butane** (`butane7`) | `bottleDays = bottleKg / dailyKg` |
| Heating / fridge gas / boiler | **off** / 0 / 0 | not added on the Ask cooking line |

`dailyKg = (adults + children × 0.7) × mealsPerDay × cookRate`. Example: 2 adults × 2 BBQ uses × 0.07 = **0.28 kg/day**; 7 kg bottle → **~25 days**.

## Phase Cassette — empty-days inventory

Source: [warobbo/mhwater](https://github.com/warobbo/mhwater) `assets/cassette-defaults.js` labelled defaults and `cassette-calc.js` `calcCassette()` days-until-empty row.

| Slot | Default if omitted | Maths |
| --- | --- | --- |
| Adults | **2** (“for 2” / couple / unspecified) | heads = adults + children |
| Children | 0 unless said | full person — no Gas child factor |
| Cassette litres | **18 L** | labelled Cassette default |
| Flushes / person / day | **5** | labelled Cassette default |
| Litres per flush | **0.25 L** | labelled Cassette default |
| Start percent | **0** (empty) | `usable = litres × (1 − start/100)` |
| 2nd / spare cassette | explained in Ask text | `daysTwo = (2 × usable) / wasteDaily` |

`wasteDaily = heads × 5 × 0.25`. Example: 2 adults → **2.5 L/day**; empty 18 L → **7.2 days**; a 2nd empty cassette → **7.2 extra / 14.4 total** (shown as ~7 extra / ~14 total). CTA keeps `blackTankLitres=18` and does not send `cassetteCount`.

## Flow

1. Co-pilot (`handleAsk` / `resolveAsk`) — Payload estimates, Phase Gas cooking-line estimates, Phase Cassette empty-days estimates, and Tyres HOLD in Ask
2. Later domains (Power / Water / Gas fridge or heating / vague cassette / …) stay **in Ask** with a soft calculator CTA. The synonym router still chooses the page; it must not `window.open` / wipe the thread
3. Unmatched `POST /api/ask`

Homepage Ask size / heading is unchanged. The answer card only appears after submit.
