#!/bin/bash
# release.sh - Cut a GitHub Release for the current version.
#
# Builds the extension, then publishes the built package as a GitHub Release
# tagged from the version in manifest.json. Run after bumping that version.
#
# Flow:  bump "version" in manifest.json  ->  ./release.sh

set -euo pipefail

# Run from the project root (where this script lives).
cd "$(dirname "$0")"

# --- Version (single source of truth: manifest.json) ---------------------------
VERSION=$(jq -r .version manifest.json)
TAG="v$VERSION"
echo "📦 Preparing release $TAG"

# --- Preconditions -------------------------------------------------------------
command -v gh >/dev/null || { echo "❌ gh not installed. Install: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "❌ Not logged in to gh. Run: gh auth login"; exit 1; }

# Working tree must be clean — a release should reflect committed code, not
# whatever happens to be sitting in your editor.
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working tree has uncommitted changes."
    echo "   Commit (or stash) everything, then re-run. A release must match what's on GitHub."
    git status --short
    exit 1
fi

# Local branch must be pushed — otherwise the release tag points at history
# nobody else can see.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch -q origin "$BRANCH" 2>/dev/null || true
if [ -n "$(git log "origin/$BRANCH..HEAD" --oneline 2>/dev/null)" ]; then
    echo "❌ You have commits that aren't pushed to origin/$BRANCH."
    echo "   Run: git push   then re-run this script."
    exit 1
fi

# Don't clobber an existing release — bumping the version is intentional.
if gh release view "$TAG" >/dev/null 2>&1; then
    echo "❌ Release $TAG already exists."
    echo "   Bump \"version\" in manifest.json (and package.json) to cut a new release."
    exit 1
fi

# --- Build ---------------------------------------------------------------------
echo "🔨 Building..."
./build.sh >/dev/null
# Attach both browser packages. Picking just the newest zip would silently
# ship one browser and drop the other.
FIREFOX_ZIP="artifacts/momus-${VERSION}-firefox.zip"
CHROME_ZIP="artifacts/momus-${VERSION}-chrome.zip"
for ZIP in "$FIREFOX_ZIP" "$CHROME_ZIP"; do
    [ -f "$ZIP" ] || { echo "❌ Missing build artifact $ZIP. Did build.sh succeed?"; exit 1; }
    echo "   Built: $ZIP"
done

# --- Release -------------------------------------------------------------------
# --generate-notes auto-writes notes from commits since the previous release.
echo "🚀 Creating GitHub release $TAG..."
gh release create "$TAG" "$FIREFOX_ZIP" "$CHROME_ZIP" \
    --title "Momus $VERSION" \
    --generate-notes

echo ""
echo "✅ Released $TAG"
gh release view "$TAG" --web >/dev/null 2>&1 &
