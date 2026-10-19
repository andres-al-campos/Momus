// Main content script orchestrator

// Dictionary instance
let dictionary = null;

/**
 * Initialize Typo.js dictionary
 */
async function initDictionary() {
  if (dictionary) return dictionary;

  console.log('[Content] Loading dictionary...');

  try {
    // Load dictionary files
    const dicUrl = browser.runtime.getURL('dictionaries/en_US.dic');
    const affUrl = browser.runtime.getURL('dictionaries/en_US.aff');

    const [dicData, affData] = await Promise.all([
      fetch(dicUrl).then(r => r.text()),
      fetch(affUrl).then(r => r.text())
    ]);

    // Typo comes from lib/typo.js, loaded as a content script by the manifest.
    // Injecting it as a <script> tag runs it in the page's world, where this
    // isolated content script can't see `Typo`; every review then scored 0
    // spelling errors without anyone noticing.
    dictionary = new Typo('en_US', affData, dicData);
    console.log('[Content] Dictionary loaded successfully');

    return dictionary;
  } catch (error) {
    console.error('[Content] Spell checker failed to load, so every review will show 0 spelling errors. ' +
      'Check that manifest.json lists lib/typo.js in content_scripts before content/content.js, ' +
      'and that dictionaries/* is in web_accessible_resources.', error);
    // Return a stub that always returns 0 errors
    return {
      check: () => true
    };
  }
}

/**
 * Ensures the Reviews tab is open
 */
async function ensureReviewsTabOpen() {
  console.log('[Content] Checking for Reviews tab...');

  // Find ALL buttons matching reviews pattern, then take the last one
  // When two panes exist (search results + place detail), the detail pane appears later in DOM
  const allReviewsTabs = Array.from(document.querySelectorAll('button'))
    .filter(btn => {
      const span = btn.querySelector('span');
      return span && /\d+\s*reviews?/i.test(span.textContent) && btn.offsetParent !== null;
    });

  // Use the last match (detail pane appears after search results in DOM)
  const reviewsTab = allReviewsTabs[allReviewsTabs.length - 1];

  if (reviewsTab) {
    console.log(`[Content] Found ${allReviewsTabs.length} Reviews tab(s), clicking last one...`);
    reviewsTab.click();
    await sleep(1500); // Wait for tab to load
  } else {
    console.log('[Content] Reviews tab not found, assuming reviews are visible');
  }

  // Wait for reviews to actually appear (not just container)
  console.log('[Content] Waiting for reviews to load...');
  for (let i = 0; i < 20; i++) { // Try for up to 10 seconds
    const reviewElements = document.querySelectorAll('div.jftiEf[data-review-id]');
    if (reviewElements.length > 0) {
      console.log(`[Content] Found ${reviewElements.length} review elements`);
      return;
    }
    await sleep(500);
  }

  console.warn('[Content] No reviews loaded after waiting - will try to continue anyway');
}

/**
 * Count words in a text string
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate coefficient of variation (std / mean)
 */
function coefficientOfVariation(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  return standardDeviation(values) / mean;
}

/**
 * Check if a date string represents a recent review (< 1 year)
 */
function isRecentDate(dateStr) {
  if (!dateStr) return false;
  const lower = dateStr.toLowerCase();
  // Recent: days, weeks, months (up to 11 months)
  if (/\d+\s*(day|week|month)s?\s*ago/.test(lower)) {
    // Check it's not "12 months ago" or more
    const monthMatch = lower.match(/(\d+)\s*months?\s*ago/);
    if (monthMatch && parseInt(monthMatch[1]) >= 12) {
      return false;
    }
    return true;
  }
  // "a day ago", "a week ago", "a month ago"
  if (/^a\s+(day|week|month)\s+ago$/.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Calculates analysis metrics for a set of reviews
 */
function calculateReviewSetAnalysis(reviews, totalReviewCount) {
  // Spelling errors by rating
  const spellingErrorsByRating = {};
  // Word count by rating
  const wordCountByRating = {};
  const ratingsPresent = [...new Set(reviews.map(r => r.rating))];

  ratingsPresent.forEach(stars => {
    const ratingReviews = reviews.filter(r => r.rating === stars);
    if (ratingReviews.length > 0) {
      const totalErrors = ratingReviews.reduce((sum, r) => sum + r.spellingErrors, 0);
      spellingErrorsByRating[stars] = +(totalErrors / ratingReviews.length).toFixed(2);

      const totalWords = ratingReviews.reduce((sum, r) => sum + countWords(r.text), 0);
      wordCountByRating[stars] = +(totalWords / ratingReviews.length).toFixed(1);
    }
  });

  // Red flag summary
  const redFlagSummary = {};
  reviews.forEach(review => {
    review.flaggedKeywords.forEach(keyword => {
      redFlagSummary[keyword] = (redFlagSummary[keyword] || 0) + 1;
    });
  });

  // Calculate percentage of total
  const percentageOfTotal = totalReviewCount > 0
    ? +((reviews.length / totalReviewCount) * 100).toFixed(1)
    : 0;

  // Average word count across all reviews in this set
  const avgWordCount = reviews.length > 0
    ? +(reviews.reduce((sum, r) => sum + countWords(r.text), 0) / reviews.length).toFixed(1)
    : 0;

  return {
    reviewCount: reviews.length,
    percentageOfTotal: percentageOfTotal,
    avgSpellingErrors: reviews.length > 0
      ? +(reviews.reduce((sum, r) => sum + r.spellingErrors, 0) / reviews.length).toFixed(2)
      : 0,
    spellingErrorsByRating,
    avgWordCount,
    wordCountByRating,
    redFlagSummary
  };
}

/**
 * Calculate clustering metrics for reviews of a specific rating
 * Returns coefficient of variation - higher = more clustered/suspicious
 */
function calculateRatingClustering(reviews, targetRating) {
  const targetReviews = reviews.filter(r => r.rating === targetRating);

  if (targetReviews.length < 3) {
    return { cv: 0, totalCount: targetReviews.length, dateCount: 0 };
  }

  // Group by date string
  const byDate = {};
  targetReviews.forEach(r => {
    const date = r.date || 'unknown';
    byDate[date] = (byDate[date] || 0) + 1;
  });

  const counts = Object.values(byDate);
  const cv = coefficientOfVariation(counts);

  return {
    cv: +cv.toFixed(2),
    totalCount: targetReviews.length,
    dateCount: counts.length
  };
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get word variations for keyword matching
 * Only safe expansion: noun ending in 'e' → adjective ending in 'y'
 * e.g., noise → [noise, noisy], smoke → [smoke, smoky]
 * Avoids problematic expansions like park → parking
 */
function getWordVariations(keyword) {
  const kw = keyword.toLowerCase();
  const variations = [kw];

  // Skip short words and certain endings that shouldn't be expanded
  if (kw.length < 4) return variations;
  if (kw.endsWith('ing') || kw.endsWith('ity') || kw.endsWith('ies') || kw.endsWith('ly')) {
    return variations;
  }

  // Noun ending in 'e' → adjective ending in 'y' (noise → noisy)
  if (kw.endsWith('e')) {
    variations.push(kw.slice(0, -1) + 'y');
  }

  return variations;
}

/**
 * Check if text contains keyword or its variations
 * Matches word boundaries to avoid partial matches
 */
function textMatchesKeyword(text, keyword) {
  const variations = getWordVariations(keyword);
  const lowerText = text.toLowerCase();
  return variations.some(v => new RegExp(`\\b${escapeRegex(v)}\\b`, 'i').test(lowerText));
}

/**
 * Analyzes correlation between Google's keywords and review quality
 * For each Google keyword, checks if reviews mentioning it have problems
 * Matches keyword variations (noise/noisy) to align with Google's grouping
 */
function analyzeGoogleKeywordCorrelation(reviews, googleKeywords) {
  if (!googleKeywords || Object.keys(googleKeywords).length === 0) {
    return null;
  }

  const correlations = {};

  Object.keys(googleKeywords).forEach(keyword => {
    try {
      // Find reviews that mention this keyword or its variations (e.g., noise/noisy)
      const matchingReviews = reviews.filter(r =>
        textMatchesKeyword(r.text, keyword)
      );

      if (matchingReviews.length === 0) {
        return; // Skip keywords with no matches in scraped reviews
      }

    // Calculate metrics for reviews mentioning this keyword
    const lowRatingCount = matchingReviews.filter(r => r.rating <= 3).length;
    const lowRatingPct = (lowRatingCount / matchingReviews.length) * 100;

    const avgRating = matchingReviews.reduce((sum, r) => sum + r.rating, 0) / matchingReviews.length;

    // Calculate 1-star percentage to detect fake 1-star campaigns
    const oneStarCount = matchingReviews.filter(r => r.rating === 1).length;
    const oneStarPct = matchingReviews.length > 0
      ? ((oneStarCount / matchingReviews.length) * 100).toFixed(1)
      : 0;

    // Count red flags from ALL reviews mentioning this keyword
    // This shows what concerns people mention even in positive reviews
    const withRedFlags = matchingReviews.filter(r => r.flaggedKeywords.length > 0).length;

    // Red flag percentage = (reviews with flags) / (all keyword reviews) × 100
    const redFlagPct = matchingReviews.length > 0
      ? (withRedFlags / matchingReviews.length) * 100
      : 0;

    // Count red flag occurrences from ALL reviews
    const redFlagCounts = {};
    matchingReviews.forEach(r => {
      if (r.flaggedKeywords) {
        r.flaggedKeywords.forEach(flag => {
          redFlagCounts[flag] = (redFlagCounts[flag] || 0) + 1;
        });
      }
    });

    const topRedFlags = Object.entries(redFlagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([flag, count]) => ({ flag, count }));

    correlations[keyword] = {
      reviewCount: matchingReviews.length,
      avgRating: +avgRating.toFixed(2),
      lowRatingCount,
      lowRatingPct: +lowRatingPct.toFixed(1),
      oneStarPct: +oneStarPct,
      withRedFlagsCount: withRedFlags,
      redFlagPct: +redFlagPct.toFixed(1),
      topRedFlags
    };
    } catch (error) {
      console.warn(`[Content] Failed to analyze keyword "${keyword}":`, error);
      // Skip this keyword and continue with others
    }
  });

  return correlations;
}

/**
 * Calculates three-way analysis: all, middle (2-4 stars), extreme (1 & 5 stars)
 */
function calculateAnalysis(reviews, distribution, googleKeywords) {
  // Split reviews into groups
  const middleReviews = reviews.filter(r => r.rating >= 2 && r.rating <= 4);
  const extremeReviews = reviews.filter(r => r.rating === 1 || r.rating === 5);
  const negativeReviews = reviews.filter(r => r.rating <= 3);
  const totalCount = reviews.length;

  // Extreme review percentage: what portion of reviews are 1 or 5 stars
  // (1 - middle reviews / total reviews)
  const extremeReviewPct = totalCount > 0
    ? 1 - (middleReviews.length / totalCount)
    : 0;

  // Clustering analysis for all star ratings
  const recentReviews = reviews.filter(r => isRecentDate(r.date));
  const fiveStarClustering = {
    recent: calculateRatingClustering(recentReviews, 5),
    allTime: calculateRatingClustering(reviews, 5)
  };
  const fourStarClustering = {
    recent: calculateRatingClustering(recentReviews, 4),
    allTime: calculateRatingClustering(reviews, 4)
  };
  const threeStarClustering = {
    recent: calculateRatingClustering(recentReviews, 3),
    allTime: calculateRatingClustering(reviews, 3)
  };
  const twoStarClustering = {
    recent: calculateRatingClustering(recentReviews, 2),
    allTime: calculateRatingClustering(reviews, 2)
  };
  const oneStarClustering = {
    recent: calculateRatingClustering(recentReviews, 1),
    allTime: calculateRatingClustering(reviews, 1)
  };

  // Google keyword correlation analysis
  const googleKeywordCorrelation = analyzeGoogleKeywordCorrelation(reviews, googleKeywords);

  // Calculate authenticity scores (lower = better)
  // Combines curve jaggedness with low-star review percentages
  const total = totalCount;
  const oneStarPct = ((distribution[1] || 0) / total) * 100;
  const twoStarPct = ((distribution[2] || 0) / total) * 100;
  const lowStarPct = oneStarPct + twoStarPct;

  // Calculate curve jaggedness (standard deviation of consecutive ratios)
  const count1 = distribution[1] || 0;
  const count2 = distribution[2] || 0;
  const count3 = distribution[3] || 0;
  const count4 = distribution[4] || 0;
  const count5 = distribution[5] || 0;

  const ratios = [
    count1 > 0 ? count2 / count1 : 0,
    count2 > 0 ? count3 / count2 : 0,
    count3 > 0 ? count4 / count3 : 0,
    count4 > 0 ? count5 / count4 : 0
  ].filter(r => r > 0);

  let curveJaggedness = null;
  if (ratios.length >= 3) {
    const mean = ratios.reduce((a, b) => a + b) / ratios.length;
    const variance = ratios.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / ratios.length;
    curveJaggedness = Math.sqrt(variance);
  }

  // Invert scores so higher = better (using 100/score)
  const distributionScore = 100 / curveJaggedness;
  const authenticityScore = 100 / (curveJaggedness * twoStarPct);

  const authenticityScores = curveJaggedness !== null ? {
    distributionScore: distributionScore.toFixed(1),
    authenticityScore: twoStarPct > 0 ? authenticityScore.toFixed(1) : 'N/A',
    curveJaggedness: curveJaggedness.toFixed(2),
    oneStarPct: oneStarPct.toFixed(1),
    twoStarPct: twoStarPct.toFixed(1)
  } : null;

  return {
    extremeReviewPct: +extremeReviewPct.toFixed(2),
    fiveStarClustering,
    fourStarClustering,
    threeStarClustering,
    twoStarClustering,
    oneStarClustering,
    googleKeywordCorrelation,
    authenticityScores,
    all: {
      note: "Analysis of all reviews (1-5 stars)",
      ...calculateReviewSetAnalysis(reviews, totalCount)
    },
    middle: {
      note: "Analysis of 2-4 star reviews (most trustworthy)",
      ...calculateReviewSetAnalysis(middleReviews, totalCount)
    },
    extreme: {
      note: "Analysis of 1 & 5 star reviews (potentially fake)",
      ...calculateReviewSetAnalysis(extremeReviews, totalCount)
    },
    negative: {
      note: "Analysis of ≤3 star reviews",
      ...calculateReviewSetAnalysis(negativeReviews, totalCount)
    }
  };
}

/**
 * Main scraping function
 */
async function performScrape(options = {}) {
  const { sortOrder = 'relevant', maxReviews = 0 } = options;

  console.log('[Content] Starting scrape...', { sortOrder, maxReviews });

  // 1. Check we're on a Google Maps place page
  if (!window.location.href.includes('/maps/place/')) {
    throw new Error('Not on a Google Maps place page. Please navigate to a location first.');
  }

  // 2. Ensure Reviews tab is open
  await ensureReviewsTabOpen();

  // 3. Initialize dictionary for spell checking
  const dict = await initDictionary();

  // 4. Get location info
  const locationInfo = getLocationInfo();

  // 5. Get stats panel data
  const stats = getStatsFromPanel();

  // 6. Find the scrollable review container
  const reviewContainer = findReviewContainer();

  if (!reviewContainer) {
    throw new Error('Could not find review container. Make sure reviews are visible on the page.');
  }

  console.log('[Content] Found review container');

  // 7. Set sort order
  await setSortOrder(sortOrder);

  // 8. Scroll to load reviews (up to maxReviews limit)
  const expectedTotal = stats.totalReviews || 0;
  const targetCount = maxReviews > 0 ? Math.min(maxReviews, expectedTotal) : expectedTotal;
  const totalLoaded = await scrollToLoadAllReviews(reviewContainer, maxReviews, expectedTotal);
  console.log(`[Content] Loaded ${totalLoaded} reviews total (expected: ${expectedTotal})`);

  // Notify popup that loading is done, analysis starting
  browser.runtime.sendMessage({
    action: 'scrapeAnalyzing',
    count: totalLoaded
  });

  // 9. Expand all "More" buttons
  await expandAllReviews();

  // 10. Parse all reviews
  const rawReviews = parseAllReviews();

  if (rawReviews.length === 0) {
    throw new Error('No reviews found. The page structure might have changed.');
  }

  console.log(`[Content] Parsed ${rawReviews.length} reviews`);

  // 10. Enrich reviews with spelling errors and flagged keywords
  const reviews = rawReviews.map(review => ({
    ...review,
    spellingErrors: countSpellingErrors(review.text, dict),
    flaggedKeywords: findFlaggedKeywords(review.text)
  }));

  // 11. Calculate analysis
  const analysis = calculateAnalysis(reviews, stats.distribution, stats.googleKeywords);

  // 12. Assemble final output
  const result = {
    ...locationInfo,
    scrapedAt: new Date().toISOString(),
    scrapeOptions: { sortOrder, maxReviews },
    stats,
    reviews,
    analysis
  };

  console.log('[Content] Scrape complete!', result);

  return result;
}

// Listen for messages from popup
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'scrape') {
    try {
      const data = await performScrape(message.options || {});

      // Scroll the review container back to top (use findReviewContainer for correct pane)
      const reviewContainer = findReviewContainer();
      if (reviewContainer) {
        reviewContainer.scrollTop = 0;
      }

      browser.runtime.sendMessage({ action: 'scrapeComplete', data });
    } catch (error) {
      console.error('[Content] Scrape error:', error);
      browser.runtime.sendMessage({ action: 'scrapeError', error: error.message });
    }
  }
});

console.log('[Content] Momus loaded and ready');
