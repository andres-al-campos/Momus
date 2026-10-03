# Momus features

What a user can do with Momus, how to reach it, and how to drive it. Read this
before adding anything: if it's already here, extend it instead of building it
again.

| Feature | File | Driveable headless? |
|---|---|---|
| Scrape a place | [scrape-a-place.md](scrape-a-place.md) | Blocked: live Google Maps |
| Bulk scrape | [bulk-scrape.md](bulk-scrape.md) | Blocked: live Google Maps |
| Read the analysis | [analysis.md](analysis.md) | Not yet: needs a Node harness |
| Export | [export.md](export.md) | Blocked: browser downloads and clipboard |
| Compare locations | [compare-locations.md](compare-locations.md) | Yes |

## What counts as a feature

Something a user sets out to do, with its own way in. A sub-feature is
something you only reach inside a feature. A feature that calls another (Bulk
scrape runs Scrape once per URL) stays its own feature only if a user can start
it directly; otherwise it's a sub-feature.

## Each file has

- **Sub-features**: the selling points; the README's feature list comes from these.
- **How to get to it**: the user's path.
- **Driving it**: preconditions, then steps an agent can follow, or why it's blocked.
- **Gotchas**: what has bitten us.
- **Where it lives**: the main files, and the commit they were last checked at.

## Keeping it current

Update a feature's file in the same commit that changes the feature.
`features/stale.sh` lists every file whose "Where it lives" files changed
since its "Checked at" commit. Read those entries against the code, fix what's
wrong, and bump the commit.

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
