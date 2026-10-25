// Law: the results view colours numbers by the cut-offs in dev/features/analysis.md (Calls), counts
// a review once per red-flag group, and hides typos it can't trust.
//
// Usage: node tests/summarize.mjs [repo-root]

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({});
for (const file of ['content/keywords.js', 'popup/summarize.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const summarize = vm.runInContext('summarize', context);

const failures = [];
const expect = (what, got, want, fix) => {
  if (got !== want) failures.push(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}. ${fix}`);
};

const review = (rating, text, extra = {}) => ({ rating, text, flaggedKeywords: [], spellingErrors: 0, ...extra });
const scrape = (overrides = {}) => ({
  name: 'Test Place',
  stats: { averageRating: 4.0, distribution: { 1: 2, 2: 1, 3: 1, 4: 2, 5: 4 } },
  analysis: {},
  reviews: [
    review(1, 'roaches and mice everywhere, roach in the kitchen', { flaggedKeywords: ['roaches', 'mice', 'roach'] }),
    review(1, 'they kept my deposit', { flaggedKeywords: ['deposit'] }),
    review(2, 'fine I guess'),
    review(3, 'ok place'),
    review(4, 'nice pool'), review(4, 'good staff'),
    review(5, 'great'), review(5, 'great'), review(5, 'great'), review(5, 'great'),
  ],
  ...overrides,
});

// Rating: green from 4.3★, red under 3.8★.
for (const [rating, tone] of [[4.3, 'good'], [4.2, 'mid'], [3.8, 'mid'], [3.7, 'bad']]) {
  expect(`rating ${rating} tone`, summarize(scrape({ stats: { ...scrape().stats, averageRating: rating } })).ratingTone, tone,
    'Rating cut-offs live in CUTOFFS.rating in popup/summarize.js; dev/features/analysis.md says green from 4.3, red under 3.8.');
}

// Keyword ≥4★ share: green from 70%, red under 40%.
const kw = (low) => summarize(scrape({ analysis: { googleKeywordCorrelation: { pool: { reviewCount: 10, lowRatingPct: low, oneStarPct: 0 } } } })).keywords[0].tone;
expect('keyword 70% tone', kw(30), 'good', 'See CUTOFFS.keywordHigh; dev/features/analysis.md says green from 70%.');
expect('keyword 40% tone', kw(60), 'mid', 'See CUTOFFS.keywordHigh; dev/features/analysis.md says red under 40%.');
expect('keyword 39% tone', kw(61), 'bad', 'See CUTOFFS.keywordHigh; dev/features/analysis.md says red under 40%.');

// Red flags: 4 of 10 reviews are ≤3★ (red over 40% only), 2 of those 4 name a flag.
const rf = summarize(scrape()).redFlags;
expect('share of reviews ≤3★', rf.lowShare, 40, 'lowShare should be ≤3★ reviews over all reviews.');
expect('share ≤3★ tone at 40%', rf.lowTone, 'mid', 'See CUTOFFS.lowShare; dev/features/analysis.md says red over 40%.');
expect('share naming a flag', rf.namedShare, 50, 'namedShare should be flagged ≤3★ reviews over all ≤3★ reviews.');
const pests = rf.groups.find((g) => g.name === 'Pests');
expect('Pests counts one review once', pests?.reviews, 1,
  'A review naming "roaches" and "mice" counts once under Pests; group by RED_FLAG_GROUPS in content/keywords.js.');

// Typos: hidden when every count is 0 (scrapes from before the spell checker loaded).
const hasTypoRow = (s) => s.trust.evidence.some((e) => e.label === '5★ typos');
expect('typo row with all-zero counts', hasTypoRow(summarize(scrape())), false,
  'typoRow must return null when no review has a spelling error.');
const withTypos = scrape();
withTypos.reviews[2].spellingErrors = 1;
withTypos.reviews[6].spellingErrors = 1;
expect('typo row with real counts', hasTypoRow(summarize(withTypos)), true, 'typoRow should show once any review has a spelling error.');

if (failures.length) {
  for (const f of failures) console.error(`✗ summarize: ${f}`);
  process.exit(1);
}
console.log('✓ summarize: cut-offs, red-flag grouping and the typo row hold');
