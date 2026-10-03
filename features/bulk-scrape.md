# Bulk scrape

Scrape a list of places in one go. Each place's JSON downloads automatically,
ready for Compare locations.

## Sub-features

- Paste URLs one per line; lines without `/maps/place/` are dropped
- Progress bar and current place name
- Cancel mid-run
- Files save without a prompt to `reviews/` inside the downloads folder

## How to get to it

1. Click the Momus toolbar icon, then Bulk Scrape.
2. Paste place URLs, click Start Bulk Scrape.

## Driving it

Preconditions: same as [Scrape a place](scrape-a-place.md), plus a list of
place URLs.

Blocked for unattended runs, for the same reason as Scrape a place.

## Gotchas

- It navigates the active tab to each URL and runs Scrape a place there, so
  that tab is taken over until it finishes.
- It waits a fixed 1 s after navigating before scraping; a slow load can make
  a place fail, and the run moves on to the next one.
- Unverified: whether the run survives the popup closing, since the loop lives
  in the popup.

## Where it lives

Checked at: `1969a70`

- `popup/popup.js`: `startBulkScrape`, `scrapeNextUrl`, `cancelBulkScrape`
- `background.js`: saves to `reviews/` without a prompt
