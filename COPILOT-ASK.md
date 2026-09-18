# Co-pilot Ask (Phase A — Payload-first)

Wayne lock, 18 Sep 2026: natural-language Ask may call **only** existing calculator maths. Answer first, labelled assumptions second. Never invent plated MAM / MIRO, tyre pressures, or legal limits. Tyres is HOLD. No homepage Ask resize. No campsite / trip planner.

This hub still talks to Payload as a signpost (`https://motorhomepayload.co.uk/`). Phase A adds a Payload-first answer **before** the synonym router, using the sibling maths — not guessed formulas.

## How this hub talks to Payload today

| Path | What happens |
| --- | --- |
| Home / Ask tiles | New tab to `motorhomepayload.co.uk` |
| Synonym router | Weight words (MAM, MIRO, axle, weighbridge…) open Payload |
| Co-pilot (this phase) | Multi-factor NL → intent schema → `computePayload()` → **rough answer first**, then assumptions + calculator CTA (query-string prefill) |
| Unmatched Ask | `POST /api/ask` JSONL / stdout — no invented answer |

The live Payload page does **not** yet read query-string prefill (only Tyres uses `?front=` / `?rear=`). Ask still appends Payload field keys (`freshCap`, `gas6`, `bikes`, `bikeKg`, `rackKg`, …) so a later sibling change can apply them. The CTA says Ask is a quick guide; Payload is where you enter accurate data.

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
- Full fresh tank with no litres → gap. Do not use the tool’s 90 L default.
- Tyres / PSI / bar / pressure → HOLD message only. Do not open a calculated pressure.
- Power (“will batteries last 3 days…”) and water-duration questions → unhandled; existing synonym router / capture. **Phase B Power, Phase C Water** — same CTA pattern when those answers land.
- Campsite / route / trip planner → unmatched capture. Hard stop.

Tone: guidance / solutions. Gaps are secondary notes, not the headline. Strong pink/red styling is for true unknowns with no standard, or Tyres HOLD — not for labelled bike / water / gas assumptions.

## Extension point

`assets/copilot.js` `DOMAINS`: `payload` (live), `tyres` (hold), `power` (Phase B stub), `water` (Phase C stub).

Parse is deterministic. `handleAsk(text, { llmParse })` may refine **slots only**; maths stay in `computePayload()`. No paid LLM API is wired. Leave it off.

## Flow

1. Co-pilot (`handleAsk`)
2. Synonym router (`routeAsk`) — Power, Water, bare Payload words, …
3. Unmatched `POST /api/ask`

Homepage Ask size / heading is unchanged. The answer card only appears after submit.
