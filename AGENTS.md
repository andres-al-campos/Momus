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
- **Trust first, keywords second, the rest quieter** (2026-10-18). The
  authenticity analysis and Google's keywords were what mattered in practice.
- **WebTime's design language** (2026-10-18): its tokens, IBM Plex Sans/Mono,
  dark ground. Mockups in `designs/`.
- **Colour says good or bad for the place** (2026-10-18). Data bars are
  WebTime's blue. Numbers are green when good for the place, amber in
  between, and red when bad, as in the old keyword list: "pretty intuitive."
  Three steps are enough; no lighter in-between greens. Unlike WebTime, which
  never uses red because it's grading your own browsing, Momus is judging an
  apartment.

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

## Feature map

`features/` lists what a user can do and how to drive it. Read its README
before adding or changing a feature.
