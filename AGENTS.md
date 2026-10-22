# Momus

Momus tells you whether an apartment's Google reviews can be trusted, and what
residents actually say about living there, before you sign a lease.

## Principles

How Momus ought to be, so a session can decide a case nobody has met yet. Each
earns its place by deciding Calls, the rulings in `features/`, which end by
naming the principle they apply. Listed in the order they were written; when two
disagree on a case, the owner decides and the winner moves up. The hook in
`hooks/` starts each with the time and version it was made or reworded at.

- 2026-10-22 02:20, 1.19.0. **Fits the hunt.** Momus is used back and forth with the listing sites, so
  what's used together sits a click apart, and opening it answers the question
  it's opened with: "did I scan this one already?" A wide dashboard suits
  someone studying one place; a renter is comparing many.
- 2026-10-22 02:20, 1.19.0. **Colour is a verdict.** Colour means good or bad for the place, in three
  steps, and appears only where it means that. Colouring every number made each
  colour look like it meant something different; three steps were enough.
- 2026-10-22 02:20, 1.19.0. **One family with WebTime.** Momus speaks WebTime's design language (its
  tokens, fonts and dark ground), so the owner's tools read as one set. Where
  Momus's job differs, the job wins: WebTime never uses red, but Momus judges a
  place, so *Colour is a verdict* comes first.
- 2026-10-22 02:20, 1.19.0. **Claims no more than the data knows.** Words, the verdict and colour claim
  only what the evidence supports. Momus knows a review's stars, not what it
  thinks of a topic, and a signal no study has shown to tell fake reviews from
  real ones is shown as evidence, not scored.
- 2026-10-22 02:20, 1.19.0. **Answers in the order they're asked.** Each section answers one question a
  renter has, in the order they ask it, and reads as a sentence. Detail opens
  from the claim it backs when the reader asks by opening it; a hover is
  something nobody finds, and there is no drawer of leftovers.
- 2026-10-22 02:20, 1.19.0. **Easy to read and follow.** Text reads without effort on the dark ground,
  feedback shows where the eye already is after acting, and nothing moves what
  the user is aiming at. Dark apps are "always such a pain" to read, and a
  status line under the Scrape button was too small to follow.

## Feature map

`features/` lists what a user can do and how to drive it. Read its README
before adding or changing a feature.
