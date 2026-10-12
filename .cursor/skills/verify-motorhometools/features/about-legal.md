# About and legal

About, Privacy, Cookies and Disclaimer are static pages. They describe who runs the site and what it stores. They do not calculate.

## Sub-features

- `about-page` is https://motorhometools.co.uk/about/ with H1 “About Motorhome Tools”.
- `privacy-page` is https://motorhometools.co.uk/privacy.html with H1 “Privacy”.
- `cookies-page` is https://motorhometools.co.uk/cookies.html with H1 “Cookies”.
- `disclaimer-page` is https://motorhometools.co.uk/disclaimer.html with H1 “Disclaimer”.

## How to get to it (user POV)

- Footer “About” on the home page goes to `/about/`.
- Footer legal links go to `privacy.html`, `cookies.html` and `disclaimer.html`.
- About links back to Home, Guides, Payload, Tyres, Power and Water.
- Calculator footers link the same three legal pages on the live host.

## Driving it with verify-motorhometools

Preconditions:

- Doctor `--pages`.

- **Load each page.** `./.cursor/skills/verify-motorhometools/scripts/doctor.js --base http://127.0.0.1:$PORT --pages` requires 200 and the H1 text for `/about/`, `/privacy.html`, `/cookies.html` and `/disclaimer.html`.
- **What correct looks like.** About names Motorhome Tools as the publisher, Payload on motorhomepayload.co.uk, and Power and Water on this site. It does not name a person. Privacy says unmatched Ask notes are for the site owner and replies are not automated. None of the four pages show a calculator total.
- **Proof.** Doctor stdout for those four paths.

These pages do no maths. There is no INPUT / EXPECTED / ACTUAL row.

## Gotchas

- Legal pages on the home site use root-relative asset paths (`assets/...`). The same filenames under `/power/` or `/water/` are a different folder. A broken stylesheet on a legal page is not a broken calculator stylesheet.
- Do not type a real email into any contact wording on these pages during a proof. The Ask proof uses the Ask box and leaves email empty.
