# About and legal

About, Privacy, Cookies, Disclaimer, Contact and Accessibility are pages about who runs the site, what it stores, and how to reach Motorhome Tools. They do not calculate. Contact posts a message to `/api/contact`, which stores it the same way an unmatched Ask question is stored.

## Sub-features

- `about-page` is https://motorhometools.co.uk/about/ with H1 “About Motorhome Tools”.
- `privacy-page` is https://motorhometools.co.uk/privacy.html with H1 “Privacy”.
- `cookies-page` is https://motorhometools.co.uk/cookies.html with H1 “Cookies”.
- `disclaimer-page` is https://motorhometools.co.uk/disclaimer.html with H1 “Disclaimer”.
- `contact-page` is https://motorhometools.co.uk/contact.html with H1 “Contact”. The form posts to `/api/contact`.
- `accessibility-page` is https://motorhometools.co.uk/accessibility.html with H1 “Accessibility”.

## How to get to it (user POV)

- Footer “About” on the home page goes to `/about/`.
- Footer links on every page go to Contact, Privacy, Cookies, Disclaimer and Accessibility.
- About links back to Home, Guides, Payload, Tyres, Power and Water.
- Calculator footers link Contact, Privacy, Cookies, Disclaimer and Accessibility on the live host.

## Driving it with verify-motorhometools

Preconditions:

- Doctor `--pages`.

- **Load each page.** `./.cursor/skills/verify-motorhometools/scripts/doctor.js --base http://127.0.0.1:$PORT --pages` requires 200 and the H1 text for `/about/`, `/privacy.html`, `/cookies.html`, `/disclaimer.html`, `/contact.html` and `/accessibility.html`.
- **What correct looks like.** About names Motorhome Tools as the publisher, Payload on motorhomepayload.co.uk, and Power and Water on this site. It does not name a person. Privacy names Motorhome Tools as the controller, points contact at the contact form, and does not show an email address. Accessibility names WCAG 2.2 AA and the contact form. None of these pages show a calculator total.
- **Contact capture.** A real message posted to `/api/contact` returns `{"ok":true,"saved":true}` and the server log gains a `[contact]` line. A filled honeypot returns `ignored: true` and does not log. `npm test` covers that path. Doctor only loads the page.
- **Proof.** Doctor stdout for those six paths.

These pages do no maths. There is no INPUT / EXPECTED / ACTUAL row.

## Gotchas

- Legal pages on the home site use root-relative asset paths (`assets/...`). The same filenames under `/power/` or `/water/` are a different folder. A broken stylesheet on a legal page is not a broken calculator stylesheet.
- Do not type a real email into any contact wording on these pages during a proof. The Ask proof uses the Ask box and leaves email empty.
