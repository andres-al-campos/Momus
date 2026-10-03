# Scrape a place

Load every review (up to a limit) from one Google Maps place and analyze them
in the browser. Everything else in Momus starts from the data this produces.

## Sub-features

- Sort order: most relevant, newest, highest, lowest
- Max reviews: 100 / 200 / 300 / 500 (default) / all
- Opens the Reviews tab, scrolls to load reviews, expands "More" on long ones
- Remembers the last scrape and the chosen options when the popup reopens

## How to get to it

1. Open a place on Google Maps (the URL contains `/maps/place/`).
2. Click the Momus toolbar icon, pick sort and max reviews.
3. Click Scrape Reviews and wait (30–60 s for a few hundred reviews).

## Driving it

Preconditions: `./build.sh` running, past Google's consent page, on a place page.

Blocked for unattended runs: Google may show consent or bot checks, and a
CAPTCHA ends the run. Drive it with a person present, then save the JSON to
`reviews/` as a fixture for the other features.

## Gotchas

- The scraper depends on Google's DOM. "No reviews found" or "Could not find
  review container" usually means Google changed its markup; selectors are in
  `findReviewContainer` and `parseAllReviews`.
- A search-results URL isn't a place page and fails with "Not on a Google Maps
  place page".
- The popup keeps the last scrape in `storage.local`, although the README's
  privacy section says nothing persists.

## Where it lives

Checked at: `1969a70`

- `popup/popup.js`: `handleScrapeClick`, `triggerScrape`
- `content/content.js`: `performScrape`, message listener
- `content/scraper.js`: sorting, scrolling, parsing the DOM
