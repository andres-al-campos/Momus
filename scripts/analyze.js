#!/usr/bin/env node

/**
 * Analyzes multiple Google Maps review JSON files and outputs a ranked CSV
 * Usage: node analyze.js [input-directory] [output.csv]
 */

const fs = require('fs');
const path = require('path');

// Configuration: Red flags you care about most (weights)
const CRITICAL_FLAGS = {
  'bedbugs': 100,
  'bed bugs': 100,
  'roaches': 80,
  'cockroaches': 80,
  'crime': 80,
  'break-in': 80,
  'break in': 80,
  'theft': 60,
  'stolen': 60,
  'mold': 70,
  'black mold': 90
};

const IMPORTANT_FLAGS = {
  'noise': 15,
  'loud': 15,
  'thin walls': 20,
  'maintenance': 10,
  'broken': 10,
  'leaks': 15,
  'pests': 25,
  'mice': 30,
  'rats': 40,
  'ants': 5,
  'smell': 15,
  'odor': 15
};

// Scoring weights
const WEIGHTS = {
  extremeReviewPct: -20,      // Lower extreme % = better
  middlePercentage: 5,        // More middle reviews = better
  middleSpellingErrors: -2,   // Fewer errors = better
  criticalFlags: -1,          // Per mention in middle reviews
  importantFlags: -1,         // Per mention in middle reviews
  fiveStarClusteringCV: -15,  // Lower CV = more evenly distributed = better
  shortFiveStarReviews: -5    // Penalty if 5-star reviews are suspiciously short
};

function readJsonFiles(directory) {
  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const fullPath = path.join(directory, f);
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        return { filename: f, data };
      } catch (err) {
        console.error(`Error reading ${f}:`, err.message);
        return null;
      }
    })
    .filter(Boolean);

  return files;
}

function calculateScore(data) {
  const middle = data.analysis.middle;
  const redFlags = middle.redFlagSummary || {};

  let score = 0;
  let criticalFlagCount = 0;
  let importantFlagCount = 0;

  // Critical red flags (deal-breakers)
  Object.entries(CRITICAL_FLAGS).forEach(([flag, weight]) => {
    const count = redFlags[flag] || 0;
    if (count > 0) {
      score -= count * weight;
      criticalFlagCount += count;
    }
  });

  // Important red flags
  Object.entries(IMPORTANT_FLAGS).forEach(([flag, weight]) => {
    const count = redFlags[flag] || 0;
    if (count > 0) {
      score -= count * weight;
      importantFlagCount += count;
    }
  });

  // Extreme review percentage
  score += (data.analysis.extremeReviewPct || data.analysis.suspicionScore || 0) * WEIGHTS.extremeReviewPct;

  // Middle review percentage (authenticity)
  score += (middle.percentageOfTotal || 0) * WEIGHTS.middlePercentage;

  // Spelling errors in middle reviews (quality)
  score += (middle.avgSpellingErrors || 0) * WEIGHTS.middleSpellingErrors;

  // 5-star clustering (recent reviews) - high CV = suspicious
  const recentCV = data.analysis.fiveStarClustering?.recent?.cv || 0;
  if (recentCV > 1.0) {
    score += recentCV * WEIGHTS.fiveStarClusteringCV;
  }

  // Short 5-star reviews are suspicious
  const all = data.analysis.all || {};
  const fiveStarWordCount = middle.wordCountByRating?.[5] || all.wordCountByRating?.[5] || 0;
  const middleWordCount = middle.avgWordCount || 0;
  if (fiveStarWordCount > 0 && middleWordCount > 0 && fiveStarWordCount < middleWordCount * 0.5) {
    // 5-star reviews are less than half the length of middle reviews
    score += WEIGHTS.shortFiveStarReviews;
  }

  return {
    totalScore: Math.round(score * 10) / 10,
    criticalFlagCount,
    importantFlagCount,
    recentCV,
    fiveStarWordCount
  };
}

function getTopRedFlags(redFlagSummary, limit = 5) {
  if (!redFlagSummary || Object.keys(redFlagSummary).length === 0) {
    return 'None';
  }

  const sorted = Object.entries(redFlagSummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([flag, count]) => `${flag}(${count})`)
    .join(', ');

  return sorted;
}

function analyzeLocations(files) {
  const results = files.map(({ filename, data }) => {
    const { totalScore, criticalFlagCount, importantFlagCount, recentCV, fiveStarWordCount } = calculateScore(data);
    const middle = data.analysis.middle;
    const all = data.analysis.all;

    // Extract location name from filename (e.g., "gmaps_camden_amber_oaks.json" -> "Camden Amber Oaks")
    let locationName = 'Unknown';
    const nameMatch = filename.match(/^gmaps_(.+)\.json$/);
    if (nameMatch) {
      locationName = nameMatch[1]
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Calculate star rating ratios to understand distribution curve
    const dist = data.stats.distribution || {};
    const count5 = dist[5] || 0;
    const count4 = dist[4] || 0;
    const count3 = dist[3] || 0;
    const count2 = dist[2] || 0;
    const count1 = dist[1] || 0;

    // Calculate ALL consecutive ratios to measure curve shape
    const ratio2to1 = count1 > 0 ? count2 / count1 : 0;
    const ratio3to2 = count2 > 0 ? count3 / count2 : 0;
    const ratio4to3 = count3 > 0 ? count4 / count3 : 0;
    const ratio5to4 = count4 > 0 ? count5 / count4 : 0;

    // Calculate standard deviation of ratios to measure "jaggedness"
    // Low SD = smooth exponential curve, High SD = U-shaped/manipulated
    let curveJaggedness = '-';
    const ratios = [ratio2to1, ratio3to2, ratio4to3, ratio5to4].filter(r => r > 0);
    if (ratios.length >= 3) {
      const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      const squareDiffs = ratios.map(r => Math.pow(r - mean, 2));
      const variance = squareDiffs.reduce((a, b) => a + b, 0) / ratios.length;
      curveJaggedness = Math.sqrt(variance).toFixed(2);
    }

    // Individual ratios for reference
    const ratio4to3Str = count3 > 0 ? ratio4to3.toFixed(2) : (count4 > 0 ? '∞' : '-');
    const ratio4to2Str = count2 > 0 ? (count4 / count2).toFixed(2) : (count4 > 0 ? '∞' : '-');
    const ratio4to1Str = count1 > 0 ? (count4 / count1).toFixed(2) : (count4 > 0 ? '∞' : '-');

    // Authenticity scores (lower = better)
    // Penalizes BOTH manipulation (high jaggedness) AND negativity
    const oneStarPct = (count1 / (data.stats.totalReviews || 1)) * 100;
    const twoStarPct = (count2 / (data.stats.totalReviews || 1)) * 100;
    const lowStarPct = ((count1 + count2) / (data.stats.totalReviews || 1)) * 100;

    const auth1Star = curveJaggedness !== '-' ? (parseFloat(curveJaggedness) * oneStarPct).toFixed(1) : '-';
    const auth2Star = curveJaggedness !== '-' ? (parseFloat(curveJaggedness) * twoStarPct).toFixed(1) : '-';
    const authLowStar = curveJaggedness !== '-' ? (parseFloat(curveJaggedness) * lowStarPct).toFixed(1) : '-';

    return {
      name: locationName,
      address: data.summary.address || '',
      score: totalScore,
      avgRating: data.stats.averageRating || 0,
      totalReviews: data.stats.totalReviews || 0,
      middleReviews: middle.reviewCount || 0,
      middlePercent: middle.percentageOfTotal || 0,
      extremeReviewPct: data.analysis.extremeReviewPct || data.analysis.suspicionScore || 0,
      criticalFlags: criticalFlagCount,
      importantFlags: importantFlagCount,
      topMiddleFlags: getTopRedFlags(middle.redFlagSummary),
      topAllFlags: getTopRedFlags(all.redFlagSummary),
      middleSpellingErrors: middle.avgSpellingErrors || 0,
      recentClusterCV: recentCV,
      allTimeClusterCV: data.analysis.fiveStarClustering?.allTime?.cv || 0,
      fiveStarAvgWords: fiveStarWordCount,
      middleAvgWords: middle.avgWordCount || 0,
      ratio4to3: ratio4to3Str,
      ratio4to2: ratio4to2Str,
      ratio4to1: ratio4to1Str,
      curveJaggedness: curveJaggedness,
      oneStarPct: oneStarPct,
      twoStarPct: twoStarPct,
      auth1Star: auth1Star,
      auth2Star: auth2Star,
      authLowStar: authLowStar,
      filename
    };
  });

  // Sort by score (higher is better)
  results.sort((a, b) => b.score - a.score);

  return results;
}

function generateCSV(results) {
  const headers = [
    'Rank',
    'Score',
    'Name',
    'Address',
    'Avg Rating',
    'Total Reviews',
    'Middle Reviews',
    'Middle %',
    'Extreme Review %',
    'Critical Flags',
    'Important Flags',
    'Top Middle Flags',
    'Top All Flags',
    'Middle Spelling Errors',
    '5★ Cluster CV (Recent)',
    '5★ Cluster CV (All)',
    '5★ Avg Words',
    'Middle Avg Words',
    '4★/3★ Ratio',
    '4★/2★ Ratio',
    '4★/1★ Ratio',
    'Curve Jaggedness',
    '1★ %',
    '2★ %',
    'Auth Score (1★)',
    'Auth Score (2★)',
    'Auth Score (1★+2★)',
    'Filename'
  ];

  const rows = results.map((r, i) => [
    i + 1,
    r.score,
    escapeCSV(r.name),
    escapeCSV(r.address),
    r.avgRating.toFixed(1),
    r.totalReviews,
    r.middleReviews,
    r.middlePercent.toFixed(1) + '%',
    (r.extremeReviewPct * 100).toFixed(0) + '%',
    r.criticalFlags,
    r.importantFlags,
    escapeCSV(r.topMiddleFlags),
    escapeCSV(r.topAllFlags),
    r.middleSpellingErrors.toFixed(1),
    r.recentClusterCV.toFixed(2),
    r.allTimeClusterCV.toFixed(2),
    r.fiveStarAvgWords.toFixed(1),
    r.middleAvgWords.toFixed(1),
    r.ratio4to3,
    r.ratio4to2,
    r.ratio4to1,
    r.curveJaggedness,
    r.oneStarPct.toFixed(1) + '%',
    r.twoStarPct.toFixed(1) + '%',
    r.auth1Star,
    r.auth2Star,
    r.authLowStar,
    r.filename
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}

function escapeCSV(value) {
  if (typeof value !== 'string') return value;
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Main
function main() {
  const inputDir = process.argv[2] || './reviews';
  const outputFile = process.argv[3] || path.join(inputDir, 'rankings.csv');

  // A directory the user named should exist; only the default gets created.
  if (process.argv[2] && !fs.existsSync(inputDir)) {
    console.error(`Directory not found: ${inputDir}`);
    console.error('Check the path, or run with no arguments to use ./reviews.');
    process.exit(1);
  }

  // Create reviews directory if it doesn't exist
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
    console.log(`Created directory: ${inputDir}`);
    console.log('Add your scraped JSON files to this directory and run again.');
    process.exit(0);
  }

  console.log(`Reading JSON files from: ${inputDir}`);

  const files = readJsonFiles(inputDir);

  if (files.length === 0) {
    console.error('No JSON files found in directory');
    process.exit(1);
  }

  console.log(`Found ${files.length} JSON files`);

  const results = analyzeLocations(files);
  const csv = generateCSV(results);

  fs.writeFileSync(outputFile, csv, 'utf8');

  console.log(`\nRankings saved to: ${outputFile}`);
  console.log('\nTop 5:');
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} (Score: ${r.score})`);
    console.log(`   Critical flags: ${r.criticalFlags}, Important flags: ${r.importantFlags}`);
    console.log(`   Middle reviews: ${r.middleReviews} (${r.middlePercent.toFixed(1)}%)`);
    console.log('');
  });
}

main();
