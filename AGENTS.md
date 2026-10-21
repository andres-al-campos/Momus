# Momus

Momus tells you whether an apartment's Google reviews can be trusted, and what
residents actually say about living there, before you sign a lease.

## Principles

General rules for look and feel, each with the owner's why. A ruling on one
feature goes in its file in `features/`, under Calls.

- 2026-10-18. The popup follows the loop it's used in: what's used back and
  forth sits a click apart, and opening it answers the question it's opened
  with. Use goes back and forth between listings and Momus, and the question
  on opening is "did I scan this one already?"
- 2026-10-18. Each section answers one question, in the order a reader asks
  them, and reads as a sentence. Supporting detail opens from the claim it
  backs; there is no drawer of leftovers.
- 2026-10-18. Colour means good or bad for the place, in three steps, and
  appears only where it means that. Colouring every number made each colour
  look like it meant something different; three steps were enough.
- 2026-10-18. Words claim only what the data knows: Momus knows a review's
  stars, not what it thinks of a topic, so it says "rated", never "liked".
- 2026-10-18. Momus speaks WebTime's design language, so the owner's tools
  look like one family.
- 2026-10-19. An explanation appears when the reader asks for it, by opening
  what they're curious about. A hover is something nobody finds.
- 2026-10-19. Only evidence known to tell fake reviews from real ones feeds
  the verdict; the rest is shown as evidence. No study found typos to do it.
- 2026-10-19. Text reads without effort on the dark ground. Dark apps are
  "always such a pain" to read, and grey text at 4.5:1 still felt
  low-contrast. Check a new colour against its ground before using it.
- 2026-10-20. Feedback shows where the eye already is after acting, and
  nothing moves what the user is aiming at. A status line under the Scrape
  button was too small to follow.

## Feature map

`features/` lists what a user can do and how to drive it. Read its README
before adding or changing a feature.
