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
cut-offs in Calls below, counts a review once per red-flag group, and hides the
typo row when every count is 0 (✓ `summarize`). How the cards look isn't
checked: open the popup after a scrape.

## Calls

Rulings on the results view, and on the popup's look as a whole, with the
owner's why at the time.

- 2026-10-18. Three cards, one question each. Can you trust them? What do people
  mention? What goes wrong? Trust leads, then Google's keywords, then red flags,
  which the owner found among the most informative. Every supporting number
  (word count by rating, posting bursts, star counts) opens from the trust
  card's evidence row it backs, with a line saying what it measures; there is no
  separate drawer of leftovers.
- 2026-10-18. WebTime's design language: its tokens, IBM Plex Sans/Mono, dark
  ground. Mockups in `designs/`. Since 2026-10-19 the ground is near-black
  (#0d0e11), with cards a step lighter: pitch black was asked for, then eased a
  little once the greys were brightened.
- 2026-10-18. Colour says good or bad for the place. Data bars are WebTime's
  blue. Numbers are green when good for the place, amber in between, and red
  when bad, as in the old keyword list: "pretty intuitive." Three steps are
  enough; no lighter in-between greens. Unlike WebTime, which never uses red
  because it's grading your own browsing, Momus is judging an apartment.
- 2026-10-18. Colour cut-offs, from the spread across 16 saved places,
  rounded: keyword ≥4★ share green from 70%, red under 40%; keyword 1★ share
  green under 10%, red over 30%; share of reviews ≤3★ green under 10%, red over
  40%; low reviews naming a problem green under 35%, red over 60%. Too few
  places to be significant; retune as scrapes accumulate.
- 2026-10-18. Keywords tell one story per topic. "pools (10 reviews)", then "90%
  rated ≥4★" in the row's one colour, the 1★ share and red flags (with counts)
  in grey. No average, since it moves with the ≥4★ share. Say "rated", never
  "liked": Momus knows a review's stars, not what it thinks of the topic. One
  colour per row, because colouring each number made each colour look like it
  meant something different.
- 2026-10-18. Each section tells a story, in reading order. Red flags: "29% of
  reviews are ≤3★. 62% of those mention these red flags:" then the flags grouped
  by kind. Shares carry the story; raw "x of y" counts are secondary and can go.
- 2026-10-18. Red flags are grouped by kind and tinted coral. The groups are the
  headings in `content/keywords.js` (pests, leaks and mold, crime, management,
  noise, move-out), sorted by how many low reviews mention each. The card's
  ground, border and word chips are coral, the one card off the shared ground,
  because the old pink-tinted card was missed; group labels stay plain so each
  group reads as its own block. Red-flag words use the shared red, not a lighter
  coral, which read as orange.
- 2026-10-19. The header is the place's name, then "3.8★ · 364 reviews" at a
  readable size. The rating is coloured: green from 4.3★, red under 3.8★ (16
  saved places average 4.1). Sort order isn't shown: most scrapes read every
  review, so it rarely matters.
- 2026-10-19. Explanations live in the opened evidence row, not tooltips.
  Opening the row is the reader asking; a tooltip would add a hover nobody
  finds. Tooltips only go on things that don't open.
- 2026-10-19. Typos are evidence, counted per word. A "5★ typos" row shows the
  share of words misspelled by rating; per review, long reviews look worse just
  for being long. Typos don't feed the verdict: no study found them to separate
  fake from real reviews.
- 2026-10-19. One border grey, the buttons', so cards don't blend into each
  other. The red-flags card keeps its coral edge.
- 2026-10-19. Star bars are thin and close together, and ★ is a real star glyph.
  IBM Plex has no ★, and the fallback looked like an asterisk.
- 2026-10-19. Grey text is bright, because dark apps are "always such a pain"
  to read and "all that grey text" still felt low-contrast at 4.5:1. Dim text is
  #c4c9d1 (10.6:1 on a card), faint is #9aa1ac (6.8:1), and the blue button is
  darkened to 5:1 for its white text. Two grey ranks stay distinct so notes read
  as secondary. Check a new colour against its ground before using it.
- 2026-10-19. Roomy header, centred column. The header was cramped: it is
  taller, with a full-size New scrape button. The scrolling column reserves
  scrollbar space on both sides, so the scrollbar sits inside the margin instead
  of beside the content.

## Gotchas

- The numbers, colours and sentences come from `popup/summarize.js`;
  `popup/popup.js` only builds the DOM. Change a cut-off there and in
  the Colour cut-offs call below.
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
