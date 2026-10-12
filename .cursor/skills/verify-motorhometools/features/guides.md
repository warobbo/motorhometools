# Guides

Guides at https://motorhometools.co.uk/guides/ are short articles. They explain a topic and link to a calculator. They do not compute a payload, a watt-hour or a litre. A correct result is the article’s H1 and a link to the matching tool, with the visitor’s own figures left for that tool.

## Sub-features

- `guides-index` lists Payload, Power and Water groups.
- `guides-payload` is four articles that point at motorhomepayload.co.uk.
- `guides-power` is three articles that point at this site’s Power tools.
- `guides-water` is three articles that point at this site’s Water tools.

## How to get to it (user POV)

- On the home page, choose a guide card or “All guides”.
- Open https://motorhometools.co.uk/guides/ and choose an article.
- Footer “Guides” on the home page goes to the index.
- Calculator pages link the matching guide from their guide strip.

| Live URL | H1 the visitor should see | Where it sends the figures |
| --- | --- | --- |
| https://motorhometools.co.uk/guides/ | Motorhome guides | Payload, `/power/`, `/water/` |
| https://motorhometools.co.uk/guides/weighbridge-how-to.html | How to weigh a motorhome at a UK weighbridge | https://motorhomepayload.co.uk/ |
| https://motorhometools.co.uk/guides/axle-weights-explained.html | Motorhome axle weights: front, rear, and why the total isn’t enough | https://motorhomepayload.co.uk/ |
| https://motorhometools.co.uk/guides/where-you-put-it.html | It’s not just the total weight — it’s where you put it | https://motorhomepayload.co.uk/ |
| https://motorhometools.co.uk/guides/mam-mass-in-service-payload.html | Motorhome MAM, Mass in Service, and payload — in plain English | https://motorhomepayload.co.uk/ |
| https://motorhometools.co.uk/guides/daily-power-budget.html | Motorhome daily power budget (what drains the leisure battery) | `/power/` |
| https://motorhometools.co.uk/guides/battery-size-plain-english.html | Leisure battery size in plain English | `/power/battery.html` |
| https://motorhometools.co.uk/guides/solar-reality-check.html | Motorhome solar panel sizing (daily Wh reality) | `/power/solar.html` |
| https://motorhometools.co.uk/guides/fresh-waste-tanks.html | Fresh and waste tanks (fill, weight, empty) | `/water/tanks.html` |
| https://motorhometools.co.uk/guides/gas-lpg-basics.html | Motorhome gas / LPG bottles and safety | `/water/gas.html` |
| https://motorhometools.co.uk/guides/cassette-toilet-empty.html | When and where to empty a motorhome cassette toilet | `/water/cassette.html` |

## Driving it with verify-motorhometools

Preconditions:

- Doctor `--pages` is the load check. Guides are static HTML. The H1 is in the response body.

- **Index and every article.** Run `./.cursor/skills/verify-motorhometools/scripts/doctor.js --base http://127.0.0.1:$PORT --pages`. Each path in `scripts/routes.js` under `feature: "guides"` must return 200 and include the snippet that file expects (the H1, or a unique part of it).
- **A correct article** shows that H1 and the calculator link in the table above. It does not print a personalised watt-hour, kilogram or litre result.
- **Proof.** Doctor stdout `doctor page 200 /guides/...` for each row. There is no calculator screenshot for a guide.

Guides do no maths. There is no INPUT / EXPECTED / ACTUAL row. Payload numbers stay on motorhomepayload.co.uk, which this repo cannot calculate.

## Gotchas

- Home only features three payload guides. The power and water articles are on the index, not on the home grid. Missing from the home grid is not the same as missing from the site.
- Tyres guides are not published. Do not add a tyres article to this map until a page exists.
- Guide links to Payload open a new tab on another origin. Following one does not verify this repo.
