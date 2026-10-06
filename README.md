# Momus — Google Maps Review Analyzer

A Firefox and Chrome extension that scrapes and analyzes Google Maps reviews for apartment hunting and location research. Momus scrapes every review from a location, flags fake-review patterns and red flags, and, once you've gathered several locations, ranks them side by side with the included `scripts/analyze.js` script and `scripts/compare.html` dashboard.

## Features

- **Complete Review Scraping**: Automatically scrolls and loads all reviews from a Google Maps location page
- **Fake Review Detection**: Calculates a "suspicion score" based on bimodal distribution (lots of 5-star and 1-star, few middle reviews)
- **Spelling Error Analysis**: Uses Typo.js to count spelling errors in reviews by rating (fake reviews often have more errors in 5-star reviews)
- **Red Flag Detection**: Automatically flags reviews mentioning pests, mold, crime, management issues, noise, and other problems
- **Bulk Scrape**: Paste several place URLs and the extension scrapes each in turn, downloading a JSON file per location
- **JSON Export**: Download the complete data as JSON
- **Summary Copy**: Quick copy-paste summary of key stats for easy comparison

## Installation

### Option 1: Load Temporarily (for testing)

**Firefox**

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Navigate to the extension folder and select `manifest.json`
6. The extension will be loaded until you restart Firefox

**Chrome**

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select the repository folder

Chrome loads an unpacked directory rather than a `.zip`; the built zip is for
Web Store submission.

### Option 2: Create a Distributable Package

Use the included build script. It validates `manifest.json`, then bundles only the
files the extension actually needs (excluding docs, dev scripts, `reviews/`,
`node_modules/`, and the analysis tooling):

```bash
./build.sh package
# or, equivalently:
npm run build
```

The script uses the project's own copy of [`web-ext`](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
(installing it on first run) and writes a Firefox and a Chrome zip to `artifacts/`.

Then, to install the package in Firefox:

1. Go to `about:addons`
2. Click the gear icon and select "Install Add-on From File..."
3. Select the built `.zip`

**Note**: For permanent installation, the extension needs to be signed by Mozilla.

## Usage

1. Navigate to a Google Maps location page (e.g., an apartment complex)
2. Make sure you're on the place page (URL should contain `/maps/place/`)
3. Click the extension icon in your toolbar
4. Click "Scrape Reviews"
5. Wait for the scraping to complete (may take 30-60 seconds for locations with many reviews)
6. Review the statistics:
   - **Total Reviews**: Number of reviews scanned
   - **Average Rating**: Overall star rating
   - **2-4 Star Reviews**: Count of "middle" reviews (most informative)
   - **Suspicion Score**: 0-1 scale, higher = more suspicious distribution (0.8+ is very suspicious)
   - **Red Flags**: Keywords found and their counts
7. Click "Download as JSON" to save the full data
8. Click "Copy Summary" to get a quick text summary for pasting

## Understanding the Output

### Suspicion Score

The suspicion score indicates how "bimodal" the review distribution is:
- **0.0-0.3**: Natural distribution with plenty of middle reviews
- **0.4-0.7**: Somewhat suspicious, worth investigating
- **0.8-1.0**: Highly suspicious - very few middle reviews suggests potential fake review padding

### JSON Structure

```json
{
  "name": "Location Name",
  "address": "Full Address",
  "url": "https://www.google.com/maps/place/...",
  "scrapedAt": "2025-01-02T15:30:00.000Z",
  "stats": {
    "averageRating": 4.7,
    "totalReviews": 223,
    "distribution": {"5": 180, "4": 12, "3": 5, "2": 8, "1": 18},
    "googleKeywords": {"maintenance": 76, "team": 28}
  },
  "reviews": [
    {
      "rating": 2,
      "text": "Review text...",
      "date": "2 months ago",
      "author": "John D",
      "isLocalGuide": false,
      "spellingErrors": 3,
      "flaggedKeywords": ["management", "maintenance"]
    }
  ],
  "analysis": {
    "totalScraped": 223,
    "middleReviewCount": 25,
    "suspicionScore": 0.89,
    "spellingErrorsByRating": {"5": 0.3, "4": 1.1, "3": 2.4, "2": 2.9, "1": 3.2},
    "redFlagSummary": {"mold": 3, "roach": 2, "crime": 1},
    "filteredReviews": []
  }
}
```

## Red Flag Keywords

The extension searches for mentions of:
- **Pests**: roaches, bedbugs, mice, rats, ants, etc.
- **Structural Issues**: mold, leaks, flooding, water damage
- **Safety/Crime**: theft, break-ins, drugs, police calls
- **Management**: ignored requests, unresponsive, deposit issues
- **Noise**: thin walls, loud neighbors
- **Move-out Warnings**: "worst apartment", "don't rent", "regret"

## Google Keyword Analysis

The extension also analyzes **Google's highlighted keywords** to see if they're hiding problems:

When Google shows keywords like "maintenance" or "staff" on a location page, the extension checks:
- What percentage of reviews mentioning that keyword are ≤3★?
- What red flags appear alongside that keyword?
- Is the average rating for that keyword lower than the overall rating?

**Example warning:**
```
"maintenance" → 65% of reviews are ≤3★
Avg rating: 2.8 | 72% mention red flags: noise(12), broken(8), slow(5)
```

This helps identify when Google is highlighting keywords that actually correlate with negative experiences.

## Comparing Multiple Locations

Once you've scraped several apartments, use the included `scripts/analyze.js` script to create a ranked spreadsheet:

```bash
# Create a folder for your reviews
mkdir reviews
mv ~/Downloads/gmaps_*.json reviews/

# Run the analyzer
node scripts/analyze.js reviews apartment_rankings.csv
```

This outputs a CSV file with columns:
- **Rank**: 1, 2, 3, etc.
- **Score**: Weighted ranking (higher = better)
- **Name** & **Address**: Location details
- **Critical Flags**: Count of deal-breakers (bedbugs, roaches, crime) in middle reviews
- **Important Flags**: Count of concerns (noise, maintenance, pests) in middle reviews
- **Top Middle Flags**: Most-mentioned issues in 2-4 star reviews (most trustworthy)
- **Top All Flags**: Most-mentioned issues across all reviews
- **Suspicion Score**: Likelihood of fake reviews (lower = better)
- **Middle %**: Percentage of trustworthy reviews (higher = better)

### Customizing Weights

Edit `scripts/analyze.js` to adjust what matters to you:

```javascript
// Deal-breakers (high penalty)
const CRITICAL_FLAGS = {
  'bedbugs': 100,
  'roaches': 80,
  'crime': 80,
  // Add your own...
};

// Important concerns (moderate penalty)
const IMPORTANT_FLAGS = {
  'noise': 15,
  'thin walls': 20,
  'maintenance': 10,
  // Add your own...
};
```

Higher weights = worse penalty. The script focuses on **middle review red flags** since those are most trustworthy.

### Visual Comparison Dashboard

After scraping several apartments, use the comparison dashboard for side-by-side visual analysis:

1. Open `scripts/compare.html` in your browser
2. Click "Load JSON Files" and select all files from the `reviews/` folder
3. Compare apartments side-by-side with these insights:
   - **Jaggedness Score**: Measures how U-shaped the star distribution is (lower = more natural)
   - **Keywords**: See which topics have positive vs negative sentiment
   - **Distribution Chart**: Visual representation of 1★→5★ review counts
   - **Critical Flags**: Count of deal-breakers (bedbugs, roaches, crime)

**Reading the Results:**
- **Green jaggedness** (< 3.0): Smooth curve indicating natural review distribution
- **Yellow jaggedness** (3.0-6.0): Moderate irregularity, worth investigating
- **Red jaggedness** (> 6.0): U-shaped distribution suggesting review manipulation
- **Keyword colors**: Green = mostly positive mentions (≥4★), Red = mostly negative mentions (≤3★)

**Sorting:**
Click any column header to sort by that metric. This helps you quickly find:
- Apartments with the lowest jaggedness (most authentic reviews)
- Best keyword sentiment scores
- Fewest critical flags

The dashboard uses **context-aware keyword analysis** - "no noise" is correctly identified as positive, not counted as a noise complaint.

## Troubleshooting

### "Not on a Google Maps place page"
Make sure your URL contains `/maps/place/`. Navigate to the location first, don't just search for it.

### "Could not find review container"
Click on the "Reviews" tab manually first, then run the scraper.

### No reviews found
Google may have changed their page structure. Check the browser console for errors and report them as an issue.

### Scraping stops early
If the extension doesn't load all reviews, try:
1. Manually scrolling the review panel first
2. Clicking "Reviews" tab to ensure it's active
3. Disabling browser extensions that modify Google Maps

## Technical Details

### Technologies Used
- **Typo.js**: Spell checking library using Hunspell dictionaries
- **WebExtensions API**: For browser integration (Manifest V3, one manifest for both browsers)
- **Content Scripts**: Run on Google Maps pages to scrape data

### Limitations
- **Ranking happens outside the extension**: Bulk Scrape saves one JSON file per location; comparing them is done afterward with `scripts/analyze.js` / `scripts/compare.html` (see "Comparing Multiple Locations" above)
- **Client-side only**: No server backend, all processing in the browser
- **Google Maps only**: Doesn't scrape Yelp, ApartmentRatings, etc.
- **No date parsing**: Dates are stored as-is ("2 months ago") not converted to timestamps
- **Page structure dependent**: May break if Google updates their HTML structure

### Privacy
This extension:
- ✅ Runs entirely locally in your browser
- ✅ Does NOT send any data to external servers
- ✅ Does NOT track you or collect analytics
- ✅ Only activates on Google Maps pages
- ✅ Stores no persistent data (only during active scraping)

## Future Enhancements

Ideas for future versions:
- In-extension ranking of bulk scrapes, without the JSON export/import step
- Date parsing (convert relative dates to actual dates)
- Cross-platform aggregation (Yelp, etc.)
- Sentiment analysis
- Local storage of past scrapes

## Development

### File Structure
The extension's own source lives at the root (the manifest references it by path);
auxiliary tooling and docs live in `scripts/` and `docs/`.
```
momus/
├── manifest.json           # Extension manifest
├── background.js           # Background script
├── popup/                  # Extension popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                # Scripts that run on Google Maps
│   ├── content.js          # Main orchestrator
│   ├── scraper.js          # DOM parsing logic
│   └── keywords.js         # Red flag keyword list
├── lib/                    # Third-party libraries
│   └── typo.js
├── dictionaries/           # Spell check dictionaries
│   ├── en_US.dic
│   └── en_US.aff
├── icons/                  # Extension icons
├── scripts/                # Auxiliary tooling (not part of the extension)
│   ├── analyze.js          # Rank scraped locations into a CSV
│   ├── reprocess.js        # Re-run analysis on saved JSON
│   ├── compare.html        # Visual comparison dashboard
│   ├── setup-dev.sh        # Python dev-env setup (uv)
│   └── requirements.txt
├── docs/                   # Guides and notes
├── build.sh                # Build the extension package
└── release.sh              # Cut a GitHub release
```

### Making Changes

1. Run `./build.sh` (Firefox) or `./build.sh chrome`. It opens the browser on
   Google Maps with the extension loaded, in a fresh temporary profile.
2. Modify the relevant files; the extension reloads itself on save
3. Test on a Google Maps location page

### Debugging

- Open the browser console (F12) to see `[Content]` and `[Scraper]` log messages
- Check the popup console by right-clicking the extension icon → "Inspect"
- Use `console.log` liberally in development

## License

AGPL-3.0. See [LICENSE](LICENSE).

## Credits

- **Typo.js**: Christopher Finke (https://github.com/cfinke/Typo.js)
- **Hunspell Dictionaries**: Various contributors

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify you're on a valid Google Maps place page
3. Try manually clicking the Reviews tab first
4. Report issues with console logs and screenshots

---

**Disclaimer**: This tool is for personal research only. Respect Google's Terms of Service and don't abuse their infrastructure with excessive scraping.
