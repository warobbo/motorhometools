# Co-pilot Ask (Phase A Payload + Phase Gas + Phase Cassette + Wave 3)

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
- Power / Water duration questions (except locked Wave 3 portable air-con) → stay in Ask with an honest “not calculated yet” card and a soft calculator CTA. Do not auto-open a tab. Do not invent Ah, watts, or tank litres-per-day. **Phase B Power, Phase C Water.**
- Portable air-con / Wave 3 / “what will aircon do to my battery” → **Phase Wave 3 estimate**: EcoFlow Wave 3 only at **640 W DC** (EcoFlow UK rated cooling). Never invent watts. Never use 6100 BTU / 1800 W cooling capacity as electrical draw. **Hours are not defaulted** — no 4 h / 8 h invention. If hours are named (`4 hours`, `overnight 8h`, `3 hrs a day`): `Wh/day = 640 × hours`, `Ah at 12 V ≈ Wh / 12` (and 24 V = Wh / 24). If hours are missing: cite 640 W DC, each hour ≈ 640 Wh (~53 Ah at 12 V), ask hours/day or soft-open Power. Soft CTA stays in Ask (`navigate: false`) — no `window.open`. Prefill contract matches [power-tool#26](https://github.com/warobbo/power-tool/pull/26) on `https://motorhomepower.co.uk/`: `wave3=1` and `hours=N` only when named (page keeps 640 W and 0 h if those keys are omitted). Example: 4 hours → **2560 Wh/day**, **~213 Ah at 12 V**, CTA `?wave3=1&hours=4`.
- Gas BBQ / outdoor-cook / bottle-days → **Phase Gas estimate**: cooking-line only from mhwater `gas-calc.js` (`light` 0.025 / `normal` 0.04 / `heavy` 0.07 kg per person-unit per meal; child factor 0.7). BBQ / barbecue N times a day → `mealsPerDay = N` (default 2), `cookingStyle = heavy`, labelled as a heavy-cook proxy — **not** a separate outdoor BBQ kg/h. Default bottle **7 kg butane** (`butane7`) if none named. Heating / fridge-on-gas / boiler stay **off** for these longevity questions unless the visitor said otherwise. Soft CTA uses the mhwater `buildGasPrefillHref` contract on `https://motorhomewater.co.uk/gas.html` (landed [mhwater#18](https://github.com/warobbo/mhwater/pull/18)): `adults`, `children`, `tripDays` (only if named), `mealsPerDay`, `cookingStyle`, `heatingLevel`, `heatingHours` (only if level omitted), `fridgeGasEnabled` (0|1), `boilerEnabled` (0|1), `boilerLevel` / `boilerHours` (only if boiler on), `gasType`, `bottleId`, `bottleKg` (custom bottles only). BBQ twice/day example: `mealsPerDay=2&cookingStyle=heavy&adults=2&heatingLevel=off&fridgeGasEnabled=0&boilerEnabled=0&gasType=butane&bottleId=butane7` → 0.28 kg/day, ~25 days on 7 kg. Stay in Ask — no `window.open`.
- Cassette empties / days / 2nd cassette → **Phase Cassette estimate**: flush-litre empty-days from mhwater `cassette-calc.js` labelled defaults only (`blackTankLitres` **18**, `flushesPerPersonPerDay` **5**, `litresPerFlush` **0.25**, `startPercent` **0**, `blackKind` **cassette**). Adults default **2** when “for 2” / couple / unspecified. Children **0** unless said (full person, no Gas child factor). `wasteDaily = (adults + children) × flushes × litresPerFlush`. `daysOne = usable / wasteDaily` where `usable = blackTankLitres × (1 − startPercent/100)`. For 2nd / second / spare / extra cassette: `daysTwo = (2 × usable) / wasteDaily`, `extraDays = daysTwo − daysOne` (≈ `daysOne` when start is empty). Soft CTA uses the mhwater cassette URL-prefill contract (landed [mhwater#19](https://github.com/warobbo/mhwater/pull/19)) on `https://motorhomewater.co.uk/cassette.html`: `adults`, `children`, `tripDays` (only if named), `blackKind` (`cassette` \| `fixed`; aliases `fixedBlack`, `fixed-black`, `fixed_black`), `blackTankLitres` (one cassette), optional `cassetteCount` (page multiplies into `blackTankLitres`), `flushesPerPersonPerDay`, `litresPerFlush`, `startPercent`. 2nd-cassette example: `adults=2&blackTankLitres=18&flushesPerPersonPerDay=5&litresPerFlush=0.25&startPercent=0&cassetteCount=2` → 2.5 L/day, **7.2 days** one cassette, **~7 extra / ~14 total**. Stay in Ask — no `window.open`. Bare “cassette” / “toilet” / “open cassette” keep the later soft CTA.
- Gas fridge / heating / winter / boiler as the topic (no BBQ / cook meals) → later stub. Do not invent those burn hours in Ask.
- Campsite / route / trip planner → unmatched capture. Hard stop.

Tone: guidance / solutions. Gaps are secondary notes, not the headline. Strong pink/red styling is for true unknowns with no standard, or Tyres HOLD — not for labelled bike / water / gas assumptions.

## Extension point

`assets/copilot.js` `DOMAINS`: `payload` (live), `gas` (Phase Gas cooking-line estimate), `cassette` (Phase Cassette empty-days estimate), `power` (Wave 3 portable air-con estimate; other Power stays Phase B stub), `tyres` (hold), `water` (Phase C stub). Later stubs and Gas fridge / heating questions answer in Ask and hand off with a soft CTA.

Parse is deterministic. `handleAsk(text, { llmParse })` may refine **slots only**; maths stay in `computePayload()`, `calcGasCooking()`, `calcCassetteDays()`, or `calcWave3()`. No paid LLM API is wired. Leave it off.

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
| 2nd / spare cassette | `cassetteCount=2` on the CTA | `daysTwo = (2 × usable) / wasteDaily` |

`wasteDaily = heads × 5 × 0.25`. Example: 2 adults → **2.5 L/day**; empty 18 L → **7.2 days**; a 2nd empty cassette → **7.2 extra / 14.4 total** (shown as ~7 extra / ~14 total). CTA keeps `blackTankLitres=18` and sends `cassetteCount=2` (mhwater multiplies to 36 L on the page).

## Phase Wave 3 — portable air-con inventory

Source: EcoFlow UK Wave 3 **rated cooling DC 640 W**. Not cooling capacity (6100 BTU / 1800 W).

| Slot | Default if omitted | Maths |
| --- | --- | --- |
| Product | EcoFlow Wave 3 | locked |
| Watts | **640 W DC** | never invented; never 1800 W |
| Hours / day | **none** — ask or soft-open Power | never 4 h / 8 h |
| Wh/day | only when hours named | `640 × hours` |
| Ah at 12 V | only when hours named | `Wh / 12` |
| Ah at 24 V | only when hours named (optional) | `Wh / 24` |

Example: 4 hours a day → **2560 Wh/day**, **~213 Ah at 12 V**. Missing hours → per-hour **640 Wh (~53 Ah at 12 V)** and a question, no daily total.

## Flow

1. Co-pilot (`handleAsk` / `resolveAsk`) — Payload estimates, Phase Gas cooking-line estimates, Phase Cassette empty-days estimates, Wave 3 portable air-con estimates, and Tyres HOLD in Ask
2. Later domains (other Power / Water / Gas fridge or heating / vague cassette / …) stay **in Ask** with a soft calculator CTA. The synonym router still chooses the page; it must not `window.open` / wipe the thread
3. Unmatched `POST /api/ask`

Homepage Ask size / heading is unchanged. The answer card only appears after submit.
