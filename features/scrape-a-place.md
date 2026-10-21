# Scrape a place

Load every review (up to a limit) from one Google Maps place and analyze them
in the browser. Everything else in Momus starts from the data this produces.

## Sub-features

- Sort order: most relevant, newest, highest, lowest
- Max reviews: 100 / 200 / 300 / 500 (default) / all
- Opens the Reviews tab, scrolls to load reviews, expands "More" on long ones
- Remembers the last scrape and the chosen options when the popup reopens
- While it runs, the Scrape button shows the progress (scanning, loaded and
  analyzing counts, retries); an error shows in a red box under it

## How to get to it

1. Open a place on Google Maps (the URL contains `/maps/place/`).
2. Click the Momus toolbar icon. If it opens on results, click New scrape.
3. Pick the order and how many reviews to read.
4. Click Scrape reviews and wait (30–60 s for a few hundred reviews).

## Driving it

Preconditions: `./build.sh` running, past Google's consent page, on a place page.

Blocked for unattended runs: Google may show consent or bot checks, and a
CAPTCHA ends the run. Drive it with a person present, then save the JSON to
`reviews/` as a fixture for the other features.

## Gotchas

- The scraper depends on Google's DOM. "No reviews found" or "Could not find
  review container" usually means Google changed its markup; selectors are in
  `findReviewContainer` and `parseAllReviews`.
- On those errors the popup reloads the page and retries up to 3 times before
  showing the error.
- Some markup changes fail silently: a broken histogram selector gives zero
  counts and NaN stats with no error.
- Signed out, Google shows a "limited view": 3–5 reviews, then "See more
  reviews" asks you to sign in, so a scrape reads only those few and judges
  them. Sign in to Google first. Under Playwright, a profile signed in by hand
  stays signed in only without Playwright's fake keychain
  (`--use-mock-keychain`), which can't decrypt the saved cookies.
- Hotels don't scrape: their reviews show ratings as "5/5" text (some from
  partner sites like Trip.com), not star icons, and the scrape fails with "No
  reviews found. The page structure might have changed."
- A search-results URL isn't a place page and fails with "Not on a Google Maps
  place page".
- The popup keeps the last scrape in `storage.local`, although the README's
  privacy section says nothing persists.
