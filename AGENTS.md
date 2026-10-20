# Momus

Momus tells you whether an apartment's Google reviews can be trusted, and what
residents actually say about living there, before you sign a lease.

## Principles

Look-and-feel calls, with the owner's why.

- **One narrow column, scrape and results a click apart** (2026-10-18). Use
  goes back and forth: collect candidates on Zillow or apartments.com, scrape
  each in Momus, check results, repeat. A single column that switches between
  scrape and results fits that loop better than a wide view.
- **The popup opens on the last scrape, whatever page you're on**
  (2026-10-18). It answers "did I scan this one already?" while hopping
  between places.
- **Three cards, one question each** (2026-10-18): Can you trust them? What
  do people mention? What goes wrong? Trust leads, then Google's keywords,
  then red flags, which the owner found among the most informative. Every
  supporting number (word count by rating, posting bursts, star counts) opens
  from the trust card's evidence row it backs, with a line saying what it
  measures; there is no separate drawer of leftovers.
- **WebTime's design language** (2026-10-18): its tokens, IBM Plex Sans/Mono,
  dark ground. Mockups in `designs/`. Since 2026-10-19 the ground is pitch
  black, with cards a step lighter.
- **Colour says good or bad for the place** (2026-10-18). Data bars are
  WebTime's blue. Numbers are green when good for the place, amber in
  between, and red when bad, as in the old keyword list: "pretty intuitive."
  Three steps are enough; no lighter in-between greens. Unlike WebTime, which
  never uses red because it's grading your own browsing, Momus is judging an
  apartment.
- **Colour cut-offs** (2026-10-18), from the spread across 16 saved places,
  rounded: keyword ≥4★ share green from 70%, red under 40%; keyword 1★ share
  green under 10%, red over 30%; share of reviews ≤3★ green under 10%, red
  over 40%; low reviews naming a problem green under 35%, red over 60%. Too
  few places to be significant; retune as scrapes accumulate.
- **Keywords tell one story per topic** (2026-10-18): "pools (10 reviews)",
  then "90% rated ≥4★" in the row's one colour, the 1★ share and red flags
  (with counts) in grey. No average, since it moves with the ≥4★ share. Say
  "rated", never "liked": Momus knows a review's stars, not what it thinks of
  the topic. One colour per row, because colouring each number made each
  colour look like it meant something different.
- **Each section tells a story, in reading order** (2026-10-18). Red flags:
  "29% of reviews are ≤3★. 62% of those mention these red flags:" then the
  flags grouped by kind. Shares carry the story; raw "x of y" counts are
  secondary and can go.
- **Red flags are grouped by kind and tinted coral** (2026-10-18). The groups
  are the headings in `content/keywords.js` (pests, leaks and mold, crime,
  management, noise, move-out), sorted by how many low reviews mention each.
  The card's ground, border and word chips are coral, the one card off the
  shared ground, because the old pink-tinted card was missed; group labels
  stay plain so each group reads as its own block. Red-flag words use the
  shared red, not a lighter coral, which read as orange.
- **The header is the place's name, then "3.8★ · 364 reviews" at a readable
  size** (2026-10-19). The rating is coloured: green from 4.3★, red under
  3.8★ (16 saved places average 4.1). Sort order isn't shown: most scrapes
  read every review, so it rarely matters.
- **Explanations live in the opened evidence row, not tooltips**
  (2026-10-19). Opening the row is the reader asking; a tooltip would add a
  hover nobody finds. Tooltips only go on things that don't open.
- **Typos are evidence, counted per word** (2026-10-19). A "5★ typos" row
  shows the share of words misspelled by rating; per review, long reviews
  look worse just for being long. Typos don't feed the verdict: no study
  found them to separate fake from real reviews.
- **One border grey, the buttons'** (2026-10-19), so cards don't blend into
  each other. The red-flags card keeps its coral edge.
- **Star bars are thin and close together, and ★ is a real star glyph**
  (2026-10-19). IBM Plex has no ★, and the fallback looked like an asterisk.
- **Every text colour reads at 4.5:1 or better** (2026-10-19), because dark
  apps are "always such a pain" to read. WebTime's faint grey (2.9:1 on a
  card) and its blue button (3.5:1) both failed, and the faint text was also
  the smallest. Check a new colour against its ground before using it.
- **Roomy header, centred column** (2026-10-19). The header was cramped: it
  is taller, with a full-size New scrape button. The scrolling column
  reserves scrollbar space on both sides, so the scrollbar sits inside the
  margin instead of beside the content.

## Feature map

`features/` lists what a user can do and how to drive it. Read its README
before adding or changing a feature.
