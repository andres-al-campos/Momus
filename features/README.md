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

- **A stamp** under the title: `Checked against 1.19.0.` The version every
  statement was last read against the code at.
- **Sub-features**: the selling points; the README's feature list comes from these.
- **How to get to it**: the user's path.
- **Driving it**: preconditions, then steps an agent can follow, or why it's blocked.
- **Calls**: rulings on this feature, each starting with the date and the
  version it was made at, with the owner's why. A rule that holds across Momus
  goes in AGENTS.md's Principles instead.
- **Gotchas**: what has bitten us.

## Keeping it current

Update a feature's file in the same commit that changes the feature. Write
only what a user can do and observe: paths, commands, results. Code locations
are left out on purpose; read the code when a task needs them.

Check a file's stamp when you read it. If `manifest.json` has moved past it
and you're about to act on the file, reread it against the code you're
touching, fix what's no longer true, and re-stamp it. A Call made at an older
version whose subject has changed since goes to the owner, with the case in
hand. `./build.sh check` (✓ `doc-stamps`) fails when a feature file has no
stamp or names a version Momus never had. The README and the guides in
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
