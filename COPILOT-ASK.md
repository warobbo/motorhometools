# Co-pilot Ask (Phase A — Payload-first)

Wayne lock, 17 Sep 2026: natural-language Ask may call **only** existing calculator maths. Never invent safety numbers, tyre pressures, legal advice, or missing weights. Tyres is HOLD. No homepage Ask resize. No campsite / trip planner.

This hub still talks to Payload as a signpost (`https://motorhomepayload.co.uk/`). Phase A adds a Payload-first answer **before** the synonym router, using the sibling maths — not guessed formulas.

## How this hub talks to Payload today

| Path | What happens |
| --- | --- |
| Home / Ask tiles | New tab to `motorhomepayload.co.uk` |
| Synonym router | Weight words (MAM, MIRO, axle, weighbridge…) open Payload |
| Co-pilot (this phase) | Multi-factor NL → intent schema → `computePayload()` → answer + assumptions + gaps + query-string link |
| Unmatched Ask | `POST /api/ask` JSONL / stdout — no invented answer |

The live Payload page does **not** yet read query-string prefill (only Tyres uses `?front=` / `?rear=`). Ask still appends Payload field keys (`freshCap`, `gas6`, …) so a later sibling change can apply them. The link label says to enter the same figures.

There is no Payload HTTP maths API. Registration lookup (`/api/vehicle-lookup`) stays on the sibling host and is **not** called from Ask (no plated-weight invention, no DVLA key here).

## Inventory — Payload inputs / outputs

Source: [warobbo/motorhome-payload-calculator](https://github.com/warobbo/motorhome-payload-calculator) commit `611d2207d6e91d4a48fb3dc2c66d957092c59a59`.

### Inputs Ask may fill (Phase A)

| Slot | Sibling field | Maths |
| --- | --- | --- |
| Remaining payload the visitor already knows | Treated as `mam` with `miro = 0` so `remaining = available − named items` | Same as `mam − (base + added)` with empty base |
| MAM + Mass in Service | `mam`, `miro` | `remaining = mam − (miro + added)` |
| Fresh water litres | `freshCap` × `freshFill` / 100 | **1 kg per litre** |
| Gas bottles 6 / 9 / 13 kg labels | `gas6` / `gas9` / `gas13` × full-bottle kg | Full defaults **13 / 18.5 / 28 kg** (gas + steel cylinder) |
| Bikes / e-bikes with kg | `customItems` (`CustomKit.itemKg`) | `kg × qty`. **No invented kg.** No 14 kg pedal default. No rack unless named |

### Sibling inputs Ask does **not** silently apply

First-paint DEFAULTS on the tool (extra adult, 50% of a 90 L tank, one 6 kg bottle, LiFePO4, toolbox, 20 kg misc, …) are **not** copied into Ask. Only named slots. Driver 75 kg / 90% diesel rules exist in `computePayload()` for fidelity if those fields are set later; Phase A leaves them at zero.

Electrical presets (`BATT_KG`, `SOLAR_KG`), axle check, DVLA plate lookup, and tyre tables are out of Phase A.

### Outputs

- Plain-English answer
- Assumptions (water 1 kg/L, gas full-bottle default, “remaining” vs MAM)
- Gaps (missing MAM / remaining, unknown bike kg, unknown tank litres)
- `usedKg` / `remainingKg` from `computePayload()`
- Deep-link to Payload with query keys where known

## Kill / honesty rules

- Unknown bike or e-bike kg → gap. Do not use Payload’s 14 kg pedal default.
- No remaining payload and no MAM → refuse. Do not invent plated weights.
- Full fresh tank with no litres → gap. Do not use the tool’s 90 L default.
- Tyres / PSI / bar / pressure → HOLD message only. Do not open a calculated pressure.
- Power (“will batteries last 3 days…”) and water-duration questions → unhandled; existing synonym router / capture. **Phase B Power, Phase C Water.**
- Campsite / route / trip planner → unmatched capture. Hard stop.

## Extension point

`assets/copilot.js` `DOMAINS`: `payload` (live), `tyres` (hold), `power` (Phase B stub), `water` (Phase C stub).

Parse is deterministic. `handleAsk(text, { llmParse })` may refine **slots only**; maths stay in `computePayload()`. No paid LLM API is wired. Leave it off.

## Flow

1. Co-pilot (`handleAsk`)
2. Synonym router (`routeAsk`) — Power, Water, bare Payload words, …
3. Unmatched `POST /api/ask`

Homepage Ask size / heading is unchanged. The answer card only appears after submit.
