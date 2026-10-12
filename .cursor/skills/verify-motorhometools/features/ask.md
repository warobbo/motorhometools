# Ask

Ask at https://motorhometools.co.uk/ask/ (and the same box on the home page) routes a plain-English question to a calculator, or posts an unmatched note to the site owner. It does not invent a pressure, a weight or a legal number. Replies are not automated.

The unmatched `POST /api/ask` handler runs in the same Node process as the pages. On Render that process is the `motorhometools-ask` web service.

## Sub-features

- `ask-match` shows a guide and a link for a known topic such as “solar”. It does not navigate by itself and it does not POST.
- `ask-unmatched` posts the question and shows that the note reached the site owner.
- `ask-honeypot` ignores a filled `website` field and does not log it.
- `ask-tyres` holds tyre-pressure questions and does not invent a psi or bar figure.
- `ask-api` answers `GET /api/ask` with `{ "ok": true, "capture": true }`.

## How to get to it (user POV)

- Open https://motorhometools.co.uk/ask/.
- On the home page, use the section “Not sure? Ask in plain English”.
- The home page links “shareable Ask page” to `/ask/`.

Inputs: `#ask-question` (max 280 characters) and optional `#ask-email`. The honeypot `#ask-website` is not a real field. Submit with “Find it”.

## Driving it with verify-motorhometools

Preconditions:

- Doctor has already seen `GET /api/ask` return `ok: true` and `capture: true`.
- `ASK_LOG_PATH` points at this run’s scratch log. Do not set `ASK_NOTIFY_EMAIL` for the proof.
- Fresh context on `/ask/`.

- **Matched solar.** Type `solar` and choose Find it. The status includes `Ask can’t calculate that yet`. The answer link href is `/power/solar.html` and its text is `Open Solar to enter your figures`. The page stays on `/ask/`. No `[ask]` log line is written for this question.
- **Unmatched note.** Replace the question with `best campsite near York`, leave email empty, and choose Find it. The status includes `we’ve passed this to the site owner` and `Replies are not automated`. The server log gains one `[ask]` JSON line containing that question.
- **Proof.** Screenshots `ask-solar.png` and `ask-unmatched.png`, plus `ask unmatched server log` in `results.json`.

Other matched destinations a visitor can type (not all are in the default drive; spot-check when Ask routing changes):

| Question | Link the answer offers |
| --- | --- |
| `battery` | `/power/battery.html` |
| `inverter` | `/power/inverter.html` |
| `wire`, `fuse`, or `electrical cable` | `/power/wire.html` |
| `water` | `/water/` |
| `gas` or `calor` | `/water/gas.html` |
| `cassette` or `toilet` | `/water/cassette.html` |
| `payload` or `weighbridge` | `https://motorhomepayload.co.uk/` (new tab) |

Bare `cable` is not in that list. Typed on its own it is an unmatched note: the status is the site-owner line, there is no Wire link, and the server log gains an `[ask]` line. `wire`, `fuse`, and `electrical cable` offer `/power/wire.html` and do not POST.

A correct matched result is that guide text plus the link. A correct unmatched result is the status above and `{"ok":true,"saved":true}` from `POST /api/ask`. Tyres questions get a hold / caution, not a pressure.

## Gotchas

- Ask never auto-navigates. A proof that only watches the URL will miss a successful match.
- The honeypot is `#ask-website` inside an `inert` block. A visitor does not fill it. If that field has a value when the form is submitted, the status is `We’ve noted your question.` The page does not POST and writes no `[ask]` line. A direct `POST /api/ask` with `website` set returns `{ "ok": true, "ignored": true }` and writes no log line. Leave the field empty for a real note.
- Rate limit is 10 posts in 10 minutes per client. A burst of unmatched proofs returns `429` with `error: "rate"`.
- Locally, with `NODE_ENV` unset and `ASK_LOG_PATH` unset, notes also append to gitignored `data/asks.jsonl`. Production logs stdout only unless `ASK_LOG_PATH` is set. Do not print `ASK_NOTIFY_EMAIL`.
- Copilot answers for gas bottle-days, cassette empties and Wave 3 watts are estimates with labelled assumptions and a prefilled calculator link. They are still not a substitute for opening the calculator.
