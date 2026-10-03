# Export

Get a scrape out of the browser: the full data as JSON, or a short text summary.

## Sub-features

- Download as JSON (`gmaps_<place>_<date>.json`), with a save dialog
- Copy Summary: key stats and red flags as text

## How to get to it

After a scrape, click Download as JSON or Copy Summary in the popup.

## Driving it

Preconditions: a completed scrape in the popup.

Blocked for unattended runs: needs a live scrape first, then a save dialog or
the clipboard.

## Gotchas

- Copy Summary does nothing: the button is enabled but has no click handler,
  and `formatSummary` is never called. Found by reading; not yet clicked.
- Chrome's service worker has no blob URLs, so the download is a base64 data
  URL. It encodes to UTF-8 bytes first; plain `btoa` throws on accents and CJK.

## Where it lives

Checked at: `1969a70`

- `popup/popup.js`: `handleDownloadClick`, `formatSummary`
- `background.js`: `toJsonDataUrl`, the download itself
