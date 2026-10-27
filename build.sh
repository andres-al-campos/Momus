#!/bin/bash
# build.sh - Run or package Momus (Google Maps Review Analyzer)
#
#   ./build.sh            Open Firefox on Google Maps with the extension loaded;
#                         it reloads itself whenever a source file changes.
#   ./build.sh chrome     Same, in Chrome.
#   ./build.sh package    Build the Firefox and Chrome zips into artifacts/.
#   ./build.sh check      Run every law in tests/ (rules a bug once broke).
#   ./build.sh check --drives  The same, plus the drives (none yet).
#
# Uses the project-local web-ext (a devDependency) via npx, so the build is
# identical on every machine regardless of what's installed globally.

set -e  # Exit on error

# Run from the project root (the directory this script lives in), so the build
# works no matter where it's invoked from.
cd "$(dirname "$0")"
# The pre-commit hook stamps the docs a commit changes (dev/hooks/stamp-docs.mjs).
git config core.hooksPath dev/hooks

MODE="${1:-firefox}"
case "$MODE" in
    firefox|chrome|package|check) ;;
    *)
        echo "❌ Unknown option '$MODE'."
        echo "   Use: ./build.sh (Firefox), ./build.sh chrome, ./build.sh package, or ./build.sh check"
        exit 1
        ;;
esac

if [ "$MODE" = "check" ]; then
    failed=0
    for law in tests/*.mjs; do
        node "$law" || failed=1
    done
    [ "$failed" = 0 ] || { echo "❌ A law failed. Each message above says what broke and how to fix it."; exit 1; }
    echo "✅ All laws hold."
    case "${2:-}" in
        "") ;;
        --drives) echo "No drives yet, so check --drives ran the same checks." ;;
        *) echo "❌ Unknown option '$2'. Use ./build.sh check or ./build.sh check --drives."; exit 1 ;;
    esac
    exit 0
fi

# web-ext is a devDependency; make sure node_modules is present before building.
if [ ! -x "node_modules/.bin/web-ext" ]; then
    echo "📦 Installing dependencies (web-ext)..."
    npm install
fi

if command -v jq &> /dev/null; then
    jq empty manifest.json || { echo "❌ manifest.json is not valid JSON. Fix the syntax error above, then re-run."; exit 1; }
fi

# The single list of things the extension does NOT ship. Both browser builds
# read from this, so the two packages cannot drift apart. In run mode it also
# keeps edits to these paths from triggering a reload.
EXCLUDES=(build.sh release.sh scripts/ docs/ tools/ .venv/ .gitignore artifacts/ reviews/ node_modules/ package.json package-lock.json .claude/ designs/ images/ dev/features/ tests/ plans/ AGENTS.md)

if [ "$MODE" = "firefox" ] || [ "$MODE" = "chrome" ]; then
    TARGET=firefox-desktop
    [ "$MODE" = "chrome" ] && TARGET=chromium
    # The watcher only honours absolute globs: docs/ becomes $PWD/docs/**.
    WATCH_IGNORED=()
    for p in "${EXCLUDES[@]}"; do
        [[ "$p" == */ ]] && WATCH_IGNORED+=("$PWD/${p}**") || WATCH_IGNORED+=("$PWD/$p")
    done
    echo "🚀 Opening $MODE with Momus loaded (auto-reloads on save; Ctrl+C to quit)..."
    # A fresh temporary profile each run, so Google's consent page may appear first.
    exec npx web-ext run --source-dir . --target "$TARGET" \
        --start-url "https://www.google.com/maps" \
        --watch-ignored "${WATCH_IGNORED[@]}"
fi

VERSION=$(jq -r .version manifest.json 2>/dev/null || echo "dev")

# Archive any previously-built zips into old_versions/ so artifacts/
# only ever holds the build we're about to make.
echo "🗄  Archiving previous builds to old_versions/..."
mkdir -p artifacts/old_versions
shopt -s nullglob
for zip in artifacts/*.zip; do
    mv "$zip" artifacts/old_versions/
    echo "   moved $(basename "$zip")"
done
shopt -u nullglob

echo "📦 Building with web-ext..."

# One MV3 manifest serves both browsers: Firefox honours browser_specific_settings,
# Chrome ignores it. So the two zips have identical contents and differ in name only.
npx web-ext build --source-dir . --artifacts-dir artifacts --overwrite-dest \
    --filename "momus-${VERSION}-firefox.zip" \
    --ignore-files "${EXCLUDES[@]}"

npx web-ext build --source-dir . --artifacts-dir artifacts --overwrite-dest \
    --filename "momus-${VERSION}-chrome.zip" \
    --ignore-files "${EXCLUDES[@]}"

echo ""
echo "✅ Build complete!"
ls -lh "artifacts/momus-${VERSION}-firefox.zip" "artifacts/momus-${VERSION}-chrome.zip"
