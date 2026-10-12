# Coming soon

Four Water URLs and the home-page route note are placeholders. They tell the visitor the tool is not built. A correct result is that message, not a number.

## Sub-features

- `soon-hotwater` is https://motorhometools.co.uk/water/hotwater.html — heading “Hot water (gas vs electric)”, then “Coming soon”.
- `soon-bottles` is https://motorhometools.co.uk/water/bottles.html — heading “Gas bottle / cylinder picker”, then “Coming soon”.
- `soon-winterising` is https://motorhometools.co.uk/water/winterising.html — heading “Winterising volume”, then “Coming soon”.
- `soon-topup` is https://motorhometools.co.uk/water/topup.html — heading “Top-up / Aquaroll planner”, then “Coming soon”.
- `soon-route` is not a URL. The home footer says “Route planner — coming soon.”

## How to get to it (user POV)

- On any Water tool, open “More tools”. Each soon item is marked “soon”.
- Open the four URLs above directly.
- On the home page, read the footer line under the main content. It does not link to a route planner.

There are no calculator inputs. Each soon page offers “Back to Water usage”.

## Driving it with verify-motorhometools

Preconditions:

- Doctor was run with `--pages`.

- **Load each stub.** `./.cursor/skills/verify-motorhometools/scripts/doctor.js --base http://127.0.0.1:$PORT --pages` GETs all four URLs and requires the body to contain `Coming soon`.
- **What correct looks like.** Each page has its own H1, an H2 `Coming soon`, and no watt, litre or kilogram result. The route note on `/` is the sentence `Route planner — coming soon.`
- **Proof.** Doctor stdout lines `doctor page 200 /water/hotwater.html` (and the three siblings). This is a page load, not a calculator drive.

These pages do no maths. There is no INPUT / EXPECTED / ACTUAL row. Inventing a hot-water split, a bottle recommendation, a winterising volume or an Aquaroll count here would be wrong.

## Gotchas

- `/water/bottles.html` still says the picker “will sit next to Gas / LPG usage once that calculator is live.” Gas at `/water/gas.html` is already live. The stub is still coming soon. Do not treat the picker as a working calculator, and do not “fix” this map to hide that sentence: it is what the page shows. This verification change does not edit that copy.
- The soon pages are `noindex`. They are still user-facing if someone opens the URL or the More tools list.
- A 200 with “Coming soon” is a pass for these URLs. A calculated figure on them would be a product bug.
