// Red flag keywords for apartment reviews, grouped by kind. The popup shows
// the groups under these names, so a review mentioning "roaches" and "mice"
// counts once under Pests.
const RED_FLAG_GROUPS = {
  'Pests': [
    "roach", "roaches", "cockroach", "cockroaches", "bug", "bugs",
    "pest", "pests", "mice", "mouse", "rat", "rats", "ant", "ants",
    "bedbug", "bedbugs", "bed bug", "bed bugs", "insect", "insects",
    "infestation", "exterminator"
  ],

  'Leaks & mold': [
    "mold", "moldy", "mildew", "leak", "leaking", "leaks", "leaky",
    "flooding", "flooded", "flood", "water damage", "sewage",
    "ceiling collapse", "cracked", "broken pipe", "plumbing issue"
  ],

  'Crime & safety': [
    "crime", "criminal", "theft", "stolen", "break-in", "break in",
    "broken into", "unsafe", "scary", "dangerous", "sketchy",
    "homeless", "drug", "drugs", "police", "shooting", "assault",
    "burglary", "burglar", "robbery", "vandalism", "car broken"
  ],

  'Management': [
    "ignored", "ignores", "unresponsive", "no response", "never responded",
    "terrible management", "worst management", "avoid", "scam", "fraudulent",
    "dishonest", "lied", "lying", "refuse to fix", "won't fix",
    "deposit", "didn't return", "kept deposit", "illegal"
  ],

  'Noise': [
    "loud", "noise", "noisy", "thin walls", "hear neighbors",
    "hear everything", "paper thin", "stomping", "party", "parties"
  ],

  'Move-out warnings': [
    "moved out", "moving out", "breaking lease", "broke lease",
    "do not rent", "don't rent", "worst apartment", "regret",
    "nightmare", "hell", "horrible", "terrible place"
  ]
};

const RED_FLAG_KEYWORDS = Object.values(RED_FLAG_GROUPS).flat();
