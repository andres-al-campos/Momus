// `browser` comes from lib/browser.js; summarize() from summarize.js.

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
const sortOrderSelect = document.getElementById('sortOrder');
const maxReviewsSelect = document.getElementById('maxReviews');
const scrapeView = document.getElementById('scrapeView');
const resultsView = document.getElementById('resultsView');
const footer = document.getElementById('footer');
const viewToggle = document.getElementById('viewToggle');

// Bulk scrape elements
const bulkUrlsTextarea = document.getElementById('bulkUrls');
const startBulkBtn = document.getElementById('startBulkBtn');
const cancelBulkBtn = document.getElementById('cancelBulkBtn');
const bulkProgressEl = document.getElementById('bulkProgress');
const bulkProgressText = document.getElementById('bulkProgressText');
const bulkProgressBar = document.getElementById('bulkProgressBar');

// The popup opens on the last scrape, whatever page you're on: it answers
// "did I scan this one already?" while hopping between places.
browser.storage.local.get(['lastScrapeData', 'sortOrder', 'maxReviews']).then(result => {
  if (result.sortOrder) sortOrderSelect.value = result.sortOrder;
  if (result.maxReviews) maxReviewsSelect.value = result.maxReviews;
  if (result.lastScrapeData) {
    scrapedData = result.lastScrapeData;
    displayResults(scrapedData);
    showView('results');
  } else {
    showView('scrape');
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
downloadBtn.addEventListener('click', () => handleDownloadClick());
copyBtn.addEventListener('click', handleCopyClick);
startBulkBtn.addEventListener('click', startBulkScrape);
cancelBulkBtn.addEventListener('click', cancelBulkScrape);
viewToggle.addEventListener('click', () => showView(resultsView.hidden ? 'results' : 'scrape'));

// Scrape and results are a click apart: one column that switches between them.
function showView(view) {
  const results = view === 'results' && scrapedData;
  scrapeView.hidden = !!results;
  resultsView.hidden = !results;
  footer.hidden = !results;
  document.getElementById('place').hidden = !results;
  document.getElementById('brand').hidden = !!results;
  viewToggle.hidden = !scrapedData;
  viewToggle.textContent = results ? 'New scrape' : 'Back to results';
}

// Listen for messages from content script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'scrapeProgress') {
    setStatus('scraping', `Loaded ${message.count} reviews...`);
  } else if (message.action === 'scrapeAnalyzing') {
    setStatus('scraping', `Analyzing ${message.count} reviews...`);
  } else if (message.action === 'scrapeComplete') {
    scrapedData = message.data;

    // Save to storage so it persists when popup closes
    browser.storage.local.set({ lastScrapeData: scrapedData });

    displayResults(scrapedData);
    setStatus('complete', 'Scraping complete.');
    scrapeBtn.disabled = false;
    startBulkBtn.disabled = false;
    if (!isBulkScraping) showView('results');

    // Auto-download the JSON file
    setTimeout(() => {
      handleDownloadClick(true);
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
    startBulkBtn.disabled = true;
    setStatus('scanning', 'Scanning reviews...');

    // Reset retry count on manual click
    scrapeRetryCount = 0;

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found. Click into the Google Maps tab, then try again.');
    }

    await browser.tabs.sendMessage(tabs[0].id, { action: 'scrape', options: scrapeOptions() });
  } catch (error) {
    setStatus('error', `${error.message} Open a place on Google Maps (its URL contains /maps/place/) and reload the page.`);
    scrapeBtn.disabled = false;
    startBulkBtn.disabled = false;
  }
}

function scrapeOptions() {
  return {
    sortOrder: sortOrderSelect.value,
    maxReviews: parseInt(maxReviewsSelect.value) || 0
  };
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
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }

      // Reload the page, wait for it, and retry the scrape
      await browser.tabs.reload(tabs[0].id);
      await sleep(2000);
      await browser.tabs.sendMessage(tabs[0].id, { action: 'scrape', options: scrapeOptions() });
    } catch (retryError) {
      setStatus('error', `Retry failed: ${retryError.message}`);
      scrapeBtn.disabled = false;
      startBulkBtn.disabled = false;
      scrapeRetryCount = 0;
    }
  } else {
    const retryMsg = scrapeRetryCount >= MAX_SCRAPE_RETRIES ? ' (max retries reached)' : '';
    setStatus('error', `Error: ${errorMessage}${retryMsg}`);
    scrapeBtn.disabled = false;
    startBulkBtn.disabled = false;
    scrapeRetryCount = 0;
  }
}

function handleDownloadClick(autoDownload = false) {
  if (!scrapedData) {
    console.log('[Popup] No data to download');
    return;
  }

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
  browser.runtime.sendMessage({
    action: 'download',
    jsonData: JSON.stringify(dataToDownload, null, 2),
    filename: filename,
    isBulkScrape: isBulkScraping  // Pass bulk scrape status for auto-download behavior
  }).catch(error => {
    console.error('[Popup] Failed to send download message:', error);
  });

  if (autoDownload) {
    setStatus('complete', 'Scraping complete. JSON saved.');
  }
}

async function handleCopyClick() {
  if (!scrapedData) return;
  try {
    await navigator.clipboard.writeText(formatSummary(summarize(scrapedData)));
    flashButton(copyBtn, 'Copied');
  } catch (error) {
    console.error('[Popup] Copy failed:', error);
    flashButton(copyBtn, 'Copy failed');
  }
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = original; }, 1500);
}

// ---------- rendering ----------

// Builds an element. Children are nodes or strings; strings get a real ★
// glyph, since IBM Plex has none.
function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? starText(child) : child);
  }
  return node;
}

function starText(text) {
  const frag = document.createDocumentFragment();
  text.split('★').forEach((part, i) => {
    if (i > 0) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '★';
      frag.append(star);
    }
    if (part) frag.append(document.createTextNode(part));
  });
  return frag;
}

function displayResults(data) {
  const view = summarize(data);

  document.getElementById('placeName').textContent = view.name;
  const ratingEl = document.getElementById('placeRating');
  ratingEl.className = `mono ${view.ratingTone}`;
  ratingEl.replaceChildren(el('span', null, `${view.rating.toFixed(1)}★`));
  ratingEl.title = 'Average star rating. Across saved places, 4.3★ and up is good, under 3.8★ is poor.';
  document.getElementById('placeCount').textContent = view.reviewCount;

  resultsView.replaceChildren(
    renderTrust(view.trust),
    renderKeywords(view.keywords),
    renderRedFlags(view.redFlags),
  );
}

function renderTrust(trust) {
  const curve = el('div', 'curve',
    trust.curve.map(c => {
      const bar = el('div', 'b');
      bar.style.height = `${c.pct.toFixed(0)}%`;
      return el('div', 'col', el('span', 'pct', `${Math.round(c.pct)}%`), bar);
    }));
  curve.setAttribute('aria-label', 'Star distribution');

  return el('section', 'card',
    el('div', 'eyebrow', 'Can you trust them'),
    el('div', `verdict-word ${trust.tone}`, el('span', 'dot'), el('span', null, trust.word)),
    el('div', 'verdict-cap', trust.caption.map(part => (part.em ? el('b', null, part.t) : part.t))),
    curve,
    el('div', 'curve-axis', trust.curve.map(c => el('span', null, `${c.star}★`, el('span', 'cnt-s', String(c.count))))),
    trust.evidence.length ? el('div', 'evidence', trust.evidence.map(evidenceRow)) : null,
  );
}

function evidenceRow(ev) {
  const body = el('div', 'ev-body');
  if (ev.grid) {
    body.append(el('div', 'mini-grid',
      ev.grid.map(g => el('span', 'h', `${g.star}★`)),
      ev.grid.map(g => el('span', 'v', g.value)),
      ev.grid.some(g => g.sub) ? ev.grid.map(g => el('span', 's', g.sub || '')) : null));
  }
  if (ev.rows) {
    ev.rows.forEach(([label, value]) => body.append(el('div', 'row', el('span', null, label), el('span', 'mono', value))));
  }
  body.append(el('div', 'faint', ev.text));

  return el('details', 'ev',
    el('summary', null,
      el('span', 'ev-label', ev.label),
      el('span', `ev-val ${ev.tone}`, ev.value),
      el('span', 'car', '›'),
      el('span', 'ev-note', ev.note)),
    body);
}

function flagChip([word, count]) {
  return el('span', 'fl', word, el('span', 'fc', String(count)));
}

function renderKeywords(keywords) {
  const card = el('section', 'card',
    el('div', 'eyebrow', 'What people mention'));
  if (!keywords.length) {
    card.append(el('div', 'empty', "Google didn't pick out any topics for this place."));
    return card;
  }
  card.append(
    el('div', 'cap', "Topics Google picked out of this place's reviews."),
    el('div', 'kw-list', keywords.map(k => el('div', 'kw',
      el('div', 'top', el('span', 'name', k.name), el('span', 'count', `(${k.count} reviews)`)),
      el('div', 'vrow',
        el('span', `verdict ${k.tone}`, el('span', 'mono', `${k.high}%`), ' rated ≥4★'),
        k.one ? el('span', 'one', el('span', 'mono', `${k.one}%`), ' rated 1★') : null),
      k.flags.length ? el('div', 'detail', 'Red flags:', k.flags.map(f => flagChip([f.flag, f.count]))) : null,
    ))));
  return card;
}

function renderRedFlags(rf) {
  const card = el('section', 'card card-flags', el('div', 'eyebrow', 'Red flags'));
  if (!rf) {
    card.append(el('div', 'empty', 'No reviews rated ≤3★.'));
    return card;
  }
  card.append(el('div', 'rf-story',
    el('span', `mono ${rf.lowTone}`, `${rf.lowShare}%`), ' of reviews are ≤3★. ',
    el('span', `mono ${rf.namedTone}`, `${rf.namedShare}%`),
    rf.groups.length ? ' of those mention these red flags:' : ' of those mention a red flag.'));
  if (rf.groups.length) {
    card.append(el('div', 'rf-list', rf.groups.map(g => el('div', 'rf',
      el('span', 'grp', g.name),
      el('span', 'n', String(g.reviews)),
      el('span', 'words', g.words.map(flagChip))))));
  }
  return card;
}

// Plain-text version of the results view, for pasting into notes.
function formatSummary(view) {
  const lines = [
    view.name,
    `${view.rating.toFixed(1)}★ · ${view.reviewCount} reviews`,
    '',
    `Can you trust them: ${view.trust.word}`,
    view.trust.caption.map(p => p.t).join(''),
  ];
  if (view.keywords.length) {
    lines.push('', 'What people mention:');
    for (const k of view.keywords) {
      const flags = k.flags.map(f => `${f.flag} ${f.count}`).join(', ');
      lines.push(`  ${k.name} (${k.count} reviews): ${k.high}% rated ≥4★` +
        (k.one ? `, ${k.one}% rated 1★` : '') + (flags ? `. Red flags: ${flags}` : ''));
    }
  }
  if (view.redFlags) {
    lines.push('', `Red flags: ${view.redFlags.lowShare}% of reviews are ≤3★. ${view.redFlags.namedShare}% of those mention a red flag.`);
    for (const g of view.redFlags.groups) {
      lines.push(`  ${g.name} (${g.reviews}): ${g.words.map(([w, n]) => `${w} ${n}`).join(', ')}`);
    }
  }
  if (scrapedData?.url) lines.push('', scrapedData.url);
  return lines.join('\n');
}

function setStatus(type, message) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
}

// ---------- bulk scrape ----------

function parseUrls(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes('/maps/place/'));
}

async function startBulkScrape() {
  const urls = parseUrls(bulkUrlsTextarea.value);

  if (urls.length === 0) {
    setStatus('error', 'No Google Maps place links found. Paste links that contain /maps/place/, one per line.');
    return;
  }

  bulkScrapeQueue = urls;
  bulkScrapeIndex = 0;
  isBulkScraping = true;

  // Disable controls
  startBulkBtn.disabled = true;
  bulkUrlsTextarea.disabled = true;
  scrapeBtn.disabled = true;

  // Show progress
  bulkProgressEl.hidden = false;
  updateBulkProgress();

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
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    await browser.tabs.update(tabs[0].id, { url });
    await sleep(1000);
    await triggerScrape();
  } catch (error) {
    console.error(`[Bulk Scrape] Failed to scrape ${url}:`, error);
    setStatus('error', `Failed: ${error.message}`);
    await sleep(500);
  }

  bulkScrapeIndex++;
  updateBulkProgress();

  await sleep(250);
  await scrapeNextUrl();
}

function triggerScrape() {
  return new Promise((resolve, reject) => {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      browser.tabs.sendMessage(tabs[0].id, { action: 'scrape', options: scrapeOptions() });
    });

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

  setStatus('complete', `Bulk scrape complete. Scraped ${bulkScrapeQueue.length} places.`);

  startBulkBtn.disabled = false;
  bulkUrlsTextarea.disabled = false;
  scrapeBtn.disabled = false;
  bulkUrlsTextarea.value = '';

  setTimeout(() => {
    bulkProgressEl.hidden = true;
    bulkProgressBar.style.width = '0%';
  }, 3000);
}

function cancelBulkScrape() {
  isBulkScraping = false;
  finishBulkScrape();
  setStatus('ready', 'Bulk scrape cancelled.');
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
