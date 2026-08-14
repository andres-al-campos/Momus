// Background script to handle downloads
// This persists across popup closes

// Chrome exposes `chrome`, Firefox exposes `browser`. Both speak the same
// promise-based MV3 API, so aliasing is enough - no polyfill needed.
const browser = globalThis.browser ?? globalThis.chrome;

// Build a data: URL from a UTF-8 string. MV3 service workers have no
// URL.createObjectURL, so downloads must be handed a data URL instead.
// btoa() alone would throw on any character above U+00FF, and review text
// routinely contains accents and CJK - hence the encode to bytes first.
function toJsonDataUrl(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return 'data:application/json;base64,' + btoa(binary);
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'download') {
    const { jsonData, filename, isBulkScrape } = message;

    const downloadOptions = {
      url: toJsonDataUrl(jsonData),
      filename: isBulkScrape ? `reviews/${filename}` : filename,
      saveAs: !isBulkScrape  // Auto-download for bulk, prompt for single scrapes
    };

    browser.downloads.download(downloadOptions).catch(error => {
      console.error('Download failed:', error);
    });
  }
});

console.log('[Background] Momus background script loaded');
