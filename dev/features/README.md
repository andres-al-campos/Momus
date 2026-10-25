# Momus features

Updated 2026-10-25 11:42, at 1.19.0.

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

- **A stamp** under the title: `Updated 2026-10-20 21:36, at 1.19.0.` When the
  description last changed, and Momus's version then. The pre-commit hook in
  `dev/hooks/` writes it; a change only to the Calls leaves it alone.
- **Sub-features**: the selling points; the README's feature list comes from these.
- **How to get to it**: the user's path.
- **Driving it**: preconditions, then steps an agent can follow, or why it's blocked.
- **Calls**: what was found in one case on this feature, with the owner's why,
  ending with the Principle in AGENTS.md it applies (`Applies *Name*.`) or none.
  The hook starts each with the time and version it was made or reworded at.
- **Gotchas**: what has bitten us.

## Keeping it current

Update a feature's file in the same commit that changes the feature. Write
only what a user can do and observe: paths, commands, results. Code locations
are left out on purpose; read the code when a task needs them.

Before acting on a file, run `git log --since="<stamp time>"` on the code
you're about to touch. Where it moved after the stamp, read the file against
it and fix what's no longer true; the fix moves the stamp. A Call made before
its subject changed goes to the owner, with the case in hand. `./build.sh`
turns the hook on. `./build.sh check` (✓ `doc-stamps`) fails when a feature
file, the README or a guide in `docs/` has no stamp, a stamp, Principle or
Call lacks a time and a version Momus has had, or a Call cites a Principle
that doesn't exist.

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
