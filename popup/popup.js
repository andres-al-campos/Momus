// Chrome exposes `chrome`, Firefox exposes `browser`.
const browser = globalThis.browser ?? globalThis.chrome;

// Store scraped data
let scrapedData = null;
let bulkScrapeQueue = [];
let bulkScrapeIndex = 0;
let isBulkScraping = false;

// DOM elements
const scrapeBtn = document.getElementById('scrapeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const sortOrderSelect = document.getElementById('sortOrder');
const maxReviewsSelect = document.getElementById('maxReviews');

// Bulk scrape elements
const bulkScrapeToggle = document.getElementById('bulkScrapeToggle');
const bulkScrapeContainer = document.getElementById('bulkScrapeContainer');
const bulkUrlsTextarea = document.getElementById('bulkUrls');
const startBulkBtn = document.getElementById('startBulkBtn');
const cancelBulkBtn = document.getElementById('cancelBulkBtn');
const bulkProgressEl = document.getElementById('bulkProgress');
const bulkProgressText = document.getElementById('bulkProgressText');
const bulkProgressBar = document.getElementById('bulkProgressBar');

// Load saved data and settings on popup open
browser.storage.local.get(['lastScrapeData', 'sortOrder', 'maxReviews']).then(result => {
  if (result.lastScrapeData) {
    scrapedData = result.lastScrapeData;
    displayResults(scrapedData);
    setStatus('complete', 'Data loaded from previous scrape');
    downloadBtn.disabled = false;
    copyBtn.disabled = false;
  }
  // Restore saved settings
  if (result.sortOrder) {
    sortOrderSelect.value = result.sortOrder;
  }
  if (result.maxReviews) {
    maxReviewsSelect.value = result.maxReviews;
  }
});

// Save settings when changed
sortOrderSelect.addEventListener('change', () => {
  browser.storage.local.set({ sortOrder: sortOrderSelect.value });
});
maxReviewsSelect.addEventListener('change', () => {
  browser.storage.local.set({ maxReviews: maxReviewsSelect.value });
});

// Event listeners
scrapeBtn.addEventListener('click', handleScrapeClick);
downloadBtn.addEventListener('click', handleDownloadClick);
bulkScrapeToggle.addEventListener('click', toggleBulkScrape);
startBulkBtn.addEventListener('click', startBulkScrape);
cancelBulkBtn.addEventListener('click', cancelBulkScrape);

// Listen for messages from content script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'scrapeProgress') {
    // Update status with review count during scrolling
    setStatus('scraping', `Loaded ${message.count} reviews...`);
  } else if (message.action === 'scrapeAnalyzing') {
    // Update status when scrolling done, analysis starting
    setStatus('scraping', `Analyzing ${message.count} reviews...`);
  } else if (message.action === 'scrapeComplete') {
    scrapedData = message.data;

    // Save to storage so it persists when popup closes
    browser.storage.local.set({ lastScrapeData: scrapedData });

    displayResults(scrapedData);

    setStatus('complete', 'Scraping complete! Downloading...');
    downloadBtn.disabled = false;
    copyBtn.disabled = false;
    scrapeBtn.disabled = false;
    bulkScrapeToggle.disabled = false;

    // Auto-download the JSON file
    setTimeout(() => {
      handleDownloadClick(true); // Pass true for auto-download
    }, 500);
  } else if (message.action === 'scrapeError') {
    handleScrapeError(message.error);
  }
});

// Track retry attempts
let scrapeRetryCount = 0;
const MAX_SCRAPE_RETRIES = 3;

async function handleScrapeClick() {
  try {
    scrapeBtn.disabled = true;
    bulkScrapeToggle.disabled = true;
    downloadBtn.disabled = true;
    copyBtn.disabled = true;
    resultsEl.hidden = true;
    setStatus('scanning', 'Scanning reviews...');

    // Reset retry count on manual click
    scrapeRetryCount = 0;

    // Get active tab and send message to content script
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });

    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }

    const options = {
      sortOrder: sortOrderSelect.value,
      maxReviews: parseInt(maxReviewsSelect.value) || 0
    };

    await browser.tabs.sendMessage(tabs[0].id, { action: 'scrape', options });

  } catch (error) {
    setStatus('error', `Error: ${error.message}`);
    scrapeBtn.disabled = false;
  }
}

async function handleScrapeError(errorMessage) {
  console.log('[Popup] Scrape error:', errorMessage, 'Retry count:', scrapeRetryCount);

  // Check if this is a "no reviews found" or container error that might be fixed by reload
  const shouldRetry = (
    errorMessage.includes('Could not find review container') ||
    errorMessage.includes('No reviews found') ||
    errorMessage.includes('reviews to load')
  );

  if (shouldRetry && scrapeRetryCount < MAX_SCRAPE_RETRIES) {
    scrapeRetryCount++;
    setStatus('warning', `Retrying... (attempt ${scrapeRetryCount + 1}/${MAX_SCRAPE_RETRIES + 1})`);

    try {
      // Get active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }

      // Reload the page
      await browser.tabs.reload(tabs[0].id);

      // Wait for page to reload (2 seconds)
      await sleep(2000);

      // Retry the scrape
      const options = {
        sortOrder: sortOrderSelect.value,
        maxReviews: parseInt(maxReviewsSelect.value) || 0
      };

      await browser.tabs.sendMessage(tabs[0].id, { action: 'scrape', options });
    } catch (retryError) {
      setStatus('error', `Retry failed: ${retryError.message}`);
      scrapeBtn.disabled = false;
      bulkScrapeToggle.disabled = false;
      scrapeRetryCount = 0;
    }
  } else {
    // No retry or max retries reached
    const retryMsg = scrapeRetryCount >= MAX_SCRAPE_RETRIES ? ' (max retries reached)' : '';
    setStatus('error', `Error: ${errorMessage}${retryMsg}`);
    scrapeBtn.disabled = false;
    bulkScrapeToggle.disabled = false;
    scrapeRetryCount = 0;
  }
}

function handleDownloadClick(autoDownload = false) {
  if (!scrapedData) {
    console.log('[Popup] No data to download');
    return;
  }

  console.log('[Popup] Download button clicked, autoDownload:', autoDownload, 'isBulkScraping:', isBulkScraping);

  // Build the download structure with all three analyses
  const dataToDownload = {
    // Summary & Analysis (what you care about first)
    summary: {
      name: scrapedData.name,
      address: scrapedData.address,
      url: scrapedData.url,
      scrapedAt: scrapedData.scrapedAt,
      scrapeOptions: scrapedData.scrapeOptions
    },
    stats: scrapedData.stats,
    analysis: scrapedData.analysis,

    // Raw review data (at the bottom)
    reviews: scrapedData.reviews
  };

  // Extract location name from URL (e.g., /maps/place/The+Location+Name/)
  let locationName = 'location';
  try {
    const url = scrapedData.url || '';
    const match = url.match(/\/maps\/place\/([^\/\?]+)/);
    if (match && match[1]) {
      locationName = decodeURIComponent(match[1].replace(/\+/g, ' '))
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
    }
  } catch (e) {
    console.warn('[Popup] Failed to extract location name from URL:', e);
    locationName = scrapedData.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'location';
  }

  // No timestamp - this way old scans are overwritten by new ones
  const filename = `gmaps_${locationName}.json`;

  // Send to background script to handle download (survives popup closing)
  const jsonStr = JSON.stringify(dataToDownload, null, 2);
  console.log('[Popup] Sending download message to background, filename:', filename, 'size:', jsonStr.length);

  browser.runtime.sendMessage({
    action: 'download',
    jsonData: jsonStr,
    filename: filename,
    isBulkScrape: isBulkScraping  // Pass bulk scrape status for auto-download behavior
  }).then(() => {
    console.log('[Popup] Message sent successfully');
  }).catch(error => {
    console.error('[Popup] Failed to send message:', error);
  });

  if (autoDownload) {
    setStatus('complete', 'Ready to save!');
  }
}

function displayResults(data) {
  resultsEl.hidden = false;

  const distribution = data.stats.distribution;
  const total = data.stats.totalReviews;
  const scrapedCount = data.reviews?.length || total;

  // Calculate actual negative review count (≤3★) from distribution
  const negativeCount = (distribution[1] || 0) + (distribution[2] || 0) + (distribution[3] || 0);
  const negativePct = total > 0 ? ((negativeCount / total) * 100).toFixed(0) : 0;
  const positivePct = total > 0 ? (100 - negativePct) : 0;

  // Update star distribution header with scraped count (not total)
  document.getElementById('starDistHeader').textContent = `Star Distribution (${scrapedCount} reviews scanned):`;

  // Generate visual bar chart for star distribution
  const starDistEl = document.getElementById('starDistribution');

  // Find the max count to scale bars relative to each other
  const maxCount = Math.max(...Object.values(distribution).map(v => v || 0));

  // Clear existing content
  starDistEl.textContent = '';

  for (let star = 5; star >= 1; star--) {
    const count = distribution[star] || 0;
    const percent = total > 0 ? (count / total * 100) : 0;
    // Scale bar width relative to max count (longest bar = 100%)
    const barWidth = maxCount > 0 ? (count / maxCount * 100) : 0;

    const row = document.createElement('div');
    row.className = 'dist-row';

    const starSpan = document.createElement('span');
    starSpan.className = 'dist-star';
    starSpan.textContent = `${star}★`;

    const barContainer = document.createElement('div');
    barContainer.className = 'dist-bar-container';

    const bar = document.createElement('div');
    bar.className = 'dist-bar';
    bar.style.width = `${barWidth}%`;
    barContainer.appendChild(bar);

    const pctSpan = document.createElement('span');
    pctSpan.className = 'dist-pct';
    pctSpan.textContent = `${count} (${percent.toFixed(0)}%)`;

    row.appendChild(starSpan);
    row.appendChild(barContainer);
    row.appendChild(pctSpan);
    starDistEl.appendChild(row);
  }

  // Display clustering metrics (only 5-star and 1-star)
  const fiveStar = data.analysis.fiveStarClustering || {};
  const oneStar = data.analysis.oneStarClustering || {};

  const cv5Recent = fiveStar.recent?.cv || 0;
  const cv5All = fiveStar.allTime?.cv || 0;
  const cv1Recent = oneStar.recent?.cv || 0;
  const cv1All = oneStar.allTime?.cv || 0;

  // Helper to set value with suspicious highlighting
  function setClusterValue(id, value, threshold = 1.0) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value.toFixed(2);
      if (value > threshold) {
        el.classList.add('suspicious');
      } else {
        el.classList.remove('suspicious');
      }
    }
  }

  setClusterValue('cluster5Recent', cv5Recent);
  setClusterValue('cluster5All', cv5All);
  setClusterValue('cluster1Recent', cv1Recent);
  setClusterValue('cluster1All', cv1All);

  // Per-star word counts with ratio calculation
  const wordCountByRating = data.analysis.all?.wordCountByRating || {};

  // Calculate overall average word count
  const allWordCounts = Object.values(wordCountByRating).filter(v => v > 0);
  const avgWordCount = allWordCounts.length > 0
    ? allWordCounts.reduce((a, b) => a + b, 0) / allWordCounts.length
    : 0;

  for (let star = 1; star <= 5; star++) {
    const el = document.getElementById(`words${star}`);
    if (el) {
      const val = wordCountByRating[star];
      if (val && val > 0 && avgWordCount > 0) {
        const ratio = val / avgWordCount;
        el.textContent = `${val.toFixed(1)} (${ratio.toFixed(2)}x)`;

        // Color code based on ratio
        // Remove any existing classes
        el.classList.remove('suspicious', 'keyword-positive');

        // Add appropriate class based on ratio
        if (ratio < 0.7) {
          // Significantly shorter than average - suspicious for 5-star
          if (star === 5) {
            el.classList.add('suspicious');
          }
        } else if (ratio > 1.3) {
          // Significantly longer than average - good sign (more detailed)
          el.classList.add('keyword-positive');
        }
      } else {
        el.textContent = val?.toFixed(1) || '-';
        el.classList.remove('suspicious', 'keyword-positive');
      }
    }
  }

  // Display authenticity scores if available
  if (data.analysis.authenticityScores) {
    const auth = data.analysis.authenticityScores;
    const authContainer = document.getElementById('authenticityScores');
    const authContent = document.getElementById('authenticityContent');

    // Determine if likely has fake 1-star reviews
    const oneStarRatio = parseFloat(auth.oneStarPct) / parseFloat(auth.twoStarPct);
    const hasFake1Star = oneStarRatio > 10 && parseFloat(auth.oneStarPct) > 15;

    // Clear existing content
    authContent.textContent = '';

    const authGrid = document.createElement('div');
    authGrid.className = 'auth-grid';

    // Distribution score (higher = better, inverted from jaggedness)
    // Based on real data: range 9-51, most 11-38
    const distScore = parseFloat(auth.distributionScore);
    let distClass, distLabel, distExplain;
    if (distScore > 35) {
      distClass = 'auth-good';
      distLabel = 'Excellent';
      distExplain = 'Very smooth distribution';
    } else if (distScore > 15) {
      distClass = 'auth-good';
      distLabel = 'Good';
      distExplain = 'Normal variation';
    } else if (distScore > 10) {
      distClass = 'auth-moderate';
      distLabel = 'Fair';
      distExplain = 'Some irregularity';
    } else {
      distClass = 'auth-poor';
      distLabel = 'Poor';
      distExplain = 'Suspicious distribution';
    }

    const distRow = document.createElement('div');
    distRow.className = 'auth-row';
    const distLabelSpan = document.createElement('span');
    distLabelSpan.className = 'auth-label';
    distLabelSpan.textContent = 'Distribution: ';
    const distValueSpan = document.createElement('span');
    distValueSpan.className = `auth-value ${distClass}`;
    distValueSpan.textContent = `${distLabel} (${auth.distributionScore}) - ${distExplain}`;
    distRow.appendChild(distLabelSpan);
    distRow.appendChild(distValueSpan);
    authGrid.appendChild(distRow);

    // Authenticity score (higher = better)
    // Based on real data: range 2-34, most 5-15
    const authScore = parseFloat(auth.authenticityScore);
    let authClass, authLabel, authExplain;
    if (isNaN(authScore) || auth.authenticityScore === 'N/A') {
      authClass = '';
      authLabel = 'N/A';
      authExplain = 'not enough data';
    } else if (authScore > 10) {
      authClass = 'auth-good';
      authLabel = 'Good';
      authExplain = 'reviews appear genuine';
    } else if (authScore > 4) {
      authClass = 'auth-moderate';
      authLabel = 'Fair';
      authExplain = 'some irregularity';
    } else {
      authClass = 'auth-poor';
      authLabel = 'Poor';
      authExplain = 'reviews cluster at extremes';
    }

    const authRow = document.createElement('div');
    authRow.className = 'auth-row';
    const authLabelSpan = document.createElement('span');
    authLabelSpan.className = 'auth-label';
    authLabelSpan.textContent = 'Authenticity: ';
    const authValueSpan = document.createElement('span');
    authValueSpan.className = `auth-value ${authClass}`;
    authValueSpan.textContent = `${authLabel} (${auth.authenticityScore}) - ${authExplain}`;
    authRow.appendChild(authLabelSpan);
    authRow.appendChild(authValueSpan);
    authGrid.appendChild(authRow);

    authContent.appendChild(authGrid);

    // Fake review warning
    if (hasFake1Star) {
      const warning = document.createElement('div');
      warning.className = 'fake-review-warning';
      const strong = document.createElement('strong');
      strong.textContent = '🚩 Warning:';
      warning.appendChild(strong);
      warning.appendChild(document.createTextNode(` High 1★/2★ ratio (${oneStarRatio.toFixed(1)}x) suggests possible fake 1-star review campaign`));
      authContent.appendChild(warning);
    }

    authContainer.hidden = false;
  }

  // Display red flags from negative reviews (≤3★)
  const redFlagsList = document.getElementById('redFlagsList');
  const negativeAnalysis = data.analysis.negative || data.analysis.middle; // fallback for old data
  const redFlags = Object.entries(negativeAnalysis.redFlagSummary);
  const negativeWithFlags = redFlags.reduce((sum, [, count]) => sum + count, 0);
  const negativeReviewTotal = negativeAnalysis.reviewCount || negativeCount;

  // Calculate % of negative reviews that contain red flags
  const redFlagsPct = negativeReviewTotal > 0
    ? Math.round((negativeWithFlags / negativeReviewTotal) * 100)
    : 0;

  // Update red flags header
  document.getElementById('redFlagsHeader').textContent = `Red Flags (${negativePct}% of ALL reviews are ≤3★, ${redFlagsPct}% of these mention issues):`;

  redFlagsList.textContent = '';

  if (redFlags.length === 0) {
    const noFlags = document.createElement('div');
    noFlags.style.color = '#2e7d32';
    noFlags.textContent = 'No major red flags detected';
    redFlagsList.appendChild(noFlags);
  } else {
    // Sort by count descending
    redFlags.sort((a, b) => b[1] - a[1]);

    redFlags.forEach(([keyword, count]) => {
      const flagItem = document.createElement('div');
      flagItem.className = 'flag-item';

      const keywordSpan = document.createElement('span');
      keywordSpan.className = 'flag-keyword';
      keywordSpan.textContent = keyword;

      const countSpan = document.createElement('span');
      countSpan.className = 'flag-count';
      countSpan.textContent = `: ${count} mention${count > 1 ? 's' : ''}`;

      flagItem.appendChild(keywordSpan);
      flagItem.appendChild(countSpan);
      redFlagsList.appendChild(flagItem);
    });
  }

  // Display Google keyword correlation analysis
  const googleKeywordContainer = document.getElementById('googleKeywordContainer');
  const googleKeywordList = document.getElementById('googleKeywordList');
  const correlation = data.analysis.googleKeywordCorrelation;

  if (correlation && Object.keys(correlation).length > 0) {
    googleKeywordContainer.hidden = false;

    // Update header - show positive % if mostly positive, negative % if mostly negative
    const headerText = positivePct >= 50
      ? `Google Keywords (${positivePct}% are ≥4★):`
      : `Google Keywords (${negativePct}% are ≤3★):`;
    document.getElementById('googleKeywordHeader').textContent = headerText;

    // Show ALL keywords, sorted by count (most mentioned first)
    const allKeywords = Object.entries(correlation)
      .sort((a, b) => b[1].reviewCount - a[1].reviewCount);

    googleKeywordList.textContent = '';

    allKeywords.forEach(([keyword, stats]) => {
      const topFlags = stats.topRedFlags.map(f => `${f.flag}(${f.count})`).join(', ');

      // Determine if keyword is mostly positive or negative
      const highRatingPct = 100 - stats.lowRatingPct;
      const isPositive = highRatingPct > 50;
      const mainMessage = isPositive
        ? `${highRatingPct.toFixed(0)}% of these are ≥4★`
        : `${stats.lowRatingPct.toFixed(0)}% of these are ≤3★`;

      // Color code based on sentiment
      const messageClass = isPositive ? 'keyword-positive' : 'keyword-warning';

      const item = document.createElement('div');
      item.className = 'keyword-item';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'keyword-name';
      nameDiv.textContent = `"${keyword}" `;
      const countSpan = document.createElement('span');
      countSpan.style.color = '#666';
      countSpan.style.fontSize = '11px';
      countSpan.textContent = `(${stats.reviewCount} reviews)`;
      nameDiv.appendChild(countSpan);

      const messageDiv = document.createElement('div');
      messageDiv.className = messageClass;
      messageDiv.textContent = mainMessage;

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'keyword-details';
      detailsDiv.textContent = `Avg: ${stats.avgRating}★ | 1★: ${stats.oneStarPct}% | ${stats.redFlagPct.toFixed(0)}% mention red flags${topFlags ? ': ' + topFlags : ''}`;

      item.appendChild(nameDiv);
      item.appendChild(messageDiv);
      item.appendChild(detailsDiv);
      googleKeywordList.appendChild(item);
    });
  } else {
    googleKeywordContainer.hidden = true;
  }
}

function formatSummary(data) {
  const middleRedFlags = Object.entries(data.analysis.middle.redFlagSummary)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => `  - ${keyword}: ${count}`)
    .join('\n');

  const allRedFlags = Object.entries(data.analysis.all.redFlagSummary)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => `  - ${keyword}: ${count}`)
    .join('\n');

  const fiveStar = data.analysis.fiveStarClustering || {};
  const oneStar = data.analysis.oneStarClustering || {};
  const cv5Recent = fiveStar.recent?.cv || 0;
  const cv5All = fiveStar.allTime?.cv || 0;
  const cv1Recent = oneStar.recent?.cv || 0;
  const cv1All = oneStar.allTime?.cv || 0;

  // Per-star word counts
  const wordCountByRating = data.analysis.all?.wordCountByRating || {};
  const wordCountStr = [5, 4, 3, 2, 1]
    .map(star => `${star}★: ${wordCountByRating[star]?.toFixed(1) || '-'}`)
    .join(', ');

  // Star distribution percentages
  const distribution = data.stats.distribution;
  const total = data.stats.totalReviews;
  const distributionStr = [5, 4, 3, 2, 1]
    .map(star => {
      const count = distribution[star] || 0;
      const percent = total > 0 ? (count / total * 100).toFixed(1) : 0;
      return `${star}★: ${count} (${percent}%)`;
    })
    .join(', ');

  return `${data.summary.name}
${data.summary.address}

Total Reviews: ${data.stats.totalReviews}
Average Rating: ${data.stats.averageRating.toFixed(1)} stars
2-4 Star Reviews: ${data.analysis.middle.reviewCount} (${data.analysis.middle.percentageOfTotal}%)
1 & 5 Star Reviews: ${data.analysis.extreme.reviewCount} (${data.analysis.extreme.percentageOfTotal}%)
Extreme Reviews: ${(data.analysis.extreme.percentageOfTotal).toFixed(0)}%

Star Distribution: ${distributionStr}

Review Clustering (CV):
  5★ Recent: ${cv5Recent.toFixed(2)}${cv5Recent > 1.0 ? ' [SUSPICIOUS]' : ''} | All: ${cv5All.toFixed(2)}
  1★ Recent: ${cv1Recent.toFixed(2)}${cv1Recent > 1.0 ? ' [SUSPICIOUS]' : ''} | All: ${cv1All.toFixed(2)}

Avg Word Count by Rating: ${wordCountStr}

Red Flags (in 2-4 star reviews):
${middleRedFlags || '  None detected'}

Red Flags (all reviews):
${allRedFlags || '  None detected'}

${data.analysis.authenticityScores ? `Authenticity Analysis:
  Curve Jaggedness: ${data.analysis.authenticityScores.curveJaggedness} ${parseFloat(data.analysis.authenticityScores.curveJaggedness) > 6 ? '(Manipulated)' : '(Natural)'}
  Auth Score (1★): ${data.analysis.authenticityScores.auth1Star}
  Auth Score (2★): ${data.analysis.authenticityScores.auth2Star} (Best indicator)
  Auth Score (Combined): ${data.analysis.authenticityScores.authLowStar}
${(() => {
  const oneStarRatio = parseFloat(data.analysis.authenticityScores.oneStarPct) / parseFloat(data.analysis.authenticityScores.twoStarPct);
  return oneStarRatio > 10 ? `  ⚠️ Possible fake 1-star campaign (${oneStarRatio.toFixed(1)}x ratio)\n` : '';
})()}` : ''}
Scraped: ${new Date(data.summary.scrapedAt).toLocaleString()}
URL: ${data.summary.url}`;
}

function setStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
}

// Bulk scrape functions
function toggleBulkScrape() {
  const isHidden = bulkScrapeContainer.hidden;
  bulkScrapeContainer.hidden = !isHidden;
  bulkScrapeToggle.textContent = isHidden ? 'Hide Bulk Scrape' : 'Bulk Scrape';

  if (isHidden) {
    // Hide results when showing bulk scrape UI
    resultsEl.hidden = true;
  }
}

function parseUrls(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes('/maps/place/'));
}

async function startBulkScrape() {
  const urls = parseUrls(bulkUrlsTextarea.value);

  if (urls.length === 0) {
    setStatus('error', 'No valid Google Maps URLs found');
    return;
  }

  bulkScrapeQueue = urls;
  bulkScrapeIndex = 0;
  isBulkScraping = true;

  // Disable controls
  startBulkBtn.disabled = true;
  bulkUrlsTextarea.disabled = true;
  scrapeBtn.disabled = true;
  bulkScrapeToggle.disabled = true;

  // Show progress
  bulkProgressEl.hidden = false;
  updateBulkProgress();

  // Start scraping
  await scrapeNextUrl();
}

async function scrapeNextUrl() {
  if (!isBulkScraping || bulkScrapeIndex >= bulkScrapeQueue.length) {
    finishBulkScrape();
    return;
  }

  const url = bulkScrapeQueue[bulkScrapeIndex];
  const current = bulkScrapeIndex + 1;
  const total = bulkScrapeQueue.length;

  setStatus('scraping', `Bulk scraping ${current}/${total}...`);
  bulkProgressText.textContent = `Scraping ${current}/${total}: ${extractLocationName(url)}`;

  try {
    // Navigate to URL
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    await browser.tabs.update(tabs[0].id, { url });

    // Wait for page to load
    await sleep(1000);

    // Trigger scrape
    await triggerScrape();

  } catch (error) {
    console.error(`[Bulk Scrape] Failed to scrape ${url}:`, error);
    setStatus('error', `Failed: ${error.message}`);
    await sleep(500); // Brief pause before continuing
  }

  // Move to next
  bulkScrapeIndex++;
  updateBulkProgress();

  // Small delay between scrapes
  await sleep(250);
  await scrapeNextUrl();
}

function triggerScrape() {
  return new Promise((resolve, reject) => {
    const options = {
      sortOrder: sortOrderSelect.value,
      maxReviews: parseInt(maxReviewsSelect.value)
    };

    // Send scrape command
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      browser.tabs.sendMessage(tabs[0].id, { action: 'scrape', options });
    });

    // Wait for completion
    const listener = (message) => {
      if (message.action === 'scrapeComplete') {
        browser.runtime.onMessage.removeListener(listener);
        resolve();
      } else if (message.action === 'scrapeError') {
        browser.runtime.onMessage.removeListener(listener);
        reject(new Error(message.error));
      }
    };

    browser.runtime.onMessage.addListener(listener);

    // Timeout after 5 minutes
    setTimeout(() => {
      browser.runtime.onMessage.removeListener(listener);
      reject(new Error('Scrape timeout'));
    }, 5 * 60 * 1000);
  });
}

function updateBulkProgress() {
  const percent = (bulkScrapeIndex / bulkScrapeQueue.length) * 100;
  bulkProgressBar.style.width = `${percent}%`;
}

function finishBulkScrape() {
  isBulkScraping = false;

  setStatus('complete', `Bulk scrape complete! Scraped ${bulkScrapeQueue.length} locations`);

  // Re-enable controls
  startBulkBtn.disabled = false;
  bulkUrlsTextarea.disabled = false;
  scrapeBtn.disabled = false;
  bulkScrapeToggle.disabled = false;

  // Clear textarea
  bulkUrlsTextarea.value = '';

  // Hide progress after delay
  setTimeout(() => {
    bulkProgressEl.hidden = true;
    bulkProgressBar.style.width = '0%';
  }, 3000);
}

function cancelBulkScrape() {
  isBulkScraping = false;
  finishBulkScrape();
  setStatus('ready', 'Bulk scrape cancelled');
}

function extractLocationName(url) {
  try {
    const match = url.match(/\/maps\/place\/([^\/\?]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
  } catch (e) {
    // Ignore
  }
  return 'Unknown location';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
