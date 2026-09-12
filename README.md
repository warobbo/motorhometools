# Motorhome Tools

Phone-first front door for the UK leisure hubs. Home hero: **Stop guessing your van’s limits.**

This is a **signpost**, not a campsite planner, not a route engine, and not another calculator.

| Tile | Goes to |
| --- | --- |
| Payload | [motorhomepayload.co.uk](https://motorhomepayload.co.uk/) |
| Tyres | [motorhomepayload.co.uk/tyres.html](https://motorhomepayload.co.uk/tyres.html) |
| Power | [motorhomepower.co.uk](https://motorhomepower.co.uk/) |
| Water | [motorhomewater.co.uk](https://motorhomewater.co.uk/) — gas, tanks and cassette are tabs on that hub |

The Ask box routes a few keywords (payload, tyres, power, water / gas / tanks / cassette). Toilet, loo and porta potty go to Cassette. If nothing matches it says **We’ve noted your question** and stores it. It does **not** invent tyre pressures, weights or legal advice.

**Guides** and **Route** on the home page are coming-soon placeholders. They are not live how-tos or a route engine, and they do not link out.

## Run locally

No build step and no npm install.

```bash
python3 -m http.server 8080
```

Open [http://127.0.0.1:8080/](http://127.0.0.1:8080/).

Keyword checks:

```bash
node tests/router.test.js
```

## Deploy on Render (static site)

Same shape as [power-tool](https://github.com/warobbo/power-tool) and [mhwater](https://github.com/warobbo/mhwater).

1. Merge this branch to `main`.
2. In Render: **New → Static Site**.
3. Connect `warobbo/motorhometools`, branch `main`.
4. Settings:
   - **Build Command:** leave empty
   - **Publish Directory:** `.` (repo root)
5. Optional environment variable: `SKIP_INSTALL_DEPS=true`
6. Deploy. The onrender host will be something like `motorhometools.onrender.com`.

A `render.yaml` Blueprint is included with the same static publish path.

### Point motorhometools.co.uk at Render

In the domain registrar DNS:

| Type | Name | Value |
| --- | --- | --- |
| **A** | `@` | `216.24.57.1` |
| **CNAME** | `www` | `motorhometools.onrender.com` (your Render host) |

Then in Render → the static site → **Custom Domains** add `motorhometools.co.uk` and `www.motorhometools.co.uk`. Render issues TLS.

This is the same A / CNAME pattern as the other hubs.

`robots.txt` and `sitemap.xml` already point at `https://motorhometools.co.uk/`. Privacy, cookies and disclaimer pages live at `privacy.html`, `cookies.html` and `disclaimer.html`.

## Ask box notes (no invented advice)

1. Keywords open the matching hub in the browser.
2. Unmatched questions are saved on the visitor’s phone (`localStorage` key `motorhometools.unansweredAsks`).
3. The page also `POST`s JSON to `/api/ask`. On this **static** site that path 404s — that is expected. The visitor still sees “We’ve noted your question.”
4. Optional email is stored with the question. We will not email a pressure, a weight or legal advice.
5. If you later want server logs (same idea as Payload’s `POST /api/missing-size`), copy `api/ask.example.js` onto a Node web service. Do not add a paid API.

Cache-bust assets by bumping the `?v=` query in `index.html` (see the `ASSET_VERSION` comment).

## Out of scope

Campsite planner, routing engine, Money tile, Mission Control, inventing pressures, and spending on APIs.

## Disclaimer

We open the right page or note the question. We don’t invent tyre pressures, weights or legal advice.
