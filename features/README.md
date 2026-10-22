# Momus features

What a user can do with Momus, how to reach it, and how to drive it. Read this
before adding anything: if it's already here, extend it instead of building it
again.

| Feature | File | Driveable headless? |
|---|---|---|
| Scrape a place | [scrape-a-place.md](scrape-a-place.md) | Blocked: live Google Maps |
| Bulk scrape | [bulk-scrape.md](bulk-scrape.md) | Blocked: live Google Maps |
| Read the analysis | [analysis.md](analysis.md) | Partly: spell checker, via `./build.sh check` |
| Export | [export.md](export.md) | Blocked: browser downloads and clipboard |
| Compare locations | [compare-locations.md](compare-locations.md) | Yes |

## What counts as a feature

Something a user sets out to do, with its own way in. A sub-feature is
something you only reach inside a feature. A feature that calls another (Bulk
scrape runs Scrape once per URL) stays its own feature only if a user can start
it directly; otherwise it's a sub-feature.

## Each file has

- **A stamp** under the title: `Checked 2026-10-20 21:36, at 1.19.0.` When
  every statement was last read against the code, and Momus's version then.
- **Sub-features**: the selling points; the README's feature list comes from these.
- **How to get to it**: the user's path.
- **Driving it**: preconditions, then steps an agent can follow, or why it's blocked.
- **Calls**: rulings on this feature, each starting with the time and the
  version it was made at, with the owner's why. A rule that holds across Momus
  goes in AGENTS.md's Principles instead.
- **Gotchas**: what has bitten us.

## Keeping it current

Update a feature's file in the same commit that changes the feature. Write
only what a user can do and observe: paths, commands, results. Code locations
are left out on purpose; read the code when a task needs them.

Check a file's stamp when you read it. If the code you're about to act on
changed since then (`git log --since="<stamp time>" -- <paths>`), reread the
file against it, fix what's no longer true, and re-stamp it. A Call made
before its subject changed goes to the owner, with the case in hand.
`./build.sh check` (✓ `doc-stamps`) fails when a feature file has no stamp, or
a stamp, Principle or Call lacks a time and a version Momus has had. The README and the guides in
`docs/` carry a stamp once someone checks them; until then they're unchecked.

## Driving conventions

- `./build.sh` opens Firefox on Google Maps with the extension loaded and
  reloading on save; `./build.sh chrome` does the same in Chrome. Each run uses
  a fresh profile, so Google's consent page comes first.
- Logs: page console shows `[Content]` and `[Scraper]`; the popup has its own
  console (right-click the toolbar icon → Inspect).
- Saved scrapes in `reviews/` (gitignored) are real fixtures for anything after
  scraping.
- A feature counts as working when it was driven the way a user would and left
  evidence: a screenshot, a log line, a file.
