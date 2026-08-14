#!/bin/bash
# build.sh - Build Momus (Google Maps Review Analyzer) extension
#
# Uses the project-local web-ext (a devDependency) via npx, so the build is
# identical on every machine regardless of what's installed globally.

set -e  # Exit on error

# Run from the project root (the directory this script lives in), so the build
# works no matter where it's invoked from.
cd "$(dirname "$0")"

echo "🔍 Checking dependencies..."

# web-ext is a devDependency; make sure node_modules is present before building.
if [ ! -x "node_modules/.bin/web-ext" ]; then
    echo "📦 Installing dependencies (web-ext)..."
    npm install
fi

echo ""
echo "✅ Validating manifest.json..."
if ! command -v jq &> /dev/null; then
    echo "   (jq not installed, skipping JSON validation)"
else
    jq empty manifest.json && echo "   ✓ manifest.json is valid JSON"
fi

echo ""
echo "📊 Checking file sizes..."
echo "   Total size:      $(du -sh . | cut -f1)"
echo "   Dictionary size: $(du -sh dictionaries | cut -f1)"

VERSION=$(jq -r .version manifest.json 2>/dev/null || echo "dev")

# The single list of things the extension does NOT ship. Both browser builds
# read from this, so the two packages cannot drift apart.
EXCLUDES=(build.sh release.sh scripts/ docs/ tools/ .venv/ .gitignore artifacts/ reviews/ node_modules/ package.json package-lock.json .claude/)

echo ""
echo "📦 Building with web-ext..."
mkdir -p artifacts

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

echo ""
echo "📋 Installation instructions:"
echo ""
echo "   Firefox (this directory, for development):"
echo "   1. Go to about:debugging → 'This Firefox'"
echo "   2. Click 'Load Temporary Add-on' and select manifest.json"
echo ""
echo "   Firefox (the built package):"
echo "   1. Go to about:addons → gear icon"
echo "   2. Select 'Install Add-on From File'"
echo "   3. Choose artifacts/momus-${VERSION}-firefox.zip"
echo ""
echo "   Chrome:"
echo "   1. Go to chrome://extensions and enable 'Developer mode'"
echo "   2. Click 'Load unpacked' and select this directory"
echo "      (Chrome loads an unpacked folder, not the .zip - the zip is for"
echo "       Web Store submission.)"
