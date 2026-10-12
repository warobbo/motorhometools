---
name: verify-motorhometools
description: Drive motorhometools.co.uk the way a visitor does — launch the Node server, open pages, and prove Power and Water calculator results. Use when changing pages, tools, calculators, Ask, or the server, or when a reviewer must verify the site.
---

# Verify Motorhome Tools

This skill drives the Motorhome Tools site (https://motorhometools.co.uk/) locally. The surface is a phone-first website plus `POST /api/ask` in the same Node process. Payload and Tyres are a different site (https://motorhomepayload.co.uk/), recorded only as an external reference.

The feature map is `.cursor/skills/verify-motorhometools/features/README.md`. Whenever a build changes pages or tools, update that map in the same PR. A weekly maintain pass runs on Mondays, from Freddie the Font2's routine. That pass edits only this verify folder, opens at most one PR through the review loop, and stays quiet unless blocked.

Do not print secrets. Do not commit `.env`. Do not put `ASK_NOTIFY_EMAIL` or any API key in the skill, the logs you quote, or the proof.

## Launch

From the repo root. Node must be 22 (`>=22 <23`, see `.node-version`).

```bash
npm install
npm test
npm run build
```

`npm test` checks router, calculator, Ask and server modules. It does not open a browser. `npm run build` writes minified JS to `dist/`. When `dist/` exists, `node server.js` serves those files at the same URLs as the source. That is what a visitor gets in production.

Pick a `RUN_ID` and a free `PORT` (4173 is the default). Two runs need two ports. They must not share `ASK_LOG_PATH`.

```bash
RUN_ID=verify-$(date +%s)
mkdir -p /tmp/motorhometools-verify-run/$RUN_ID /tmp/motorhometools-verify-evidence/$RUN_ID
PORT=4173 \
ASK_LOG_PATH=/tmp/motorhometools-verify-run/$RUN_ID/asks.jsonl \
  node server.js > /tmp/motorhometools-verify-run/$RUN_ID/server.log 2>&1 &
echo $! > /tmp/motorhometools-verify-run/$RUN_ID/server.pid
```

Leave `NODE_ENV` unset so startup does not rebuild `dist/`, and so Ask can also be read from `ASK_LOG_PATH`. Leave `ASK_NOTIFY_EMAIL` unset.

Ready when the log contains `Motorhome Tools ready` and `http://127.0.0.1:4173/` returns 200. The process listens on `0.0.0.0:$PORT`.

Shut this instance down with Cleanup. Do not start a second server on the same port.

On Render, the live site and Ask are one Node web service. The README calls that service `motorhometools-ask`. `render.yaml` names the blueprint service `motorhometools`. There is no second local process to launch.

## Doctor

One read-only check. Run it before the first drive, and again after a drive fails.

```bash
./.cursor/skills/verify-motorhometools/scripts/doctor.js \
  --base http://127.0.0.1:4173 \
  --pid-file /tmp/motorhometools-verify-run/$RUN_ID/server.pid \
  --log /tmp/motorhometools-verify-run/$RUN_ID/server.log \
  --pages
```

Worth driving when all of these are true:

- The pid file’s process is alive and its command line contains `server.js`.
- The log contains `Motorhome Tools ready`.
- `GET /` is 200, the body contains `Stop guessing your van`, and `X-Content-Type-Options` is `nosniff`.
- `GET /api/ask` is JSON `{ "ok": true, "capture": true }`. Doctor prints whether a mailto address is set. It does not print the address.
- `GET /.cursor/skills/verify-motorhometools/SKILL.md`, `GET /.gitignore` and `GET /.git/config` are 404. Doctor prints the status only, never the body. Any other dotfile or dot-folder is the same rule.
- With `--pages`, every route in `scripts/routes.js` is 200 and contains its expected snippet, and `/power` and `/water` (no slash) are 301 to the slashed paths.

Doctor does not click a calculator. A passing doctor is not proof of a result.

## Drive

Install the browser helper once, inside the skill directory. It uses system Chrome (`CHROME_PATH`, or `/usr/bin/google-chrome`). It does not download a browser.

```bash
cd .cursor/skills/verify-motorhometools
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
cd ../../..
```

Then, from the repo root:

```bash
./.cursor/skills/verify-motorhometools/scripts/drive.js \
  --base http://127.0.0.1:4173 \
  --evidence /tmp/motorhometools-verify-evidence/$RUN_ID \
  --log /tmp/motorhometools-verify-run/$RUN_ID/server.log
```

The script launches headless Chrome and drives the real pages. Each calculator starts in a fresh context (empty `localStorage`) unless the recipe needs the previous page’s saved profile. Selectors are ids and data attributes: `#total-wh`, `#ask-question`, `#inverter-loss`, `button[data-preset="custom"]`, `button[data-shower="normal"]`.

Viewports:

- Desktop checks use 1280×900.
- Phone portrait is 390×844. The home Payload card fits that width, and `/power/` still shows the Wh total. `#rotate-gate` stays `aria-hidden="true"` and `display: none`.
- Phone landscape is 844×390. `/power/` shows “Turn your phone upright”, `#rotate-gate` is `aria-hidden="false"`, and `main` is inert. That is the gate working, not a broken calculator. Drive calculators in portrait.

The script covers Daily Power (default, fridge-only, 12% loss, hours clamped at 24), Battery from that fridge profile and from a fresh default, Solar in both of those states, Inverter, Wire (inverter feed and the 20 A custom run), Water (default and an edited shower), Gas (default and one heavy meal), Tanks, Cassette, Ask (“solar” link, then an unmatched note), and the mobile widths above.

Worked results and the formula behind each EXPECTED value are in the feature files. Assert the visible en-GB text. Examples the script checks:

- Daily Power default: `#total-wh` `917` (916.5 Wh rounded), `#total-ah12` `76.4`, `#total-ah24` `38.2`.
- Fridge only, 45 W × 10 h: `450`, `37.5`, `18.8`. With 12% inverter loss: `504`, `42`, `21`.
- Hours typed as 30 on that fridge clamp to 24: `1,080` Wh.
- Water edited to a normal 12 L shower, once a day, cassette off: `68` L for the trip.
- Gas default: `0.32` kg for the trip, `44` bottle days (43.75 rounded). One heavy meal: `0.14` kg/day, `50` days.

A matched Ask stays on the page and shows a link. It does not navigate and it does not POST. An unmatched question posts to `/api/ask` and the server log gains a `[ask]` line. The script uses `best campsite near York` with the email left empty.

Static pages (guides, about, legal, coming soon) are loaded by doctor `--pages`. Their feature files say what the H1 should be. Coming-soon pages must say `Coming soon` and must not show a calculated figure.

## Evidence

Proof is the visitor path: a headless Chrome context loading the page, typing or clicking, and reading the result elements. It is not `npm test` and not a direct call to `calcTotals`.

The drive writes under `/tmp/motorhometools-verify-evidence/$RUN_ID/`:

- `results.json` — every check’s name, actual text, expected text, and pass bit.
- Screenshots named in the feature files (`power-daily-fridge-loss.png`, `water-edited.png`, `home-mobile-390.png`, and the others the script saves).

Ask’s side effect is the `[ask]` line in the server log (and the JSONL file at `ASK_LOG_PATH`). The script checks the log contains `best campsite near York`. A matched “solar” question must not be required to appear there.

Cleanup must leave this directory in place. If a screenshot and `results.json` disagree, trust a fresh drive, then fix the skill.

## Cleanup

Stop only the pid this run wrote. Do not kill by process name.

```bash
kill "$(cat /tmp/motorhometools-verify-run/$RUN_ID/server.pid)"
rm -rf /tmp/motorhometools-verify-run/$RUN_ID
test -f /tmp/motorhometools-verify-evidence/$RUN_ID/results.json
```

The `test` must succeed. Scratch (pid, server log, Ask JSONL) goes away. Evidence stays in `/tmp/motorhometools-verify-evidence/$RUN_ID/`.

If a drive fails halfway, run Cleanup for that attempt’s server before starting another one on the same port. Keep any evidence already written.

## Helpers

Both helpers are executable and use `#!/usr/bin/env node`. Run them from the repo root.

Doctor (read-only health, and with `--pages` every public URL):

```bash
./.cursor/skills/verify-motorhometools/scripts/doctor.js \
  --base http://127.0.0.1:4173 \
  --pid-file /tmp/motorhometools-verify-run/$RUN_ID/server.pid \
  --log /tmp/motorhometools-verify-run/$RUN_ID/server.log \
  --pages
```

Drive (Chrome, calculators, Ask, mobile widths):

```bash
./.cursor/skills/verify-motorhometools/scripts/drive.js \
  --base http://127.0.0.1:4173 \
  --evidence /tmp/motorhometools-verify-evidence/$RUN_ID \
  --log /tmp/motorhometools-verify-run/$RUN_ID/server.log
```

`scripts/routes.js` is the page list doctor reads. It is not a separate command. When a page is added or removed, update `routes.js` and `features/README.md` together.

## Failure modes

- **Port in use.** `node server.js` exits at once. Pick another `PORT` and pass the same origin to doctor and drive. Do not kill a process you did not start.
- **Totals stuck on `0`.** The calculator script did not run. Check the browser network log for a 404 on `power/assets/*.js` or `water/assets/*.js`, and confirm `npm run build` finished if `dist/` is present.
- **`dist/` is stale.** Tests load the readable source. The browser loads `dist/` when those files exist. Rebuild after a formula change or the page will not match the feature map.
- **Saved profile.** Power tools share `localStorage` key `powertools.systemProfile`. Water, Gas, Tanks and Cassette share `watertools.systemProfile`. A leftover profile changes “default” numbers. The drive uses a fresh context per default case.
- **Rotate gate.** A short landscape viewport (height ≤ 540px, width ≤ 1000px) blocks the form. Use 390×844 to use the calculator. Use 844×390 only to prove the gate.
- **Ask rate limit.** 10 unmatched posts in 10 minutes per client return 429. If `#ask-website` has a value, the page shows `We’ve noted your question.` and does not POST. A direct `POST /api/ask` with `website` set returns `{ "ok": true, "ignored": true }`. Neither path writes an `[ask]` line. Leave the field empty.
- **Ask log.** With `NODE_ENV=production` and no `ASK_LOG_PATH`, notes go to stdout only. Point `ASK_LOG_PATH` at the run’s scratch file.
- **Cache.** CSS and JS are cached as immutable and the HTML uses a `?v=` query. A local fresh context avoids an old cached script. After a real deploy, bump `?v=` or the live site keeps the previous file.
- **Payload and Tyres.** This server does not host those calculators. Ask may show a labelled rough payload estimate; do not score it as the other site. Follow the external feature file and stop.

## Feature map

Read `features/README.md`, then the feature file for the page you are changing. Calculator files carry an INPUT / EXPECTED / ACTUAL table. EXPECTED is derived from the code cited in that file. After a drive, write ACTUAL from `results.json`. If you did not drive a row, leave it `NOT RUN`. Do not invent a result.
