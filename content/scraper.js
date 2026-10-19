// Core scraping functions for Google Maps reviews

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clicks the sort dropdown and selects a sort option
 */
async function setSortOrder(sortOrder) {
  console.log(`[Scraper] Setting sort order to: ${sortOrder}`);

  // Find the sort button - based on real DOM:
  // <button aria-label="Sort reviews" data-value="Sort" class="g88MCb S9kvJb">
  const sortButton = document.querySelector('button[aria-label="Sort reviews"]') ||
                     document.querySelector('button[data-value="Sort"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => {
                       const span = btn.querySelector('span');
                       return span && span.textContent.trim() === 'Sort';
                     });

  if (!sortButton) {
    console.log('[Scraper] Sort button not found, using default order');
    return;
  }

  console.log('[Scraper] Found sort button, clicking...');
  sortButton.click();
  await sleep(500);

  // Map our values to Google's menu text
  const sortTextMap = {
    'relevant': 'Most relevant',
    'newest': 'Newest',
    'highest': 'Highest rating',
    'lowest': 'Lowest rating'
  };

  const targetText = sortTextMap[sortOrder] || 'Most relevant';

  // Find and click the menu option - look in any dropdown/menu that appeared
  const menuItems = document.querySelectorAll('[role="menuitemradio"], [role="option"], [role="menuitem"], div[data-index]');
  for (const item of menuItems) {
    if (item.textContent.includes(targetText)) {
      item.click();
      console.log(`[Scraper] Selected sort option: ${targetText}`);
      await sleep(1000); // Wait for reviews to reload
      return;
    }
  }

  // Fallback: try clicking any element with the target text
  const allElements = document.querySelectorAll('div, span, a');
  for (const el of allElements) {
    if (el.textContent.trim() === targetText && el.offsetParent !== null) {
      el.click();
      console.log(`[Scraper] Selected sort option (fallback): ${targetText}`);
      await sleep(1000);
      return;
    }
  }

  console.log('[Scraper] Sort option not found in menu, using default');
  // Click elsewhere to close menu
  document.body.click();
}

/**
 * Scrolls the review container to load reviews up to maxReviews limit
 */
async function scrollToLoadAllReviews(container, maxReviews = 0, expectedTotal = 0) {
  let previousCount = 0;
  let attempts = 0;
  let stuckAttempts = 0;
  const maxAttempts = 100; // Safety limit
  const maxStuckAttempts = 5; // Number of times to retry when stuck
  let lastProgressUpdate = 0;

  const limitText = maxReviews > 0 ? `up to ${maxReviews}` : 'all';
  console.log(`[Scraper] Starting to scroll and load ${limitText} reviews... (expected total: ${expectedTotal})`);

  while (attempts < maxAttempts) {
    // Scroll to bottom
    container.scrollTo(0, container.scrollHeight);
    await sleep(500); // Wait for reviews to load

    // Count current reviews - use the specific selector for review containers
    const currentCount = document.querySelectorAll('div.jftiEf[data-review-id]').length;

    console.log(`[Scraper] Attempt ${attempts + 1}: Found ${currentCount} reviews (target: ${expectedTotal || 'unlimited'})`);

    // Send progress update every 50 reviews
    if (currentCount > 0 && currentCount !== lastProgressUpdate && currentCount % 50 === 0) {
      browser.runtime.sendMessage({
        action: 'scrapeProgress',
        count: currentCount
      });
      lastProgressUpdate = currentCount;
    }

    // Check if we've hit the user-specified limit
    if (maxReviews > 0 && currentCount >= maxReviews) {
      console.log(`[Scraper] Reached max reviews limit (${maxReviews}), stopping scroll`);
      break;
    }

    // Check if we've reached the expected total from stats panel
    if (expectedTotal > 0 && currentCount >= expectedTotal) {
      console.log(`[Scraper] Reached expected total (${expectedTotal}), stopping scroll`);
      break;
    }

    // If count hasn't changed, we might be stuck
    if (currentCount === previousCount) {
      stuckAttempts++;
      console.log(`[Scraper] No new reviews loaded (stuck attempt ${stuckAttempts}/${maxStuckAttempts})`);

      // If we're stuck but haven't reached the expected total, keep trying
      if (expectedTotal > 0 && currentCount < expectedTotal && stuckAttempts < maxStuckAttempts) {
        console.log(`[Scraper] Still missing ${expectedTotal - currentCount} reviews, continuing...`);
        await sleep(1000); // Wait longer when stuck
        attempts++;
        continue;
      }

      // Give up if stuck too many times
      if (stuckAttempts >= maxStuckAttempts) {
        console.log('[Scraper] Stuck too many times, stopping scroll');
        break;
      }

      break;
    }

    previousCount = currentCount;
    stuckAttempts = 0; // Reset stuck counter when making progress
    attempts++;
  }

  return previousCount;
}

/**
 * Expands all "More" buttons to get full review text
 */
async function expandAllReviews() {
  // Only target the "More" buttons within review text (class w8nwRe)
  // Avoid broad selectors that might match user profile buttons
  const moreButtons = document.querySelectorAll('button.w8nwRe');
  console.log(`[Scraper] Found ${moreButtons.length} "More" buttons to expand`);

  for (const btn of moreButtons) {
    try {
      btn.click();
      await sleep(50);
    } catch (e) {
      // Button might have been removed from DOM, ignore
    }
  }

  await sleep(200); // Wait for expansions to complete
}

/**
 * Extracts location name, address, and URL
 */
function getLocationInfo() {
  // Try multiple selectors for location name
  const nameEl = document.querySelector('h1.DUwDvf') ||
                 document.querySelector('h1.fontHeadlineLarge') ||
                 document.querySelector('h1[data-attrid="title"]') ||
                 document.querySelector('h1');

  // Try multiple selectors for address
  const addressEl = document.querySelector('button[data-item-id="address"]') ||
                    document.querySelector('button[data-tooltip*="address" i]') ||
                    document.querySelector('[data-item-id="address"]');

  const name = nameEl?.textContent?.trim() || 'Unknown Location';
  const address = addressEl?.textContent?.trim() || 'Unknown Address';
  const url = window.location.href;

  console.log('[Scraper] Location info:', { name, address, url });

  return { name, address, url };
}

/**
 * Scrapes the stats panel (rating, distribution, keywords)
 */
function getStatsFromPanel() {
  // Average rating
  const ratingEl = document.querySelector('div.fontDisplayLarge') ||
                   document.querySelector('span.ceNzKf[aria-hidden="true"]');
  const avgRating = parseFloat(ratingEl?.textContent?.trim()) || 0;

  // Star distribution (parse first, most reliable)
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  // Try to find histogram rows
  const histogramRows = document.querySelectorAll('tr.BHOKXe, tr[aria-label*="star" i]');
  histogramRows.forEach(row => {
    const label = row.getAttribute('aria-label') || row.textContent;
    // Parse "5 stars, 180 reviews" or similar patterns
    const match = label.match(/(\d)\s*stars?.*?(\d[\d,]*)/i);
    if (match) {
      const starValue = parseInt(match[1]);
      const count = parseInt(match[2].replace(/,/g, ''));
      if (starValue >= 1 && starValue <= 5 && !isNaN(count)) {
        distribution[starValue] = count;
      }
    }
  });

  // Calculate total from distribution sum (most reliable method)
  const totalFromDistribution = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  // Try to find total from text (fallback validation)
  const reviewCountEl = Array.from(document.querySelectorAll('span, button'))
    .find(el => /\d+\s*reviews?/i.test(el.textContent));
  const reviewCountMatch = reviewCountEl?.textContent?.match(/(\d[\d,]*)\s*reviews?/i);
  const totalFromText = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, '')) : 0;

  // Use distribution sum as the authoritative count
  const totalReviews = totalFromDistribution;

  // Warn if there's a significant mismatch (more than 5 review difference)
  if (totalFromText > 0 && Math.abs(totalFromText - totalFromDistribution) > 5) {
    console.warn(`[Scraper] Review count mismatch: Text element says ${totalFromText}, but distribution sums to ${totalFromDistribution}. Using distribution sum.`);
  }

  // Google's keyword chips
  const keywords = {};
  const keywordChips = document.querySelectorAll('button.e2moi, button[class*="keyword" i]');
  keywordChips.forEach(chip => {
    const text = chip.textContent.trim();
    // Format: "maintenance 76" or "maintenance (76)"
    const match = text.match(/(.+?)\s*[\(\s]?(\d+)\)?$/);
    if (match) {
      keywords[match[1].trim().toLowerCase()] = parseInt(match[2]);
    }
  });

  console.log('[Scraper] Stats:', { avgRating, totalReviews, distribution, totalFromText, keywords });

  return {
    averageRating: avgRating,
    totalReviews: totalReviews,
    distribution: distribution,
    googleKeywords: keywords
  };
}

/**
 * Parses all reviews from the DOM
 */
function parseAllReviews() {
  const reviews = [];

  // Based on real DOM: <div class="jftiEf fontBodyMedium" data-review-id="...">
  // The jftiEf class with data-review-id is the review container
  const reviewEls = document.querySelectorAll('div.jftiEf[data-review-id]');

  console.log(`[Scraper] Found ${reviewEls.length} review elements to parse`);

  reviewEls.forEach((el, index) => {
    try {
      // Rating: Based on real DOM: <span class="kvMYJc" role="img" aria-label="1 star">
      let rating = 0;
      const starsEl = el.querySelector('span.kvMYJc[role="img"]');
      if (starsEl) {
        const ariaLabel = starsEl.getAttribute('aria-label') || '';
        const ratingMatch = ariaLabel.match(/(\d)\s*star/i);
        rating = ratingMatch ? parseInt(ratingMatch[1]) : 0;
      }

      // Skip if no rating found
      if (rating === 0) {
        console.log(`[Scraper] Skipping review ${index}: no rating found`);
        return;
      }

      // Review text - Based on real DOM: <span class="wiI7pd">review text</span>
      // inside <div class="MyEned">
      const textEl = el.querySelector('span.wiI7pd');
      const text = textEl?.textContent?.trim() || '';

      // Date: Based on real DOM: <span class="rsqaWe">8 years ago</span>
      const dateEl = el.querySelector('span.rsqaWe');
      const date = dateEl?.textContent?.trim() || '';

      // Author: Based on real DOM: aria-label on the review container itself
      // or look for the author name element
      const ariaLabel = el.getAttribute('aria-label') || '';
      let author = ariaLabel || 'Anonymous';

      // Also try to find author in child elements
      const authorEl = el.querySelector('div.d4r55') ||
                       el.querySelector('button.WNxzHc');
      if (authorEl) {
        author = authorEl.textContent?.trim() || author;
      }

      reviews.push({
        rating,
        text,
        date,
        author
      });
    } catch (e) {
      console.warn(`[Scraper] Error parsing review ${index}:`, e);
    }
  });

  console.log(`[Scraper] Successfully parsed ${reviews.length} reviews`);
  return reviews;
}

/**
 * Counts spelling errors in text using Typo.js dictionary
 */
function countSpellingErrors(text, dictionary) {
  if (!dictionary || !text) return 0;

  // Keep case: the dictionary knows "I've" and "Austin" but not "i've".
  // Phones type curly apostrophes, which would split "didn’t" into "didn".
  const words = text
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\s']/gu, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^'+|'+$/g, ''))
    .filter(w => w.length > 2); // Ignore very short words

  // A capitalised word the dictionary doesn't know is almost always a name
  // (staff, the complex, the street), and 5★ reviews thank staff by name.
  return words.filter(w => !dictionary.check(w) && !/^\p{Lu}/u.test(w)).length;
}

/**
 * Finds red flag keywords in review text
 * Uses word boundary matching to avoid false positives
 * Filters out negated mentions (e.g., "no bugs", "never had roaches")
 */
function findFlaggedKeywords(text) {
  const found = [];
  const lowerText = text.toLowerCase();

  // Negation words that can appear before keywords
  const negationPattern = /\b(no|not|never|without|zero|free from|haven't|hasn't|didn't|don't|doesn't|lack of|absence of|none)\s+(\w+\s+)?(of\s+)?/;

  RED_FLAG_KEYWORDS.forEach(keyword => {
    // Use word boundaries to match whole words/phrases only
    // For multi-word phrases (e.g., "bed bug"), match the whole phrase
    const keywordPattern = new RegExp(`\\b${keyword.toLowerCase().replace(/\s+/g, '\\s+')}\\b`, 'g');

    // Find all matches of this keyword
    let match;
    while ((match = keywordPattern.exec(lowerText)) !== null) {
      const matchIndex = match.index;

      // Check 50 characters before the keyword for negation
      const contextStart = Math.max(0, matchIndex - 50);
      const precedingText = lowerText.substring(contextStart, matchIndex);

      // If no negation found in preceding text, it's a real flag
      if (!negationPattern.test(precedingText)) {
        found.push(keyword);
        break; // Only count each keyword once
      }
    }
  });

  // Dedupe
  return [...new Set(found)];
}

/**
 * Finds the scrollable review container
 * When two panes exist (search results + place detail), selects the LAST match
 * since the place detail pane appears later in DOM order
 */
function findReviewContainer() {
  const selectors = [
    'div.m6QErb.DxyBCb.kA9KIf.dS8AEf',
    'div.m6QErb.DxyBCb',
    'div[role="feed"]',
    'div.m6QErb'
  ];

  for (const selector of selectors) {
    // Get ALL matching containers, not just the first
    const containers = document.querySelectorAll(selector);

    // Filter to only visible, scrollable containers
    const validContainers = Array.from(containers).filter(container => {
      const style = window.getComputedStyle(container);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
             container.offsetParent !== null &&
             style.display !== 'none' &&
             style.visibility !== 'hidden';
    });

    // Return the LAST valid container (rightmost/topmost pane)
    if (validContainers.length > 0) {
      const container = validContainers[validContainers.length - 1];
      console.log(`[Scraper] Found review container with selector: ${selector} (${validContainers.length} matches, using last)`);
      return container;
    }
  }

  // Fallback: also use last match approach
  const allDivs = document.querySelectorAll('div');
  const fallbackContainers = Array.from(allDivs).filter(div => {
    const style = window.getComputedStyle(div);
    return (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
           div.querySelector('[data-review-id], div.jftiEf') &&
           div.offsetParent !== null;
  });

  if (fallbackContainers.length > 0) {
    console.log('[Scraper] Found review container via fallback method (using last match)');
    return fallbackContainers[fallbackContainers.length - 1];
  }

  return null;
}
