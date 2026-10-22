# Export

Checked against 1.19.0.

Get a scrape out of the browser: the full data as JSON, or a short text summary.

## Sub-features

- Download JSON (`gmaps_<place>.json`), with a save dialog
- Copy summary: the three cards as plain text (name and rating, the trust
  verdict and its sentence, each keyword's shares and red flags, the red-flag
  groups) and the place's URL

## How to get to it

After a scrape, click Download JSON or Copy summary at the bottom of the popup.

## Driving it

Preconditions: a completed scrape in the popup.

Blocked for unattended runs: needs a live scrape first, then a save dialog or
the clipboard.

## Gotchas

- Copy summary builds its text from `summarize()`, the same source as the
  cards, so the two can't disagree. Wired up 2026-10-19; not yet clicked in
  the real popup.
- Filenames have no date, so scraping a place again overwrites its file.
- Chrome's service worker has no blob URLs, so the download is a base64 data
  URL. It encodes to UTF-8 bytes first; plain `btoa` throws on accents and CJK.
