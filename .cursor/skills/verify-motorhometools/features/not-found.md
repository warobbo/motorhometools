# Not found

An unknown address, and any dotfile or dot-folder, returns the branded Page not found page with HTTP status 404. The body is HTML from `404.html`, not the plain text `Not found`.

## Sub-features

- `missing-page` is any path that is not a public file, such as `/no-such-page`, with H1 “Page not found” and status 404.
- `hidden-path` is a dot path such as `/.gitignore`. Same page, same status. Doctor does not print the body.
- `not-found-file` is `404.html` on disk. Requesting `/404.html` serves that file with status 200 and `noindex`. It is not a sitemap URL.

## How to get to it (user POV)

- Type an address that is not a page, or follow a broken link.
- The page links Home, Guides, Power, Water and Ask.
- The footer legal links include Terms, next to Privacy and Disclaimer.

## Driving it with verify-motorhometools

Preconditions:

- Doctor, with or without `--pages`.

- **Unknown path.** `./.cursor/skills/verify-motorhometools/scripts/doctor.js --base http://127.0.0.1:$PORT` requires `/no-such-page` to be 404 HTML containing `<h1>Page not found</h1>`.
- **Hidden paths.** The same run requires `/.cursor/skills/verify-motorhometools/SKILL.md`, `/.gitignore` and `/.git/config` to be that same 404. It prints the status only.
- **What correct looks like.** The heading is `Page not found`. The page names Motorhome Tools and does not name a person, a handle or an email address. It does not show a calculator total.
- **Proof.** Doctor stdout lines `doctor missing 404 /no-such-page` and `doctor hidden 404` for the three hidden paths.

This page does no maths. There is no INPUT / EXPECTED / ACTUAL row.

## Gotchas

- Status stays 404 for unknown paths. A 200 with the same heading on `/no-such-page` means the server served `404.html` as a normal page.
- `/404.html` itself is a real file and returns 200 with `noindex`. Do not add it to `sitemap.xml` or to `scripts/routes.js`.
- Doctor must not print the 404 body. A hidden file’s contents must not appear in the doctor log.
- Asset and legal links in `404.html` are root-relative (`/assets/...`, `/privacy.html`). A relative `assets/styles.css` on `/power/missing` would load the Power stylesheet, and `privacy.html` would point at `/power/privacy.html`.
