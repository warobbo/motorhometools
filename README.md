# Motorhome Tools

Phone-first front door for the UK leisure hubs. Home hero: **Stop guessing your van’s limits.**

Payload and Tyres stay on motorhomepayload.co.uk. Power and Water calculators are same-origin pages on this site. This is not a campsite planner and not a route engine.

| Tile | Goes to |
| --- | --- |
| Payload | [motorhomepayload.co.uk](https://motorhomepayload.co.uk/) (new tab) |
| Tyres | [motorhomepayload.co.uk/tyres.html](https://motorhomepayload.co.uk/tyres.html) |
| Power | [/power/](https://motorhometools.co.uk/power/) — Daily Power, Battery, Solar, Inverter, Wire (same origin) |
| Water | [/water/](https://motorhometools.co.uk/water/) — gas, tanks and cassette live here too (same origin) |
| Guides | [motorhometools.co.uk/guides/](https://motorhometools.co.uk/guides/) — Payload, Power and Water articles |
| Ask | [motorhometools.co.uk/ask/](https://motorhometools.co.uk/ask/) — same Ask box, bookmarkable |
| Route | Coming soon (no fake maps) |

The Ask box routes **topic synonym lists** per hub, seeded from the live hub default lists (Power `STARTER` + inverter-load appliances, mhwater gas/water/tanks/cassette defaults, Payload weight terms) — not a guessed short list. See **[ASK-SYNONYMS.md](ASK-SYNONYMS.md)**: Font owns coverage permanently; when a hub adds a starter item, update Ask in the same change. Toilet, loo and porta potty go to Cassette. Electrical starter words (fridge, kettle, oven, microwave, radio, stereo, bluetooth, speaker, charger, diesel heater, MaxxFan…) open Power — daily power by default, or Battery / Solar / Inverter / Wire when the query names that tool. Bare fridge / freezer / coolbox / oven go to Power; gas fridge, absorption fridge, 3-way fridge, BBQ / barbecue / grill, Calor and camping gaz go to Gas. Induction / hob stay Power. Axle / axles / weighbridge / MAM / MIRO stay on Payload. Tyre pressure / psi / bar stay on Tyres. Fresh / grey / waste water and shower go to Water.

**Process:** hub defaults are the floor. Layer 2 is free UK search / People-also-ask phrasing (no paid Keyword Planner). Seen twice in Ask logs → add a synonym in `assets/router.js`. Wayne must not discover misses by typing. Ask opens a page; it never invents a pressure, weight or legal number.

**Co-pilot (Phase A + Phase Gas + Phase Cassette + Wave 3):** multi-factor **Payload** questions (remaining kg + water / gas / bikes) are parsed, then answered from the Payload calculator maths — **result first**, then labelled assumptions (bike 14 kg, rack 12 kg, water 1 kg/L, gas full-bottle) and a Payload CTA. **Gas BBQ / bottle-days** questions get a cooking-line estimate from the Gas calculator (heavy 0.07 kg per person-unit per meal for BBQ; default 7 kg butane) and a prefilled Gas CTA. **Cassette empties / 2nd cassette** get flush-litre empty-days from Cassette defaults. **Portable air-con / Wave 3** uses EcoFlow UK rated cooling **640 W DC** × named hours only (never invent 4 h / 8 h) and a prefilled Power CTA — still in Ask, no auto-navigate. Tyres questions get a HOLD / caution message only. Other Power and Water stay later stubs (Phases B and C). See **[COPILOT-ASK.md](COPILOT-ASK.md)**.

If nothing matches, the question (and optional email) is passed to the site owner via `POST /api/ask`. It does **not** invent tyre pressures, weights or legal advice. Replies are not automated.

**Guides** on the home page links to Payload, Power and Water articles. **Route** stays a coming-soon placeholder — not a route engine, and it does not link out. Tyres guides stay parked (TRA).

## Run locally

Tiny Node static server (same shape as [motorhome-payload-calculator](https://github.com/warobbo/motorhome-payload-calculator)).

```bash
npm start
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Folders such as `/guides/` and `/ask/` serve `index.html` (same as the old static site).

`npm run build` writes minified client JavaScript to `dist/`. After that, `npm start` serves those files. Without `dist/`, it serves the readable source. On Render, `NODE_ENV=production` builds `dist/` at startup as well.

Keyword checks and Ask capture:

```bash
npm test
```

### Check Ask capture with curl

```bash
curl -s -X POST http://127.0.0.1:4173/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"best campsite near York","email":"visitor@example.com"}'
```

You should see `{"ok":true,"saved":true,...}` and a stdout line starting `[ask]` with JSON that includes the question, optional email and timestamp.

Optional local env (copy `.env.example` to `.env` — do not commit addresses):

| Variable | What it does |
| --- | --- |
| `ASK_NOTIFY_EMAIL` | Public contact used only for the **Email this instead** mailto fallback if the POST fails |
| `ASK_LOG_PATH` | JSONL file path if you attach a Render disk. Leave blank on Render — the disk is ephemeral, so stdout / Render logs are the store |

Locally (not production) the handler also appends `data/asks.jsonl` (gitignored).

## Deploy on Render (Node web service)

This is no longer a static-only site. `/api/ask` has to run in a Node process, same idea as Payload’s `POST /api/missing-size`.

**Render cannot change an existing Static Site to a Node web service.** After this branch is merged to `main`, Wayne needs a **new Web Service** (or a replacement service) pointed at the same repo, then move `motorhometools.co.uk` onto it.

### Click steps after merge

1. Merge this PR to `main`. Do not expect the current Static Site to start logging Asks — it has no Node process.
2. In Render: **New → Web Service**.
3. Connect `warobbo/motorhometools`, branch `main`.
4. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance:** a **paid** web service (Starter or above). Free web services cannot keep a custom domain.
5. Environment (Dashboard → the new web service → **Environment**):
   - `NODE_VERSION=22`
   - `NODE_ENV=production`
   - `ASK_NOTIFY_EMAIL` = Wayne’s contact address (optional; mailto fallback only — no paid email API)
   - Leave `ASK_LOG_PATH` blank unless a disk is attached
6. Deploy. Confirm `https://<new-service>.onrender.com/` loads and:

   ```bash
   curl -s -X POST https://<new-service>.onrender.com/api/ask \
     -H 'Content-Type: application/json' \
     -d '{"question":"best campsite near York","email":"visitor@example.com"}'
   ```

7. Keep **motorhometools.co.uk** on the same custom domain:
   - New service → **Custom Domains** → add `motorhometools.co.uk` and `www.motorhometools.co.uk`
   - Remove those domains from the old Static Site so TLS can move
   - DNS can stay as it is (A `@` → `216.24.57.1`, CNAME `www` → the Render host). If the new service’s `*.onrender.com` host differs, update the `www` CNAME to that host.
8. When the domain is live on the Node service, suspend or delete the old Static Site so you are not paying for two copies.

`render.yaml` describes the same Node web service. A Blueprint apply will **not** convert the existing static service in place (`runtime` is immutable).

### How Wayne sees Asks

1. Render Dashboard → the **Node** web service → **Logs**.
2. Filter for `[ask]`.
3. Each unmatched submission is one JSON line: `type`, `receivedAt`, `question`, optional `email`, `href`, `source`.
4. If `ASK_NOTIFY_EMAIL` is set and the browser POST fails, the visitor may see **Email this instead** (a `mailto:` link). That is not an automated reply. Nothing invents a pressure, a weight or legal advice.

Host logs rotate. There is no paid inbox and no Formspree. For a durable file, attach a Render disk and set `ASK_LOG_PATH`.

### Point motorhometools.co.uk at Render

In the domain registrar DNS (unchanged pattern):

| Type | Name | Value |
| --- | --- | --- |
| **A** | `@` | `216.24.57.1` |
| **CNAME** | `www` | the new web service `*.onrender.com` host |

Then in Render → the **Node** web service → **Custom Domains** add `motorhometools.co.uk` and `www.motorhometools.co.uk`. Render issues TLS.

`robots.txt` and `sitemap.xml` already point at `https://motorhometools.co.uk/`. Privacy, cookies and disclaimer pages live at `privacy.html`, `cookies.html` and `disclaimer.html`.

## Ask box notes (no invented advice)

1. Keywords open the matching hub in the browser. Those matched asks are **not** posted.
2. Unmatched questions `POST` JSON to `/api/ask`. On success the visitor sees that the note reached the site owner, and that replies are not automated.
3. If the POST fails, a copy may stay on the visitor’s phone (`localStorage` key `motorhometools.unansweredAsks`). The page does **not** pretend a human already has it.
4. Optional email is stored with the question only if the visitor types one. We will not email a pressure, a weight or legal advice.
5. Honeypot field `website` is ignored (no log line).
6. Rate limit: 10 posts / 10 minutes per client.

## Guides (Wave 1 Payload + Wave 2 Power / Water)

Static HTML under `guides/`. Copy locked from Wayne’s drafts; polished for UK search, not invented safety numbers. No campsite finder or venue directory.

| Page | Slug |
| --- | --- |
| Index | `/guides/` |
| Weighbridge how-to | `/guides/weighbridge-how-to.html` |
| Axle weights | `/guides/axle-weights-explained.html` |
| Where you put it (rear axle) | `/guides/where-you-put-it.html` |
| MAM / Mass in Service / payload | `/guides/mam-mass-in-service-payload.html` |
| Daily power budget | `/guides/daily-power-budget.html` |
| Leisure battery size | `/guides/battery-size-plain-english.html` |
| Solar panel sizing | `/guides/solar-reality-check.html` |
| Fresh and waste tanks | `/guides/fresh-waste-tanks.html` |
| Gas / LPG bottles and safety | `/guides/gas-lpg-basics.html` |
| When and where to empty a cassette toilet | `/guides/cassette-toilet-empty.html` |

Each page has a unique title, meta description, one H1, canonical, and Open Graph basics. Payload and Tyres still open in a new tab. Power and Water are same-origin pages: Daily Power, Battery, Solar, Inverter and Wire under [/power/](https://motorhometools.co.uk/power/); Water, Gas, Tanks and Cassette under [/water/](https://motorhometools.co.uk/water/). Tyres guides stay parked (TRA). Hook-up vs off-grid is a later Power wave.

Cache-bust assets by bumping the `?v=` query in the HTML (see the `ASSET_VERSION` comment). Static files are cached for a year as `immutable`, so a changed CSS, JS, image or icon is invisible until that query changes.

## Security headers

`server.js` sets these on every response (HTML, assets, redirects, 404s, and `/api/ask`). Render is the origin. Cloudflare proxies the response and does not add this pack itself. There is no `_headers` file.

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — no `preload` (the site is not on the HSTS preload list)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN` — classic clickjacking header for older scanners (Screaming Frog). CSP `frame-ancestors 'self'` stays in place.
- `Content-Security-Policy` with `frame-ancestors 'self'`
- `Permissions-Policy` disables camera, microphone, geolocation, payment, USB and motion/light sensors for every origin, including this one. Ask, forms and normal browsing do not use those features.

Scripts, stylesheets, images and fonts are same-origin files. The font stack is system UI, not Google Fonts. Ask uses `fetch` to `/api/ask`. The policy is `script-src 'self'` and `connect-src 'self'`. `style-src-attr 'unsafe-inline'` is there because calculator breakdown bars set a width with a `style` attribute. Script sources do not allow `unsafe-inline`.

After a production deploy:

```bash
curl -sI https://motorhometools.co.uk/
```

The homepage source should include `WebSite` and `Organization` JSON-LD. `/power/` and `/water/` should still load their calculator scripts.

If Cloudflare Rocket Loader, Email Obfuscation, or Web Analytics is turned on later, those injected scripts will be blocked until the policy lists them.

## Caching

`server.js` sets `Cache-Control` on this Node process. Render is the origin (`motorhometools-ask`). Do not rely on a Cloudflare cache rule for this.

| Response | `Cache-Control` |
| --- | --- |
| CSS, JavaScript, images, icons, fonts, SVG | `public, max-age=31536000, immutable` |
| HTML | `no-cache`, with an `ETag` so the browser revalidates |
| `robots.txt`, `sitemap.xml` | `public, max-age=300` |

The `?v=` query is the cache buster. The server strips it before reading the file. Browsers cache the full URL, so immutable and `?v=` work together. HTML is not given a year-long cache.

## Minified JavaScript

Browser scripts in `assets/`, `power/assets/` and `water/assets/` are minified with esbuild into `dist/` (no source maps, not bundled). Tests keep requiring the readable source. When `dist/` exists, the server serves those files at the same URLs the HTML already uses (`assets/copilot.js?v=…` and the calculator scripts).

```bash
npm run build
```

Render build command: `npm install && npm run build`, then `npm start`. `NODE_ENV=production` also runs that minify step when `node server.js` starts, so a service whose dashboard build command is still only `npm install` still ships minified JavaScript. esbuild is a normal dependency because Render sets `NODE_ENV=production` during install and would skip a devDependency.

## Out of scope

Campsite planner, routing engine, Money tile, Mission Control, inventing pressures, and spending on APIs.

## Disclaimer

We open the right page or pass the question to the site owner. We don’t invent tyre pressures, weights or legal advice.
