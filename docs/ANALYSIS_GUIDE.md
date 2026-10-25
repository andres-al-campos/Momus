# Understanding the Three-Way Analysis

## Overview

The extension provides three separate analyses to help you spot fake reviews and real problems:

1. **`analysis.all`** - All reviews (1-5 stars)
2. **`analysis.middle`** - 2-4 star reviews (most trustworthy)
3. **`analysis.extreme`** - 1 & 5 star reviews (potentially fake/biased)

## Why Three Analyses?

### The Problem with Extremes
- **5-star reviews**: Often fake, paid, or from friends/family
- **1-star reviews**: Sometimes from competitors or one-off bad experiences
- **2-4 star reviews**: Most likely to be honest, balanced feedback from real tenants

### What to Compare

#### 1. Red Flags Distribution
**Good Sign:**
```json
"all": { "redFlagSummary": { "noise": 12 } },
"middle": { "redFlagSummary": { "noise": 2 } },
"extreme": { "redFlagSummary": { "noise": 10 } }
```
→ Most noise complaints are in extreme reviews (likely exaggerated or fake)

**Bad Sign:**
```json
"all": { "redFlagSummary": { "noise": 12 } },
"middle": { "redFlagSummary": { "noise": 10 } },
"extreme": { "redFlagSummary": { "noise": 2 } }
```
→ Most noise complaints are in 2-4 star reviews (real problem!)

#### 2. Spelling Errors
**Suspicious Pattern:**
```json
"middle": { "avgSpellingErrors": 1.2 },
"extreme": { "avgSpellingErrors": 3.5 }
```
→ Extreme reviews have way more spelling errors (possibly fake)

**Normal Pattern:**
```json
"middle": { "avgSpellingErrors": 1.5 },
"extreme": { "avgSpellingErrors": 1.8 }
```
→ Similar error rates across all reviews (probably authentic)

#### 3. Volume (Suspicion Score)
The suspicion score is calculated as: `1 - (middle reviews / total reviews)`

- **0.0 - 0.3**: Low suspicion (healthy mix of ratings)
- **0.4 - 0.6**: Moderate suspicion (somewhat bimodal)
- **0.7 - 1.0**: High suspicion (almost all extremes, very few middle reviews)

**Example:**
```json
"suspicionScore": 0.89,
"all": { "totalReviews": 223 },
"middle": { "totalReviews": 25 },
"extreme": { "totalReviews": 198 }
```
→ Only 25 out of 223 reviews are 2-4 stars. High chance of fake 5-star padding!

## Real-World Examples

### Healthy Apartment
```json
{
  "suspicionScore": 0.35,
  "all": {
    "totalReviews": 100,
    "redFlagSummary": { "noise": 8, "maintenance": 5 }
  },
  "middle": {
    "totalReviews": 65,
    "redFlagSummary": { "noise": 2, "maintenance": 3 }
  },
  "extreme": {
    "totalReviews": 35,
    "redFlagSummary": { "noise": 6, "maintenance": 2 }
  }
}
```
**Interpretation**: Low suspicion score, most red flags in extremes. Probably a decent place with some exaggerated negative reviews.

### Suspicious Apartment
```json
{
  "suspicionScore": 0.88,
  "all": {
    "totalReviews": 200,
    "redFlagSummary": { "roach": 15, "mold": 12 }
  },
  "middle": {
    "totalReviews": 24,
    "redFlagSummary": { "roach": 14, "mold": 11 }
  },
  "extreme": {
    "totalReviews": 176,
    "redFlagSummary": { "roach": 1, "mold": 1 }
  }
}
```
**Interpretation**: HIGH ALERT! Almost all reviews are 1 or 5 stars (fake 5-star padding). The few honest middle reviews mention serious issues (roaches, mold). AVOID!

### Real Problem Apartment
```json
{
  "suspicionScore": 0.30,
  "all": {
    "totalReviews": 100,
    "redFlagSummary": { "noise": 45, "thin walls": 38 }
  },
  "middle": {
    "totalReviews": 70,
    "redFlagSummary": { "noise": 42, "thin walls": 35 }
  },
  "extreme": {
    "totalReviews": 30,
    "redFlagSummary": { "noise": 3, "thin walls": 3 }
  }
}
```
**Interpretation**: Low suspicion score (healthy distribution), but TONS of noise/thin wall complaints in middle reviews. Real, consistent problem. AVOID!

## Quick Decision Guide

1. **Check suspicion score**
   - High (>0.7)? Lots of fake reviews likely

2. **Compare red flags: middle vs extreme**
   - More in middle? Real problem
   - More in extreme? Probably exaggerated

3. **Check spelling errors**
   - Way higher in extremes? Fake reviews likely

4. **Final decision**
   - Trust middle reviews the most
   - If middle reviews have serious red flags → avoid
   - If suspicion score high + few middle reviews → investigate further or skip
