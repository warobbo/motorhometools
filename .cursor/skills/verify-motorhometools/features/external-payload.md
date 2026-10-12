# Payload and Tyres (external)

Payload and Tyres are not pages this repo serves. The Payload calculator and the Tyres page live at https://motorhomepayload.co.uk/ and https://motorhomepayload.co.uk/tyres.html in the separate repo `warobbo/motorhome-payload-calculator`. This file is a reference so a drive of motorhometools does not pretend to prove them.

## Sub-features

- `external-payload` is the home “Start with Payload” card and the footer Payload link. Both open https://motorhomepayload.co.uk/ in a new tab.
- `external-tyres` is the quiet Tyres line and the footer Tyres link. Both open https://motorhomepayload.co.uk/tyres.html in a new tab.
- `external-ask` can offer those same URLs when the question is about payload, axles, MAM or tyres. Ask still does not invent a plated weight or a pressure.

## How to get to it (user POV)

- On https://motorhometools.co.uk/ choose “Start with Payload”.
- Use a footer “Payload” or “Tyres” link on the home page, About, or a guide.
- Ask a payload or tyre question and follow the link it offers. Tyre questions get a hold message, not a psi figure.

This repo has no payload or tyre inputs and no local result.

## Driving it with verify-motorhometools

Preconditions:

- The home page is up. Doctor has seen `/` return 200.

- **See the links, do not score the other site.** On `/`, the Payload card `href` is `https://motorhomepayload.co.uk/` and the Tyres link `href` is `https://motorhomepayload.co.uk/tyres.html`. Both use `target="_blank"`.
- **Stop there.** Do not fill a registration, a MAM or a tyre size on that origin as proof of this repo. This server cannot compute those results.

| INPUT | EXPECTED | ACTUAL | DIFFERENCE | PASS/FAIL |
| --- | --- | --- | --- | --- |
| Any payload, axle, MAM or tyre figure | Unable to independently verify. The formula is not in this repo. | Not driven. Opening the other site is not a result from this server. | — | NOT RUN |

## Gotchas

- A green home page only proves the link is present. It does not prove remaining payload or a tyre pressure.
- Ask may show a rough payload estimate for some multi-factor questions (bikes, water, gas). That estimate is labelled with assumptions and still sends the visitor to motorhomepayload.co.uk. It is not a substitute for the Payload calculator, and this map does not treat it as one.
- Do not add Payload page files under this skill. They belong in that repo’s own verify skill.
