# Read the analysis

The popup's results after a scrape: how trustworthy a place's reviews look and
what problems they mention.

## Sub-features

- Star distribution, average rating, 2–4 star ("middle") review count
- Suspicion score: how bimodal the distribution is
- Rating clustering, recent vs. all, for 5★ and 1★
- Word count by rating
- Spelling errors by rating (Typo.js, Hunspell en_US)
- Authenticity scores from how jagged the star curve is
- Google keyword correlation: whether Google's highlighted keywords skew negative
- Red flags: pests, mold, crime, management, noise, move-out warnings

## How to get to it

Scrape a place; the results appear in the popup. Reopening the popup shows the
last scrape again.

## Driving it

Preconditions: a saved scrape in `reviews/`.

Not yet driveable headless. The analysis functions in `content/content.js` are
pure, but the file registers a browser message listener on load, so Node can't
import it as is. A harness that loads them and runs every file in `reviews/`
would make this feature checkable without Google.

## Gotchas

- `scripts/reprocess.js` keeps its own copy of the analysis helpers; a change
  here has to be made there too, or the two drift apart.
- Proper nouns and slang count as spelling errors.
