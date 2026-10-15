# Motorhome Tools verification map

This directory is the maintained source for verifying the user-facing behaviour of [motorhometools.co.uk](https://motorhometools.co.uk/). Read this index before driving the app, then use the matching feature file as the recipe.

Whenever a build changes pages or tools, update this feature map in the same PR. A weekly maintain pass runs on Mondays, from Freddie the Font2's routine. That pass edits only this verify folder, opens at most one PR through the review loop, and stays quiet unless blocked.

Calculator files include an INPUT / EXPECTED / ACTUAL table. EXPECTED is worked from the formula in the cited source file, then the page’s own en-GB formatter. ACTUAL is what a drive of this server showed. If a case was not driven, the row says so. Do not invent a number.

The ACTUAL cells that say “Same as EXPECTED” were checked on 14 Oct 2026 by `scripts/drive.js` against a local server (80 checks, all passed). The screen text matched the EXPECTED cell. Payload stays `NOT RUN` because its formula is not in this repo.

Payload and Tyres are not features of this server. They are an external reference: [motorhomepayload.co.uk](https://motorhomepayload.co.uk/) (repo `warobbo/motorhome-payload-calculator`). See [external-payload.md](./external-payload.md).

## Baseline preconditions

- Node 22 (`package.json` engines: `>=22 <23`). From the repo root: `npm install`, `npm test`, `npm run build`, then `node server.js` on a chosen `PORT` (default `4173`).
- The server listens on `0.0.0.0`. Drive `http://127.0.0.1:$PORT`.
- Set `ASK_LOG_PATH` to a file under `/tmp/motorhometools-verify-run/$RUN_ID/` so Ask notes from this run do not mix with another run. Do not set or print `ASK_NOTIFY_EMAIL`.
- Run `node .cursor/skills/verify-motorhometools/scripts/doctor.js --base http://127.0.0.1:$PORT --pages` and require every route in `scripts/routes.js` to return 200. The same doctor run requires `/.cursor/skills/verify-motorhometools/SKILL.md`, `/.gitignore`, `/.git/config` and `/no-such-page` to return the branded Page not found HTML with status 404. Doctor prints the status only, never the body.
- Calculator proofs use a fresh browser context (empty `localStorage`). Power tools share `powertools.systemProfile`. Water, Gas, Tanks and Cassette share `watertools.systemProfile`.
- Never drive an instance that was not started by this verification run.

## Driving conventions

- Start every calculator recipe from a fresh context unless the recipe says the previous page’s saved profile is the point.
- Prefer ids and accessible names (`#total-wh`, `#ask-question`, `button[data-preset="custom"]`) over coordinates.
- Phone portrait is `390×844`. Phone landscape that must show the rotate gate is `844×390`. Desktop spot-check is `1280×900`.
- Run the browser harness with `node .cursor/skills/verify-motorhometools/scripts/drive.js`.
- Visible calculator text is en-GB formatted. Assert that text, not the raw float (`916.5` Wh is shown as `917`).
- Below-the-fold images use `loading="lazy"` and explicit `width` and `height`. Logos, the home Payload icon, and the where-you-put-it diagram stay eager.
- Pages that already have `og:title` also have `twitter:card` of `summary_large_image`, plus `twitter:title` and `twitter:description` copied from the Open Graph title and description.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is a screenshot plus the text of the result elements named in the feature file. The harness writes both under `/tmp/motorhometools-verify-evidence/$RUN_ID/`.
- Ask capture proof includes the on-page status and a `[ask]` line in the server log. Matched questions are not posted.
- Record the feature id and the URL used with every artifact.
- A coming-soon page is verified when it shows `Coming soon` and no calculator result. Do not treat that as a broken calculator.
- Do not report Payload or Tyres as verified by opening a link. Their maths live in another repo.

## Feature entry contract

Each feature file starts with an H1 and one paragraph, then exactly four H2 sections: `Sub-features`, `How to get to it (user POV)`, `Driving it with verify-motorhometools`, and `Gotchas`.

## Features

- [Home](./home.md) — https://motorhometools.co.uk/
- [Ask](./ask.md) — https://motorhometools.co.uk/ask/
- [Daily Power](./power-daily.md) — https://motorhometools.co.uk/power/
- [Battery](./power-battery.md) — https://motorhometools.co.uk/power/battery.html
- [Solar](./power-solar.md) — https://motorhometools.co.uk/power/solar.html
- [Inverter](./power-inverter.md) — https://motorhometools.co.uk/power/inverter.html
- [Wire and fuse](./power-wire.md) — https://motorhometools.co.uk/power/wire.html
- [Water](./water.md) — https://motorhometools.co.uk/water/
- [Gas](./gas.md) — https://motorhometools.co.uk/water/gas.html
- [Tanks](./tanks.md) — https://motorhometools.co.uk/water/tanks.html
- [Cassette](./cassette.md) — https://motorhometools.co.uk/water/cassette.html
- [Coming soon](./coming-soon.md) — route note, plus hot water, bottles, winterising and top-up
- [Guides](./guides.md) — https://motorhometools.co.uk/guides/
- [About and legal](./about-legal.md) — About, Privacy, Cookies, Disclaimer, Terms of use
- [Not found](./not-found.md) — branded 404 for unknown paths and hidden files
- [Payload and Tyres (external)](./external-payload.md) — https://motorhomepayload.co.uk/

## Not public

Dotfiles and dot-folders are not pages. A path segment that starts with `.` returns 404, the same branded Page not found HTML `/.gitignore` already returns. Unknown paths such as `/no-such-page` do the same. That includes `/.cursor/**` (the verify skill and the rest of the agent folder), `/.git/config`, `/.env` and any other dot path. Doctor asserts these three, plus `/no-such-page`, and does not print a body:

- `/.cursor/skills/verify-motorhometools/SKILL.md`
- `/.gitignore`
- `/.git/config`

`/`, `/power/`, `/water/`, `/ask/`, `/api/ask` and the public assets stay as listed below. A filename that only contains a dot, such as `privacy.html`, is still a page.

## Live URL index

| Live URL | What a visitor gets | Feature file |
| --- | --- | --- |
| https://motorhometools.co.uk/ | Front door: Payload card, Ask, Power, Water, three guides, Route coming soon | [home.md](./home.md) |
| https://motorhometools.co.uk/ask/ | Same Ask box, bookmarkable | [ask.md](./ask.md) |
| https://motorhometools.co.uk/power/ | Daily Power calculator | [power-daily.md](./power-daily.md) |
| https://motorhometools.co.uk/power/battery.html | Battery size | [power-battery.md](./power-battery.md) |
| https://motorhometools.co.uk/power/solar.html | Solar array size | [power-solar.md](./power-solar.md) |
| https://motorhometools.co.uk/power/inverter.html | Inverter size | [power-inverter.md](./power-inverter.md) |
| https://motorhometools.co.uk/power/wire.html | Cable and fuse size | [power-wire.md](./power-wire.md) |
| https://motorhometools.co.uk/water/ | Fresh water usage | [water.md](./water.md) |
| https://motorhometools.co.uk/water/gas.html | Gas / LPG usage | [gas.md](./gas.md) |
| https://motorhometools.co.uk/water/tanks.html | Holding tanks | [tanks.md](./tanks.md) |
| https://motorhometools.co.uk/water/cassette.html | Cassette empties | [cassette.md](./cassette.md) |
| https://motorhometools.co.uk/water/hotwater.html | Coming soon | [coming-soon.md](./coming-soon.md) |
| https://motorhometools.co.uk/water/bottles.html | Coming soon | [coming-soon.md](./coming-soon.md) |
| https://motorhometools.co.uk/water/winterising.html | Coming soon | [coming-soon.md](./coming-soon.md) |
| https://motorhometools.co.uk/water/topup.html | Coming soon | [coming-soon.md](./coming-soon.md) |
| https://motorhometools.co.uk/guides/ | Guide index | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/weighbridge-how-to.html | Weighbridge how-to | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/axle-weights-explained.html | Axle weights | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/where-you-put-it.html | Where you put it | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/mam-mass-in-service-payload.html | MAM, Mass in Service, payload | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/daily-power-budget.html | Daily power budget | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/battery-size-plain-english.html | Battery size | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/solar-reality-check.html | Solar reality check | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/fresh-waste-tanks.html | Fresh and waste tanks | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/gas-lpg-basics.html | Gas / LPG basics | [guides.md](./guides.md) |
| https://motorhometools.co.uk/guides/cassette-toilet-empty.html | Cassette toilet | [guides.md](./guides.md) |
| https://motorhometools.co.uk/about/ | About | [about-legal.md](./about-legal.md) |
| https://motorhometools.co.uk/privacy.html | Privacy | [about-legal.md](./about-legal.md) |
| https://motorhometools.co.uk/cookies.html | Cookies | [about-legal.md](./about-legal.md) |
| https://motorhometools.co.uk/disclaimer.html | Disclaimer | [about-legal.md](./about-legal.md) |
| https://motorhometools.co.uk/terms.html | Terms of use | [about-legal.md](./about-legal.md) |
| Any unknown path, for example `/no-such-page` | Branded Page not found, HTTP 404 | [not-found.md](./not-found.md) |
| https://motorhomepayload.co.uk/ | Payload calculator, other repo | [external-payload.md](./external-payload.md) |
| https://motorhomepayload.co.uk/tyres.html | Tyres page, other repo | [external-payload.md](./external-payload.md) |
