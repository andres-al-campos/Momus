# Compare locations

Rank several scraped places against each other, outside the extension.

## Sub-features

- Ranked CSV with weighted critical and important flags (`scripts/analyze.js`)
- Side-by-side dashboard with sortable columns and jaggedness score
  (`scripts/compare.html`)
- Re-run newer analysis on old scrapes without re-scraping, including Local
  Guide analysis the extension doesn't do (`scripts/reprocess.js`)

## How to get to it

1. Put scrapes in `reviews/` (Bulk scrape saves them there).
2. `node scripts/analyze.js [dir] [out.csv]` (defaults: `./reviews` and
   `<dir>/rankings.csv`); or open `scripts/compare.html` and load the JSON files.

## Driving it

Preconditions: at least two JSON files in `reviews/`.

- `node scripts/analyze.js reviews "$TMPDIR/rankings.csv"`, then check the CSV
  has one ranked row per JSON file (16 on 2026-10-04).
- `scripts/compare.html`: open it in the built-in browser and load the files.

## Gotchas

- Weights are constants at the top of `analyze.js`; that's the customization
  point the README points people to.
- `reprocess.js` duplicates the extension's analysis code (see
  [Read the analysis](analysis.md)).

## Where it lives

Checked at: `77ddeb8`

- `scripts/analyze.js`
- `scripts/compare.html`
- `scripts/reprocess.js`
