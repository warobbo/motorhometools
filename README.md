# Motorhome Tools

Phone-first front door for the UK leisure hubs. Home hero: **Stop guessing your van’s limits.**

This is a **signpost**, not a campsite planner, not a route engine, and not another calculator.

| Tile | Goes to |
| --- | --- |
| Payload | [motorhomepayload.co.uk](https://motorhomepayload.co.uk/) (new tab) |
| Tyres | [motorhomepayload.co.uk/tyres.html](https://motorhomepayload.co.uk/tyres.html) |
| Power | [motorhomepower.co.uk](https://motorhomepower.co.uk/) |
| Water | [motorhomewater.co.uk](https://motorhomewater.co.uk/) — gas, tanks and cassette are tabs on that hub |
| Guides | [motorhometools.co.uk/guides/](https://motorhometools.co.uk/guides/) — Wave 1 payload articles |
| Route | Coming soon (no fake maps) |

The Ask box routes a few keywords (payload, tyres, power, water / gas / tanks / cassette). Toilet, loo and porta potty go to Cassette. If nothing matches, the question (and optional email) is passed to the site owner via `POST /api/ask`. It does **not** invent tyre pressures, weights or legal advice. Replies are not automated.

**Guides** on the home page links to Wave 1 payload articles. **Route** stays a coming-soon placeholder — not a route engine, and it does not link out.

## Run locally

Tiny Node static server (same shape as [motorhome-payload-calculator](https://github.com/warobbo/motorhome-payload-calculator)).

```bash
npm start
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

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
   - **Build Command:** `npm install`
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

## Guides (Wave 1 — Payload)

Static HTML under `guides/`. Copy locked from Wayne’s Notion drafts; polished for UK search, not invented safety numbers.

| Page | Slug |
| --- | --- |
| Index | `/guides/` |
| Weighbridge how-to | `/guides/weighbridge-how-to.html` |
| Axle weights | `/guides/axle-weights-explained.html` |
| MAM / Mass in Service / payload | `/guides/mam-mass-in-service-payload.html` |

Each page has a unique title, meta description, one H1, canonical, and Open Graph basics. Payload links open in a new tab with `rel="noopener"`. Tyres, Power and Water guides are out of scope.

Cache-bust assets by bumping the `?v=` query in `index.html` and `guides/*.html` (see the `ASSET_VERSION` comment).

## Out of scope

Campsite planner, routing engine, Money tile, Mission Control, inventing pressures, and spending on APIs.

## Disclaimer

We open the right page or pass the question to the site owner. We don’t invent tyre pressures, weights or legal advice.
