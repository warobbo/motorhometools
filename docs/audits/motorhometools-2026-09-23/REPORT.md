# Website Audit Report — Motorhome Tools

**Date:** 23 September 2026 (Europe/London / BST)  
**Auditor:** Grok Bot (first proof run of Website Audit SOP)  
**SOP:** `/workspace/site-audit/WEBSITE-AUDIT-SOP.md`  
**Evidence:** `/workspace/site-audit/evidence/motorhometools-2026-09-23/`  
**Crawl / score exports:** `/workspace/site-audit/reports/motorhometools-2026-09-23/`

---

## Gate 0 — Scope

- **Main job:** Help motorhome owners calculate practical values (power, water, payload, tyres, and related) so they can plan safe, workable setups.
- **Live hostnames in play:**
  - https://www.motorhometools.co.uk/ and https://motorhometools.co.uk/ (hub; www 301s to apex)
  - https://www.motorhomepayload.co.uk/ and https://motorhomepayload.co.uk/ (Payload tool still live here; www 301s to apex)
  - https://www.motorhomepower.co.uk/ and https://motorhomepower.co.uk/ (should 301 into hub `/power/`)
  - https://www.motorhomewater.co.uk/ and https://motorhomewater.co.uk/ (should 301 into hub `/water/`)
- **Out of scope:** Private admin areas; submitting live Ask/contact forms that notify the site owner; inventing tyre pressures or legal advice; treating CrawlIQ as the client; full maths tables for every secondary sub-tool (battery/solar/inverter/wire/gas/tanks/cassette) beyond smoke checks noted below.

---

## 1. Executive summary

This proof audit followed Gates 0 → A → B → C → D → E → F in order. The **important user jobs work** on the pages tested: Water, Power (daily), Payload remaining-mass maths, Gas cooking defaults, and the Tyres bar↔PSI converter plus one Continental C-tyre lookup that matched the cited 2025 databook. Freddie domain redirects for Power and Water land on the hub tool URLs with **301** status. Hub ↔ Payload ↔ Tyres links respond **200**.

No **CRITICAL** or **HIGH** defects were found in the calculator cases and redirects that were actually tested. Remaining items are medium/low polish, automated a11y warnings on Payload, tooling gaps (Screaming Frog licence missing), and honesty about areas not fully exercised (mobile keyboard flows, full Ask form send, every Power/Water sub-tool table).

**Counts (this run):** CRITICAL **0** · HIGH **0** · MEDIUM **2** · LOW **3** · INFO several.

---

## 2. Findings by severity

### CRITICAL
None found in tested flows.

### HIGH
None found in tested flows.

### MEDIUM

1. **Payload — automated accessibility failures (Squirrel)**  
   - **URL:** https://motorhomepayload.co.uk/  
   - **What:** Squirrel Scan reported 5 failed checks including `a11y/aria-hidden-focus`, `a11y/aria-required-children`, `a11y/label-content-name-mismatch` (plus performance-related fails in the same report). Hub scored 0 failed.  
   - **User impact:** Possible keyboard / screen-reader friction on Payload; not proven as a total block in this desktop pass.  
   - **Evidence:** `reports/.../squirrel-payload.md`, `squirrel-payload.log`  
   - **Fix:** Resolve the specific ARIA/label mismatches Squirrel lists; re-test with keyboard only.

2. **Screaming Frog deep crawl not available on this machine**  
   - **What:** CLI refused to start: missing licence file at `~/.ScreamingFrogSEOSpider/licence.txt`.  
   - **Impact:** No SF CSV crawl of titles/status/canonicals from that tool. Mitigated with curl link sampling + Squirrel (25-page hub / 2-page payload) + manual SEO sample.  
   - **Evidence:** `reports/.../sf-crawl/sf-run.log`  
   - **Fix:** Install SF licence on the shared computer, then re-run Gate D crawl.

### LOW

1. **Ask form uses `novalidate` with constraint-looking fields** (Squirrel warning on hub `/ask/`). Not proven broken; form was **not submitted** (would notify owner).  
2. **No `llms.txt`** on hub or payload (404). Optional AI discoverability only.  
3. **Old-domain deep paths collapse to tool home** (e.g. `www.motorhomepower.co.uk/foo` → hub `/power/`). Fine for consolidation; path is not preserved.

### INFO

- Hub www → apex 301; Payload www → apex 301 (expected).  
- Power page includes a portrait “rotate gate” for phones (`#rotate-gate`); present in DOM.  
- GPTBot / ClaudeBot user-agents received **HTTP 200** for hub homepage in this check (no special block observed).  
- robots.txt on both hosts: `Allow: /` + sitemap; no per-bot disallow lines.  
- Lighthouse lab scores are strong (see §9); they do not override functional testing.

---

## 3. Product / tool accuracy tables

Desktop browser tests via Chrome DevTools Protocol against the live sites. Expected values calculated independently from the public formulas (or from the Continental Databook 2025 PDF for one tyre case). Storage cleared before “clean defaults” cases.

### 3.1 Water — https://motorhometools.co.uk/water/

Formula (from live `assets/calc.js`):  
`peopleUnits = adults + 0.7×children`; showers / drink use peopleUnits; cassette uses headcount; grey ≈ fresh − drink − cassette; 1 L ≈ 1 kg.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Defaults after clear storage: 2 adults, 0 children, 2 days, 0.5 showers/day × 6 L, wash 5, drink 2.5/person, cassette on 5×0.25 L | Fresh 18.5 L/day, 37 L trip, grey 11 L/day / 22 L trip, ~37 kg | 18.5 L/day, 37 L trip, 11 / 22, ~37 kg | 0 | **PASS** |
| 0 adults, 0 children, 2 days (wash-up still 5) | 5 L/day, 10 L trip, grey 5/10 | 5.0 / 10 / 5.0 / 10 | 0 | **PASS** |
| Family: 2A+2C, 7 days, 1 shower/day, normal 12 L shower | peopleUnits 3.4 → fresh 59.3 L/day, ~415 L trip, grey 45.8 / ~321 | 59.3 / 415 / 45.8 / 321 | Display rounds trip grey | **PASS** |
| 2 adults, cassette off | 16 L/day, 32 L trip, grey 11/22 | 16 / 32 / 11 / 22 | 0 | **PASS** |
| Trip days typed 0 (clamp to min 0.5) | Library clamps to 0.5 day → 9.25 L trip | Not re-typed in UI this run | — | Library behaviour noted; **UI clamp not separately screenshot-tested** |

Evidence: `gateA-results.json`, `gateA-results2.json`, `water-cleared-defaults.png`, `water-family-week.png`.

### 3.2 Power (Daily) — https://motorhometools.co.uk/power/

Wh = watts × hours × qty (if enabled); Ah12 = Wh/12; optional inverter loss default 12%.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Reset defaults (fridge 45×10, lights 8×4, pump 42×0.25, heater 18×4, phone 10×2×2, laptop 60×2, fan 24×3, TV 28×2, inverter-idle 8×8; Wave3 off) | 916.5 Wh; Ah12 ≈ 76.375 | 917 Wh; 76.4 Ah | ~0.5 Wh display round | **PASS** |
| Fridge only 100 W × 2 h × 1; loss off | 200 Wh; 16.7 Ah12; 8.3 Ah24 | 200 / 16.7 / 8.3 | 0 | **PASS** |
| Same + inverter loss on (12%) | 224 Wh; 18.7 Ah12 | 224 / 18.7 | 0 | **PASS** |
| Watts 999999 (with loss still on, 2 h) | Clamp to 20 000 W → 40 000 Wh load + 12% = 44 800 Wh | watts shown 20000; total 44,800 Wh | 0 | **PASS** |
| 100 W × 0 h | 0 | 0.0 | 0 | **PASS** |
| Blank watts × 5 h | 0 (fallback) | 0.0; watts field empty | 0 | **PASS** |

**Note:** A shared-browser profile previously showed fridge at 20 000 W / ~960 120 Wh until localStorage was cleared and “Reset to defaults” used. That is saved-device state, not a wrong default formula.

Battery / solar **library** smoke (same `PowerCalc`): 1000 Wh/day × 2 days × 1.1 / 0.8 usable → 2750 Wh / ~229 Ah12 — **PASS** in-library. UI battery page after clear showed ~917 Wh from Daily Power linkage → 210 Ah — consistent with defaults, not a separate full UI table. Inverter / wire pages **loaded** (titles OK); full INPUT tables **not** completed this run.

Evidence: `gateA-results2.json`, `power-clean-defaults.png`, `power-clamp-max.png`.

### 3.3 Payload — https://motorhomepayload.co.uk/

Remaining ≈ MAM − base(Mass in Service or weighbridge empty) − added loads. Mass in Service already assumes 75 kg driver; only driver kg above 75 is added unless using weighed-empty.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| MAM 3500, MIRO 3000, driver 75, all other additives 0 | 500 kg remaining | 500 kg; “Comfortable margin” | 0 | **PASS** |
| MAM 3500, MIRO 3400, +2 adults × 80 kg, fresh 100 L @ 100% | 3500 − 3400 − 160 − 100 = **−160 kg** | −160 kg; status-over “Over MAM” | 0 | **PASS** |
| MAM blank | Hold result; do not show 0 kg remaining | “—” / “MAM is not entered.” | — | **PASS** |
| MAM 0 | Reject non-positive | “—” / “MAM must be above 0 kg.” | — | **PASS** |
| MAM 99999 | Above 10 000 kg ceiling | “—” / above 10,000 kg message | — | **PASS** |

Evidence: `payload-mam3500-miro2900.png` (earlier case), `payload-over-mam.png`, `gateA-results2.json`.

### 3.4 Tyres — https://motorhomepayload.co.uk/tyres.html

**Bar ↔ PSI converter only (not a pressure recommendation):**

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| 0 bar | 0 PSI | 0 | 0 | **PASS** |
| 1 bar | 14.5 PSI | 14.5 | 0 | **PASS** |
| 2.5 bar | 36.3 PSI | 36.3 | 0 | **PASS** |
| 5.5 bar | 79.8 PSI | 79.8 | 0 | **PASS** |

**Cold pressure lookup (one case, manufacturer source named):**

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Sidewall 225/75R16C, LI 116, Continental/General C table, front axle 1600 kg, rear 1800 kg | From **Continental Tyre Databook 2025** van table for 225/75 R 16 C LI 116 S: 3.0 bar → 1730 kg/axle; 3.25 bar → 1845 kg/axle → front **3.0 bar**, rear **3.25 bar** | GREEN; Front 3.0 bar (43.5 PSI); Rear 3.25 bar (47.1 PSI) | 0 on bar steps | **PASS** (source: Conti PDF 2025, evidence `tyre-source/conti-2025.txt` ~line 3817) |

Other sizes / AMBER-only / refuse paths: **not fully matrix-tested** this run. Site correctly states it will not invent pressures outside tables.

Evidence: `tyres-sample-attempt.png`, `tyre-source/conti-2025.pdf`.

### 3.5 Gas — https://motorhometools.co.uk/water/gas.html/

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| 2 adults, 2 days, 2 meals/day, normal cook 0.04 kg/person/meal; heating/fridge/boiler off; 7 kg bottle | 0.16 kg/day; 0.32 kg trip; bottle days 7/0.16 = 43.75 → display ~44; 1 bottle | 0.16 / 0.32 / 44 days / 1 bottle | Round on bottle-days | **PASS** |

Tanks / cassette planners: pages **open (200)**; maths tables **not** filled this run → **untested**.

---

## 4. Forms

| Page | What checked | Result |
| --- | --- | --- |
| https://motorhometools.co.uk/ask/ | Fields present (question, optional email, honeypot website). Method GET to `/ask/`. | **Did not submit** — notes can reach the site owner. Stopped before send. |
| Tyres missing-size capture form | Present; optional email. | **Did not submit**. |
| Calculator UIs | Local-only inputs; no spammy POST observed in tested flows. | OK for testing |

---

## 5. Mobile / visual

- Desktop screenshots saved for hub, water, power, payload, tyres, ask.  
- Mobile viewport **390×844** checked for hub, power, payload: **no horizontal overflow** (`scrollWidth === clientWidth`).  
- Power exposes `#rotate-gate` (“Turn your phone upright”) — portrait preference; not fully interacted in landscape.  
- No obvious clipped primary CTAs on the desktop screenshots reviewed.  
- Deep visual QA of every sub-tool on small phones: **partial only**.

Evidence: `hub-mobile-390.png`, `power-mobile-390.png`, `payload-mobile-390.png`, plus desktop PNGs in the evidence folder.

---

## 6. Accessibility (practical)

- Hub Squirrel: **0 failed**, warnings include enterkeyhint / novalidate on Ask.  
- Payload Squirrel: **5 failed** ARIA/label issues — flagged MEDIUM above; not manually keyboard-walked end-to-end this run.  
- Labels present on main calculator fields inspected.  
- Full keyboard-only audit: **not completed**.

---

## 7. Console / network errors actually seen

- CDP test run recorded **0** pageerrors / console errors in the Gate A session log.  
- Sampled in-scope links (hub, power, water, payload, tyres, guides, legal): **HTTP 200** final status (see Gate B CSV).  
- No systematic DevTools network HAR capture beyond curl status checks.

---

## 8. SEO + AI crawl findings

### robots / sitemap / AI
| Check | Hub | Payload |
| --- | --- | --- |
| robots.txt | Allow all; Sitemap listed | Allow all; Sitemap listed |
| sitemap.xml | 200; URLs present | 200; home + tyres |
| llms.txt | **404** | **404** |
| GPTBot / ClaudeBot GET homepage | **200** (no block observed) | not separately bot-checked |

### Sample titles / H1 / canonicals (live curl)

| URL | Title | H1 | Canonical |
| --- | --- | --- | --- |
| / | Motorhome Tools \| Stop guessing your van’s limits | Stop guessing your van’s limits | https://motorhometools.co.uk/ |
| /power/ | Campervan daily power calculator \| Wh & Ah, 12V/24V | Daily power consumption calculator | https://motorhometools.co.uk/power/ |
| /water/ | Motorhome water calculator \| litres per day & trip | Fresh water usage calculator | https://motorhometools.co.uk/water/ |
| /ask/ | Ask in plain English \| Motorhome Tools | Not sure? Ask in plain English | https://motorhometools.co.uk/ask/ |
| payload / | Motorhome Payload Calculator \| Weighbridge & Axle Check | Motorhome Payload Calculator | https://motorhomepayload.co.uk/ |
| tyres.html | Motorhome Tyre Pressure \| LT and changed wheels | Motorhome Tyre Pressure | https://motorhomepayload.co.uk/tyres.html |

Schema (`ld+json`) present on sampled pages (FAQ / WebApplication style). `index,follow` robots meta present.

### Screaming Frog
**Did not run** — no licence file. Log: `sf-crawl/sf-run.log`.

### Squirrel Scan
| Target | Health | Notes |
| --- | --- | --- |
| https://motorhometools.co.uk/ | **86/100 (B)** · 25 pages (cap) · 0 failed | Agents/crawlability strong; perf warnings |
| https://motorhomepayload.co.uk/ | **51/100 (F)** · 2 pages · **5 failed** | Mostly a11y + perf/cache style issues |

Reports: `squirrel-hub.md`, `squirrel-payload.md`.

---

## 9. Score-tool results (named source)

**Source:** Google Lighthouse CLI 13.5.0 via headless Chrome (lab, single run, not field data).

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| https://motorhometools.co.uk/ | 99 | 100 | 100 | 100 |
| https://motorhometools.co.uk/power/ | 100 | 96 | 100 | 100 |
| https://motorhomepayload.co.uk/ | 88 | 97 | 100 | 100 |

HTML/JSON: `lh-hub.report.*`, `lh-power.report.*`, `lh-payload.report.*`.  
Tyres page Lighthouse: **unmeasured** this run.  
PageSpeed Insights / field CrUX: **unmeasured**.

---

## 10. What was successfully tested

- Gate 0 scope written first.  
- Water calculator multi-case maths vs independent formula.  
- Power daily calculator multi-case maths, clamp, blank/zero.  
- Payload remaining / over-MAM / blank / over-max plate.  
- Tyres converter + one Conti-sourced pressure case.  
- Gas default cooking maths.  
- Power/Water/Battery/Solar/Inverter/Wire and Water Gas/Tanks/Cassette **page load**.  
- Hub ↔ Payload ↔ Tyres ↔ Power ↔ Water link sampling (58 URLs, all 200).  
- Freddie redirects: motorhomepower → `/power/`, motorhomewater → `/water/` with **301**.  
- robots, sitemaps, SEO sample, Squirrel, Lighthouse on 3 URLs.  
- Desktop + limited mobile viewport screenshots.

---

## 11. What could not be tested (and why)

- **Screaming Frog crawl** — missing licence on shared computer.  
- **Ask / tyres capture form submit** — would email or notify a real person; stopped before send.  
- **Full matrices** for battery/solar/inverter/wiring UI, tanks, cassette, bottles, hot water, winterising — time; only load + partial library smoke.  
- **Every tyre size / AMBER / refuse path** — only one GREEN Conti C case + converter.  
- **Full keyboard-only and screen-reader pass** — not done; Squirrel flags only.  
- **Landscape mobile + rotate-gate dismiss behaviour** — not fully exercised.  
- **CrawlIQ** — optional; not run.  
- **Independent invent of other tyre pressures** — refused by SOP; Conti PDF used only for the one matched size.

---

## 12. Recommended fix order

1. Fix Payload Squirrel **ARIA / label** failures (MEDIUM) and re-test keyboard focus.  
2. Install Screaming Frog licence and re-run Gate D crawl for a full internal status/title/canonical export.  
3. Optional: add `llms.txt`; review Ask `novalidate` behaviour; consider preserving or documenting old-domain path collapse.  
4. No calculator maths hotfixes required from the cases that **PASS** above.

---

## 13. Re-test log (Gate F)

No production fixes were applied in this proof run. After any future fix, re-test at least:

| ID | After fix, re-test | Evidence needed |
| --- | --- | --- |
| R1 | Payload ARIA/label issues | Keyboard tab through calculator; new Squirrel run = 0 fail |
| R2 | SF crawl once licensed | CSV exports in reports folder |
| R3 | Any maths change on Water/Power/Payload/Tyres | New INPUT\|EXPECTED\|ACTUAL tables |
| R4 | Any redirect change on power/water domains | curl `-D - --max-redirs 0` first hop 301 + final URL |
| R5 | If Ask validation changes | Validate client-side without sending owner mail |

---

## Gate B — Redirects & links (detail)

| Start URL | First hop | Final |
| --- | --- | --- |
| https://www.motorhomepower.co.uk/ | **301** → https://motorhomepower.co.uk/ | **200** https://motorhometools.co.uk/power/ |
| https://motorhomepower.co.uk/ | **301** → https://motorhometools.co.uk/power/ | **200** same |
| https://www.motorhomewater.co.uk/ | **301** → https://motorhomewater.co.uk/ | **200** https://motorhometools.co.uk/water/ |
| https://motorhomewater.co.uk/ | **301** → https://motorhometools.co.uk/water/ | **200** same |
| https://www.motorhomepayload.co.uk/ | **301** → apex | **200** https://motorhomepayload.co.uk/ |
| https://motorhomepayload.co.uk/ | — | **200** (Payload still live) |
| Hub → https://motorhomepayload.co.uk/ | — | **200** |
| Payload → hub `/`, `/power/`, `/water/`, tyres | — | **200** |

CSV: `evidence/.../gateB-links.csv`, `gateB-sampled-links.csv`.

---

## Process proof notes

What this SOP forced us to catch that a **crawl-only** pass would miss:

1. **Calculator truth, not just HTTP 200** — Water/Power/Payload tables with independent EXPECTED values; crawl scores cannot see that 100 W × 2 h must equal 200 Wh or that over-MAM shows −160 kg.  
2. **Saved localStorage can look like a “broken default”** — Power showed absurd Wh until storage was cleared; a crawl would still call the URL healthy.  
3. **Tyre safety numbers need a named source** — one Conti Databook row was checked; the SOP barred inventing the rest.  
4. **Freddie redirects verified as real 301 + final hub paths** — not assumed from DNS or marketing copy.  
5. **Ask form deliberately not sent** — crawl tools cannot encode that restraint.

**SOP gaps found in this proof run:**

- No explicit instruction for **shared-browser localStorage pollution** (clear storage before “defaults” cases). Worth adding.  
- Screaming Frog is mandated but **licence may be absent** — SOP should allow documenting “tool unavailable” and a curl/Squirrel substitute (as done).  
- Secondary tools (gas/tanks/battery/…) need a clearer “minimum smoke vs full table” rule when time-boxed.  
- Mobile: SOP asks desktop and mobile; we did viewport screenshots but not full interactive mobile Gate A repeats.

---

*End of proof audit report. Invent nothing; untested areas marked above.*
