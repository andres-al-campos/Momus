// Turns a scrape into what the results view shows: the numbers, their
// colours and the sentences around them. No DOM here, so the decisions about
// what counts as good or bad live in one place.
//
// Colours are 'good', 'mid' or 'bad' for the place. The cut-offs come from the
// spread across 16 saved places (AGENTS.md, Colour cut-offs).

// Only summarize() leaves this file; the popup's scripts share one scope.
const summarize = (() => {
  const CUTOFFS = {
    rating:      { good: 4.3, bad: 3.8 },   // ≥ good is green, < bad is red
    keywordHigh: { good: 70, bad: 40 },     // % of a topic's reviews rated ≥4★
    lowShare:    { good: 10, bad: 40 },     // % of all reviews rated ≤3★
    namedShare:  { good: 35, bad: 60 },     // % of ≤3★ reviews naming a red flag
  };

  const toneAtLeast = (x, { good, bad }) => (x >= good ? 'good' : x < bad ? 'bad' : 'mid');
  const toneAtMost = (x, { good, bad }) => (x < good ? 'good' : x > bad ? 'bad' : 'mid');

  const words = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;
  const round = (x) => Math.round(x);

  function placeName(data) {
    const name = data.name ?? data.summary?.name;
    if (name && name !== 'Unknown Location') return name;
    const m = (data.url ?? data.summary?.url ?? '').match(/\/maps\/place\/([^/?]+)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : 'Unknown place';
  }

  function summarize(data) {
    const reviews = data.reviews || [];
    const analysis = data.analysis || {};
    const dist = data.stats?.distribution || {};
    const counts = [1, 2, 3, 4, 5].map((s) => dist[s] || 0);
    const ratings = counts.reduce((a, b) => a + b, 0);
    const rating = data.stats?.averageRating || 0;

    return {
      name: placeName(data),
      rating,
      ratingTone: toneAtLeast(rating, CUTOFFS.rating),
      reviewCount: reviews.length || ratings,
      trust: trustCard(analysis, reviews, counts, ratings),
      keywords: keywordRows(analysis.googleKeywordCorrelation, reviews),
      redFlags: redFlagCard(reviews),
    };
  }

  // ---------- Can you trust them ----------

  function scoreLabel(score, fair, good) {
    if (score > good) return ['Good', 'good'];
    if (score > fair) return ['Fair', 'mid'];
    return ['Poor', 'bad'];
  }

  function trustCard(analysis, reviews, counts, ratings) {
    const curve = counts.map((count, i) => ({
      star: i + 1,
      count,
      pct: ratings ? (100 * count) / ratings : 0,
    }));
    const evidence = [];
    const unusual = [];

    const scores = analysis.authenticityScores;
    let smooth = null;
    let auth = null;
    if (scores) {
      const authValue = parseFloat(scores.authenticityScore);
      auth = Number.isNaN(authValue) ? ['N/A', 'mid'] : scoreLabel(authValue, 4, 10);
      evidence.push({
        label: 'Authenticity score',
        value: Number.isNaN(authValue) ? 'N/A' : authValue.toFixed(1),
        tone: auth[1],
        note: Number.isNaN(authValue) ? 'No 2★ reviews to weigh.' : `${auth[0]}.`,
        text: 'How natural the star curve is, weighted by the share of 2★ reviews. Above 10 is Good, 4–10 Fair, below 4 Poor.',
      });
      const smoothValue = parseFloat(scores.distributionScore);
      smooth = scoreLabel(smoothValue, 10, 15);
      evidence.push({
        label: 'Star curve smoothness',
        value: smoothValue.toFixed(1),
        tone: smooth[1],
        note: `${smooth[0]}.`,
        text: 'How evenly each star count steps to the next. Bought reviews pile onto one rating and make jumps. Above 15 is Good.',
      });
    }

    const byStar = analysis.all?.wordCountByRating || {};
    const avgWords = analysis.all?.avgWordCount || 0;
    if (byStar[5] && avgWords) {
      const ratio = byStar[5] / avgWords;
      if (ratio < 0.5) unusual.push('the 5★ reviews are very short');
      evidence.push({
        label: '5★ avg word count',
        value: byStar[5].toFixed(1),
        tone: ratio < 0.5 ? 'bad' : 'good',
        note: `${ratio.toFixed(2)}× the average of ${avgWords.toFixed(1)}.`,
        grid: [1, 2, 3, 4, 5].map((s) => ({
          star: s,
          value: byStar[s] ? byStar[s].toFixed(1) : '–',
          sub: byStar[s] ? `${(byStar[s] / avgWords).toFixed(2)}×` : '',
        })),
        text: 'Bought 5★ reviews tend to be short. Below 0.5× the average is unusual.',
      });
    }

    const typos = typoRow(reviews);
    if (typos) evidence.push(typos);

    const five = analysis.fiveStarClustering;
    const one = analysis.oneStarClustering;
    if (five) {
      const cv = five.recent?.cv || 0;
      if (cv > 1) unusual.push('5★ reviews arrived in bursts this year');
      evidence.push({
        label: '5★ posted in bursts, last year',
        value: cv.toFixed(2),
        tone: cv > 1 ? 'bad' : 'good',
        note: cv > 1 ? 'Unusual.' : 'Normal.',
        rows: [
          ['5★, last year', five.recent?.cv || 0],
          ['5★, all time', five.allTime?.cv || 0],
          ['1★, last year', one?.recent?.cv || 0],
          ['1★, all time', one?.allTime?.cv || 0],
        ].map(([label, v]) => [label, v.toFixed(2)]),
        text: "How many reviews share a posting date. Above 1.0 is unusual. Google's dates get coarse with age, so all-time runs high.",
      });
    }

    return { ...verdict(smooth, auth, unusual, scores === undefined), curve, evidence };
  }

  // Guess (2026-10-18), not yet tuned: both scores Good and nothing unusual
  // reads as genuine; one unusual signal as mostly genuine; anything else as
  // read with care. An authenticity score of N/A (no 2★ reviews) counts as
  // not Good.
  function verdict(smooth, auth, unusual, predatesScores) {
    if (predatesScores) {
      return {
        word: 'Scrape again to judge',
        tone: 'mid',
        caption: [{ t: 'This scrape is older than the trust scores. Scrape the place again to see them.' }],
      };
    }
    if (!smooth) {
      return {
        word: 'Too few to judge',
        tone: 'mid',
        caption: [{ t: 'Too few ratings are spread across the stars to judge the curve.' }],
      };
    }
    const scoresOk = smooth[1] === 'good' && auth[1] === 'good';
    if (scoresOk && unusual.length === 0) {
      return {
        word: 'Looks genuine',
        tone: 'good',
        caption: [{ t: 'Smooth star curve, a healthy score, and nothing unusual in how the 5★ reviews were written or posted.' }],
      };
    }
    if (scoresOk && unusual.length === 1) {
      return {
        word: 'Mostly genuine',
        tone: 'mid',
        caption: [{ t: 'Smooth star curve and a healthy score, but ' }, { t: unusual[0], em: true }, { t: '.' }],
      };
    }
    const doubts = [
      smooth[1] !== 'good' ? `the star curve is ${smooth[0].toLowerCase()}` : null,
      auth[1] !== 'good' ? `the score is ${auth[0].toLowerCase()}` : null,
      ...unusual,
    ].filter(Boolean);
    const sentence = doubts.join(', ');
    return {
      word: 'Read with care',
      tone: 'bad',
      caption: [{ t: sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.' }],
    };
  }

  // Share of words misspelled, by rating. Per word, because long reviews have
  // more typos just for being long. Hidden when every count is 0: scrapes from
  // before the spell checker loaded stored 0 for every review.
  function typoRow(reviews) {
    if (!reviews.some((r) => r.spellingErrors > 0)) return null;
    const rate = {};
    for (const s of [1, 2, 3, 4, 5]) {
      const rs = reviews.filter((r) => r.rating === s);
      const w = rs.reduce((a, r) => a + words(r.text), 0);
      rate[s] = w ? (100 * rs.reduce((a, r) => a + (r.spellingErrors || 0), 0)) / w : null;
    }
    const others = reviews.filter((r) => r.rating !== 5);
    const otherWords = others.reduce((a, r) => a + words(r.text), 0);
    const otherRate = otherWords ? (100 * others.reduce((a, r) => a + (r.spellingErrors || 0), 0)) / otherWords : 0;
    if (rate[5] === null || !otherRate) return null;
    const ratio = rate[5] / otherRate;
    // Guess: unusual when 5★ reviews are under half as misspelled as the rest.
    const unusual = ratio < 0.5;
    return {
      label: '5★ typos',
      value: `${rate[5].toFixed(1)}%`,
      tone: unusual ? 'bad' : 'good',
      note: `${ratio.toFixed(1)}× the ${otherRate.toFixed(1)}% in other reviews.`,
      grid: [1, 2, 3, 4, 5].map((s) => ({ star: s, value: rate[s] === null ? '–' : `${rate[s].toFixed(1)}%` })),
      text: 'Share of words misspelled. One rating far cleaner than the rest is unusual.',
    };
  }

  // ---------- What people mention ----------

  function keywordRows(correlation, reviews) {
    if (!correlation) return [];
    return Object.entries(correlation).map(([name, k]) => {
      const high = round(100 - k.lowRatingPct);
      let one = k.oneStarPct;
      if (one === undefined) {
        // Older scrapes didn't store the 1★ share; count it from the reviews.
        const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const m = reviews.filter((r) => re.test(r.text || ''));
        one = m.length ? (100 * m.filter((r) => r.rating === 1).length) / m.length : 0;
      }
      return {
        name,
        count: k.reviewCount,
        high,
        tone: toneAtLeast(high, CUTOFFS.keywordHigh),
        one: round(one),
        flags: k.topRedFlags || [],
      };
    });
  }

  // ---------- Red flags ----------

  const groupOf = {};
  for (const [group, keywords] of Object.entries(RED_FLAG_GROUPS)) {
    for (const k of keywords) groupOf[k.toLowerCase()] = group;
  }

  function redFlagCard(reviews) {
    const low = reviews.filter((r) => r.rating <= 3);
    if (!reviews.length || !low.length) return null;
    const named = low.filter((r) => r.flaggedKeywords?.length);
    const groups = {};
    for (const r of named) {
      const seen = new Set();
      for (const w of new Set(r.flaggedKeywords.map((x) => x.toLowerCase()))) {
        const g = groupOf[w] || 'Other';
        groups[g] ??= { name: g, reviews: 0, words: {} };
        groups[g].words[w] = (groups[g].words[w] || 0) + 1;
        seen.add(g);
      }
      for (const g of seen) groups[g].reviews++;
    }
    const lowShare = (100 * low.length) / reviews.length;
    const namedShare = (100 * named.length) / low.length;
    return {
      lowShare: round(lowShare),
      lowTone: toneAtMost(lowShare, CUTOFFS.lowShare),
      namedShare: round(namedShare),
      namedTone: toneAtMost(namedShare, CUTOFFS.namedShare),
      groups: Object.values(groups)
        .sort((a, b) => b.reviews - a.reviews)
        .map((g) => ({
          name: g.name,
          reviews: g.reviews,
          words: Object.entries(g.words).sort((a, b) => b[1] - a[1]),
        })),
    };
  }

  return summarize;
})();
