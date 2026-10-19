# Read the analysis

The popup's results after a scrape: how trustworthy a place's reviews look and
what problems they mention.

## Sub-features

- Header: place name, then the rating (coloured) and review count
- Can you trust them: a verdict, the star curve, and evidence rows that open
  to say what they measure: authenticity score, star curve smoothness, 5★
  word count, 5★ typos (share of words misspelled, by rating), 5★ posting
  bursts
- What people mention: Google's keywords, each with the share of its reviews
  rated ≥4★ and 1★, and the red flags those reviews name
- Red flags: the share of reviews rated ≤3★, the share of those naming a red
  flag, and the flags grouped by kind (pests, leaks and mold, crime,
  management, noise, move-out)
- Copy summary and Download JSON

## How to get to it

Scrape a place; the results appear in the popup. Reopening the popup shows the
last scrape again.

## Driving it

Preconditions: a saved scrape in `reviews/`.

Partly driveable headless. `./build.sh check` loads the content scripts the
way the browser does and checks that the spell checker catches misspellings
(✓ `spellcheck-loads`), and that the results view colours numbers by the
cut-offs in AGENTS.md, counts a review once per red-flag group, and hides the
typo row when every count is 0 (✓ `summarize`). How the cards look isn't
checked: open the popup after a scrape.

## Gotchas

- The numbers, colours and sentences come from `popup/summarize.js`;
  `popup/popup.js` only builds the DOM. Change a cut-off there and in
  AGENTS.md's Colour cut-offs.
- The verdict rule is a guess, not tuned: both scores Good and nothing
  unusual is "Looks genuine", one unusual signal "Mostly genuine", anything
  else "Read with care". Scrapes older than the trust scores show "Scrape
  again to judge".

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
