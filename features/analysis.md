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

Partly driveable headless. `./build.sh check` loads the content scripts the
way the browser does and checks that the spell checker catches misspellings
(✓ `spellcheck-loads`). The rest of the analysis isn't checked yet; the same
harness could run every file in `reviews/` through it.

## Gotchas

- `scripts/reprocess.js` keeps its own copy of the analysis helpers; a change
  here has to be made there too, or the two drift apart.
- Capitalised words the dictionary doesn't know are skipped as names; slang
  and texting (lol, dont, alot, wifi) still counts as a spelling error.
- Every scrape before 2026-10-18 shows 0 spelling errors: Typo.js was injected
  as a page `<script>`, which the content script can't see, and the fallback
  passed every word. It now loads as a content script. Confirmed live in
  Chromium on 2026-10-19 ("[Content] Dictionary loaded successfully"); a full
  scrape wasn't, because Google serves headless, signed-out browsers a
  "limited view" with no reviews. Old files in `reviews/` keep their zeros
  until rescraped.
