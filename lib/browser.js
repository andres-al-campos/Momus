// Chrome exposes `chrome`, Firefox exposes `browser`. Content scripts share one
// scope, and so do the popup's scripts, so this loads first in both and every
// later script uses `browser`.
const browser = globalThis.browser ?? globalThis.chrome;
