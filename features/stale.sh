#!/bin/bash
# stale.sh - List feature files whose code changed since they were last checked.
#
# Each feature file names its files under "## Where it lives" as backticked
# paths, and the commit it was checked at as "Checked at: `<sha>`". A feature
# is stale when any of those paths changed between that commit and HEAD.

cd "$(dirname "$0")/.." || exit 1

stale=0
for f in features/*.md; do
    [ "$f" = "features/README.md" ] && continue
    sha=$(sed -n 's/^Checked at: `\([0-9a-f]*\)`.*/\1/p' "$f")
    if [ -z "$sha" ]; then
        echo "⚠️  $f has no 'Checked at: \`<sha>\`' line. Add one under '## Where it lives'."
        stale=1; continue
    fi
    paths=$(sed -n '/^## Where it lives/,/^## /p' "$f" | grep '^- `' | sed 's/^- `\([^`]*\)`.*/\1/')
    changed=$(git diff --name-only "$sha" HEAD -- $paths)
    if [ -n "$changed" ]; then
        echo "$f (checked at $sha):"
        echo "$changed" | sed 's/^/    /'
        stale=1
    fi
done

[ "$stale" = 0 ] && echo "✅ All feature files are current."
exit $stale
