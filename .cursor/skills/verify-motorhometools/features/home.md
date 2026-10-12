# Home

The front door at https://motorhometools.co.uk/ introduces the hubs, asks a question in plain English, and links to guides. It does not calculate a weight, a watt-hour or a litre.

## Sub-features

- `home-open` shows the heading “Stop guessing your van’s limits”.
- `home-payload` links to the external Payload calculator in a new tab.
- `home-power-water` opens Daily Power and Water on this origin.
- `home-ask` is the same Ask box as `/ask/`.
- `home-guides` links the three payload guides and the full guide index.
- `home-route` states that a route planner is not live.
- `home-mobile` keeps the Payload card inside a 390px-wide portrait screen.

## How to get to it (user POV)

- Open https://motorhometools.co.uk/ or the local equivalent `http://127.0.0.1:$PORT/`.
- Use the Motorhome Tools logo, which links to `/`.
- From a calculator, choose Home in the top nav.

## Driving it with verify-motorhometools

Preconditions:

- Doctor reports the home page 200 and the heading text.
- Drive a fresh browser context. Viewport for the mobile check is `390×844`.

- **Open the front door.** Go to `/`. Run the drive script (it opens `/` at 390×844). The heading reads `Stop guessing your van’s limits`.
- **Payload card.** The card “Start with Payload” is a link to `https://motorhomepayload.co.uk/` with `target="_blank"`. Do not follow it to prove Payload maths.
- **Power and Water.** “Power” links to `/power/`. “Water” links to `/water/`.
- **Tyres.** The quiet line links to `https://motorhomepayload.co.uk/tyres.html` in a new tab. It does not show a pressure.
- **Route.** The footer says `Route planner — coming soon.` There is no map and no route URL.
- **Mobile width.** At 390×844 the Payload card is wider than 280px and no wider than the viewport. Screenshot `home-mobile-390.png`.
- **Proof.** `results.json` records `home mobile h1` and `home mobile payload card width`.

## Gotchas

- `/` is served by this Node process together with `/api/ask`. There is no second local server for the home page.
- The live Render service that serves this origin is the Node web service (README name `motorhometools-ask`). `render.yaml` calls the blueprint service `motorhometools`. Same repo, same `node server.js`.
- A green home page does not prove a calculator. Open the tool and read its result elements.
