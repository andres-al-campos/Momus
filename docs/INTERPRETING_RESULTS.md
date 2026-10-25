# Interpreting Results - Quick Reference Guide

This guide helps you understand what the scraped data means for apartment hunting.

## The Suspicion Score

**What it measures**: How "bimodal" the review distribution is (lots of 5⭐ and 1⭐, few middle reviews).

### Score Ranges

| Score | Meaning | Action |
|-------|---------|--------|
| 0.0 - 0.3 | Natural distribution | ✅ Looks legitimate |
| 0.4 - 0.6 | Slightly suspicious | ⚠️ Read reviews carefully |
| 0.7 - 0.8 | Suspicious | 🚨 Likely fake positive reviews |
| 0.9 - 1.0 | Highly suspicious | 🛑 Almost certainly manipulated |

### Why it matters

**Natural distribution** (low suspicion):
- People have varied experiences (1⭐ to 5⭐)
- Plenty of 3⭐ and 4⭐ reviews
- Indicates authentic feedback

**Bimodal distribution** (high suspicion):
- Mostly 5⭐ (fake positive reviews)
- Some 1⭐ (real negative experiences)
- Very few 2⭐, 3⭐, 4⭐ (the most honest ratings)
- Suggests management is padding with fake 5⭐ reviews

### Example

```
Apartment A: Suspicion Score 0.25
  5⭐: 50 reviews
  4⭐: 45 reviews
  3⭐: 30 reviews
  2⭐: 15 reviews
  1⭐: 10 reviews
  → Good mix, looks natural ✅

Apartment B: Suspicion Score 0.89
  5⭐: 180 reviews
  4⭐: 12 reviews
  3⭐: 5 reviews
  2⭐: 8 reviews
  1⭐: 18 reviews
  → Almost no middle reviews, very suspicious 🚨
```

---

## Spelling Errors by Rating

**What it measures**: Average spelling mistakes per review at each star level.

### What to look for

**Red flag pattern** (suggests fake 5⭐ reviews):
```json
{
  "5": 0.3,  ← Very few errors (might be scripted)
  "4": 1.1,
  "3": 2.4,
  "2": 2.9,
  "1": 3.2   ← More errors (emotional, rushed writing)
}
```

**Natural pattern**:
```json
{
  "5": 1.8,  ← Similar across all ratings
  "4": 1.5,
  "3": 2.1,
  "2": 2.0,
  "1": 2.5
}
```

### Why it matters

- **Fake 5⭐ reviews** are often written carefully (or AI-generated) → fewer errors
- **Real reviews** (all ratings) have natural variation in spelling
- If 5⭐ reviews are suspiciously perfect while 1⭐ reviews have many errors, something's off

### ⚠️ Limitations

- Includes proper nouns (names, places) as "errors"
- Doesn't account for non-native English speakers
- Use as one data point, not the only factor

---

## Red Flags

**What it measures**: Mentions of serious problems in reviews.

### Critical Red Flags (Avoid)

🪳 **Pests** - roaches, bedbugs, mice
- Even 1-2 mentions is concerning
- Check dates - recent or old?
- 5+ mentions = serious ongoing problem

🦠 **Mold** - mold, mildew, water damage
- Health hazard, hard to fix
- Any mention deserves investigation

### Serious Red Flags (Investigate)

🚨 **Crime/Safety** - theft, break-ins, unsafe
- Read the specific reviews
- Check recent mentions
- Look at neighborhood crime stats separately

🏢 **Management** - ignored, unresponsive, deposit issues
- Pattern of complaints = systemic issue
- Isolated incidents = could be coincidence

### Moderate Red Flags (Consider)

🔊 **Noise** - thin walls, loud neighbors
- Very common in apartments
- Consider if you're noise-sensitive
- 10+ mentions = legitimate concern

### Example Analysis

```json
"redFlagSummary": {
  "roach": 12,        ← 🛑 DEALBREAKER
  "mold": 8,          ← 🛑 DEALBREAKER
  "ignored": 15,      ← 🚨 Bad management
  "thin walls": 23,   ← ⚠️ Expected for apartments
  "loud": 18          ← ⚠️ Consider tolerance
}
```

**Decision**: Don't rent here due to pests + mold + management issues.

---

## Google Keywords

These are the keyword filters Google automatically extracts.

### What to look for

**Positive keywords** (high counts):
- "amenities", "staff", "location", "clean", "quiet"

**Negative keywords** (high counts):
- "maintenance", "management", "issues", "problems"

### Example

```json
"googleKeywords": {
  "maintenance": 76,  ← Mentioned a lot (good or bad?)
  "staff": 45,        ← Probably positive context
  "location": 38,     ← Neutral, usually positive
  "issues": 22        ← Negative
}
```

**Action**: Read reviews to see if "maintenance" is positive ("great maintenance team") or negative ("maintenance never responds").

---

## Distribution Analysis

### What's normal?

**Typical apartment complex**:
- 40-50% five-star
- 20-30% four-star
- 10-15% three-star
- 10-15% two-star
- 10-20% one-star

### Red flag patterns

**Fake positive padding**:
```
5⭐: 80%  ← Too many
4⭐: 5%   ← Too few
3⭐: 2%   ← Too few
2⭐: 3%   ← Too few
1⭐: 10%  ← Real complaints
```

**Competitor sabotage** (rare):
```
5⭐: 60%
4⭐: 20%
3⭐: 5%
2⭐: 5%
1⭐: 10%  ← Clusters of suspiciously similar 1⭐ reviews
```

---

## Using the Filtered Export

**Checkbox**: "Only export 2-4 star reviews"

### Why filter to 2-4 stars?

- **5⭐ reviews** - Often fake, or just "everything is great!" with no details
- **1⭐ reviews** - Sometimes emotional, may be outliers or resolved issues
- **2-4⭐ reviews** - Most balanced, detailed, and honest

### Example workflow

1. Scrape all reviews
2. Check suspicion score and red flags
3. Export 2-4⭐ only for detailed reading
4. Focus on specific concerns (pests, management, noise)

---

## Quick Decision Matrix

| Suspicion Score | Red Flags | Decision |
|-----------------|-----------|----------|
| < 0.4 | None or minor | ✅ Safe to visit |
| < 0.4 | Serious (pests/mold) | 🚨 Investigate further |
| 0.4 - 0.7 | Minor | ⚠️ Read middle reviews |
| 0.4 - 0.7 | Serious | 🛑 Probably avoid |
| > 0.7 | Any | 🛑 Avoid, likely fake reviews |

---

## Example Real-World Comparison

### Apartment A: "The Preserve"
```
Suspicion Score: 0.23
Total Reviews: 245
Red Flags: thin walls (12), loud (8), deposit (2)
Distribution: Natural curve
Decision: ✅ Worth touring - minor noise concerns
```

### Apartment B: "Luxury Heights"
```
Suspicion Score: 0.91
Total Reviews: 220
Red Flags: roach (15), mold (9), ignored (22)
Distribution: 180 five-star, 5 three-star, 18 one-star
Decision: 🛑 Avoid - fake reviews + serious pest/mold issues
```

### Apartment C: "River View"
```
Suspicion Score: 0.55
Total Reviews: 89
Red Flags: maintenance (8), crime (3)
Distribution: Somewhat bimodal
Decision: ⚠️ Investigate - read 2-4 star reviews carefully
```

---

## Tips for Deep Analysis

1. **Sort reviews by date** - Are problems recent or old?
2. **Look for response patterns** - Does management respond professionally?
3. **Check review length** - Fake 5⭐ reviews are often very short
4. **Cross-reference** - Check Yelp, ApartmentRatings for consistency
5. **Visit in person** - No amount of data replaces seeing it yourself

---

## Final Reminder

This tool helps you **filter out obvious bad options** quickly. It's not a substitute for:

- Visiting in person
- Checking with current residents
- Reviewing lease terms
- Inspecting the actual unit
- Researching the neighborhood

Use it to save time, not to make final decisions!
