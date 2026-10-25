# Testing Checklist

Use this checklist to verify the extension works correctly.

## Initial Setup

- [ ] Extension loads without errors in `about:debugging`
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] Popup shows "Ready" status

## Basic Functionality

### Test on a typical apartment complex:

1. Navigate to: https://www.google.com/maps/place/The+Preserve+at+Rolling+Oaks
   (or any apartment complex with 100+ reviews)

- [ ] Extension popup opens
- [ ] "Scrape Reviews" button is enabled
- [ ] Status shows "Ready"

2. Click "Scrape Reviews"

- [ ] Status changes to "Scraping reviews..."
- [ ] Button becomes disabled during scraping
- [ ] Reviews tab is automatically clicked (if not already active)
- [ ] Review panel scrolls to load all reviews

3. Wait for completion (30-60 seconds)

- [ ] Status changes to "Scraping complete!"
- [ ] Results section appears
- [ ] Stats are populated:
  - Total Reviews shows a number
  - Average Rating shows a decimal (e.g., 4.7)
  - 2-4 Star Reviews shows a count
  - Suspicion Score shows a decimal (0.00-1.00)
- [ ] Red flags section shows detected keywords
- [ ] "Download as JSON" button becomes enabled
- [ ] "Copy Summary" button becomes enabled

## Data Quality

### Check the scraped data:

- [ ] Total reviews matches Google's count (approximately)
- [ ] Average rating matches Google's rating
- [ ] Rating distribution adds up correctly

### Verify reviews were expanded:

- [ ] Long review texts are complete (not truncated with "...")
- [ ] All "More" buttons were clicked automatically

### Test spelling error detection:

- [ ] 5-star reviews typically have fewer spelling errors
- [ ] Lower-rated reviews may have more errors
- [ ] Spelling error counts are reasonable (not 0 for all reviews)

### Test red flag detection:

- [ ] Search for "roach" in actual reviews - extension should flag it
- [ ] Reviews mentioning "mold" should appear in redFlagSummary
- [ ] Keywords are case-insensitive

## Export Features

### Test JSON download:

1. Click "Download as JSON"
- [ ] File download dialog appears
- [ ] Filename format: `gmaps_location_name_2025-01-02.json`
- [ ] JSON is valid (can be opened in text editor)
- [ ] Contains all expected fields (name, address, url, stats, reviews, analysis)


### Test summary copy:

1. Click "Copy Summary"
- [ ] Button text changes to "Copied!" briefly
- [ ] Can paste summary into another app
- [ ] Summary is formatted correctly with stats and red flags

## Edge Cases

### Test with location that has few reviews:

Navigate to a location with < 10 reviews
- [ ] Extension handles it gracefully
- [ ] No errors in console
- [ ] Stats are accurate
- [ ] Suspicion score is reasonable

### Test with location that has no reviews:

Navigate to a brand new location with 0 reviews
- [ ] Extension shows appropriate error or handles gracefully
- [ ] Doesn't crash

### Test with non-place page:

1. Navigate to Google Maps home page (not a specific place)
2. Try to scrape
- [ ] Error message: "Not on a Google Maps place page"

### Test with different types of locations:

- [ ] Works on apartment complexes
- [ ] Works on restaurants
- [ ] Works on stores
- [ ] Works on parks

## Performance

- [ ] Scraping 100 reviews takes < 1 minute
- [ ] Scraping 500 reviews completes (may take 2-3 minutes)
- [ ] Browser remains responsive during scraping
- [ ] No memory leaks (check in Task Manager)

## Console Logs

Check browser console during scraping:
- [ ] No JavaScript errors
- [ ] See `[Content]` log messages showing progress
- [ ] See `[Scraper]` log messages about scroll attempts
- [ ] Final log shows "Scrape complete!"

## Error Handling

### Test error scenarios:

1. Click extension on non-Google Maps page
- [ ] Shows appropriate error

2. Click extension on Google Maps search results
- [ ] Shows "Not on a Google Maps place page"

3. Close popup during scraping
- [ ] Scraping continues in background (optional test)

## Browser Compatibility

- [ ] Works in Firefox (primary target)
- [ ] Works in Chrome
- [ ] Export produces a valid JSON file in both browsers (the download path
      differs most between them - Chrome's service worker has no blob URLs)
- [ ] Export of reviews containing accents/CJK decodes correctly
- [ ] No errors in console
- [ ] UI renders correctly

## Visual/UI Check

### Popup appearance:

- [ ] Text is readable
- [ ] Colors are appropriate (green for ready, yellow for scraping, etc.)
- [ ] Stats grid layout is clean
- [ ] Red flags section is visually distinct
- [ ] Buttons are properly sized and aligned

### Responsive checks:

- [ ] Popup width is appropriate (not too narrow or wide)
- [ ] All content is visible without scrolling
- [ ] Long location names don't break layout

## Data Accuracy Verification

### Manual spot check:

1. After scraping, manually check a few reviews on Google Maps
2. Verify the extension captured:
- [ ] Correct star rating
- [ ] Complete review text
- [ ] Correct author name
- [ ] Relative date ("2 months ago")
- [ ] Local Guide badge status

### Distribution check:

1. Compare extension's star distribution to Google's histogram
- [ ] 5-star count matches
- [ ] 4-star count matches
- [ ] 3-star count matches
- [ ] 2-star count matches
- [ ] 1-star count matches

## Known Limitations

These are expected behaviors (not bugs):

- [ ] Dates are relative ("2 months ago") not absolute
- [ ] Google Keywords section may miss some if not visible
- [ ] Very long reviews might still be truncated in rare cases
- [ ] Spelling errors include proper nouns and technical terms

---

## Bug Report Template

If you find a bug, report it with:

```
**Browser**: Firefox [version]
**Extension Version**: 1.0
**Location URL**: [Google Maps URL]
**Expected**: [what should happen]
**Actual**: [what actually happened]
**Console Logs**: [paste any errors]
**Steps to Reproduce**:
1.
2.
3.
```

---

## Test Results

Date: __________
Tester: __________

Overall Status: ⬜ PASS ⬜ FAIL

Critical Issues Found: __________

Notes:
