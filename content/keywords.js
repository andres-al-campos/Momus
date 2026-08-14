// Chrome exposes `chrome`, Firefox exposes `browser`. Content scripts share one
// scope, so this alias is declared here only - keywords.js loads first - and is
// visible to scraper.js and content.js.
const browser = globalThis.browser ?? globalThis.chrome;

// Red flag keywords for apartment reviews
const RED_FLAG_KEYWORDS = [
  // Pests
  "roach", "roaches", "cockroach", "cockroaches", "bug", "bugs",
  "pest", "pests", "mice", "mouse", "rat", "rats", "ant", "ants",
  "bedbug", "bedbugs", "bed bug", "bed bugs", "insect", "insects",
  "infestation", "exterminator",

  // Structural/Health
  "mold", "moldy", "mildew", "leak", "leaking", "leaks", "leaky",
  "flooding", "flooded", "flood", "water damage", "sewage",
  "ceiling collapse", "cracked", "broken pipe", "plumbing issue",

  // Safety/Crime
  "crime", "criminal", "theft", "stolen", "break-in", "break in",
  "broken into", "unsafe", "scary", "dangerous", "sketchy",
  "homeless", "drug", "drugs", "police", "shooting", "assault",
  "burglary", "burglar", "robbery", "vandalism", "car broken",

  // Management issues
  "ignored", "ignores", "unresponsive", "no response", "never responded",
  "terrible management", "worst management", "avoid", "scam", "fraudulent",
  "dishonest", "lied", "lying", "refuse to fix", "won't fix",
  "deposit", "didn't return", "kept deposit", "illegal",

  // Noise
  "loud", "noise", "noisy", "thin walls", "hear neighbors",
  "hear everything", "paper thin", "stomping", "party", "parties",

  // Move-out red flags
  "moved out", "moving out", "breaking lease", "broke lease",
  "do not rent", "don't rent", "worst apartment", "regret",
  "nightmare", "hell", "horrible", "terrible place"
];

// Lowercase set for fast lookup
const RED_FLAG_SET = new Set(RED_FLAG_KEYWORDS.map(k => k.toLowerCase()));
