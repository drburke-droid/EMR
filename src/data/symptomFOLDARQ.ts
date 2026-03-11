// symptomFOLDARQ.ts — FOLDARQ ring configuration per symptom
// F = Frequency, O = Onset, L = Location, D = Duration,
// A = Association, R = Relief/Aggravating, Q = Quantify

export type SymptomFOLDARQConfig = {
  frequency: string[];
  onset: string[];
  location: string[];
  duration: string[];
  association: string[];
  relief: string[];
  aggravating: string[];
  quantify: string[];
  nlpTerm?: string; // NLP engine term for augmenting association ring
};

// ── Shared defaults ──────────────────────────────────────────

const defaultFrequency = [
  "constant", "daily", "several x/wk", "weekly",
  "intermittent", "episodic", "occasional", "rare",
];

const defaultOnset = [
  "today", "yesterday", "days", "1 week",
  "2-3 weeks", "1 month", "2-3 months",
  "6+ months", "1+ years", "gradual", "sudden", "longstanding",
];

const defaultDuration = [
  "seconds", "minutes", "hours", "all day",
  "days", "constant", "variable",
];

const defaultQuantify = [
  "1/10", "2/10", "3/10", "4/10", "5/10",
  "6/10", "7/10", "8/10", "9/10", "10/10",
];

const defaultLaterality = ["OD", "OS", "OU"];

// ── Per-symptom overrides ────────────────────────────────────

const symptomConfigs: Record<string, Partial<SymptomFOLDARQConfig>> = {

  // ── Vision ──
  Blur: {
    location: ["OD", "OS", "OU", "near", "distance", "all distances"],
    association: ["HA", "eyestrain", "diplopia", "ghosting", "glare", "halos", "distortion", "tearing"],
    relief: ["glasses", "new Rx", "squinting", "rest", "closing one eye"],
    aggravating: ["reading", "computer", "driving", "dim light", "end of day"],
    nlpTerm: "blurred vision",
  },

  "Near blur": {
    location: ["OD", "OS", "OU"],
    association: ["HA", "eyestrain", "fatigue", "difficulty reading", "diplopia"],
    relief: ["holding further", "rest", "breaks", "reading glasses"],
    aggravating: ["reading", "near work", "small print", "prolonged near", "end of day"],
    nlpTerm: "blurred vision",
  },

  "Distance blur": {
    location: ["OD", "OS", "OU"],
    association: ["HA", "squinting", "difficulty driving", "difficulty board"],
    relief: ["squinting", "glasses", "moving closer"],
    aggravating: ["driving", "distance viewing", "dim light", "night"],
    nlpTerm: "blurred vision",
  },

  "Intermittent blur": {
    location: ["OD", "OS", "OU", "near", "distance"],
    association: ["HA", "eyestrain", "dryness", "tearing", "diplopia"],
    relief: ["blinking", "rest", "artificial tears"],
    aggravating: ["reading", "computer", "end of day", "wind", "dry environment"],
    nlpTerm: "blurred vision",
  },

  // ── Binocular / Motor ──
  Diplopia: {
    location: ["OD", "OS", "OU", "horizontal", "vertical", "oblique", "near", "distance", "all distances"],
    association: ["HA", "blur", "ptosis", "dizziness", "nausea", "head tilt"],
    relief: ["closing one eye", "head tilt", "rest", "prism"],
    aggravating: ["fatigue", "end of day", "distance viewing", "near work", "lateral gaze"],
    nlpTerm: "diplopia",
  },

  Eyestrain: {
    location: ["OD", "OS", "OU", "bilateral", "frontal", "periorbital", "retro-orbital"],
    association: ["HA", "blur", "neck pain", "fatigue", "nausea", "dry eyes"],
    relief: ["rest", "closing eyes", "breaks", "distance viewing", "new Rx"],
    aggravating: ["reading", "computer", "near work", "prolonged use", "small print", "end of day"],
    nlpTerm: "asthenopia",
  },

  // ── Pain / Discomfort ──
  Headache: {
    location: ["frontal", "temporal", "retro-orbital", "occipital", "vertex", "unilateral L", "unilateral R", "bilateral", "periorbital"],
    association: ["eyestrain", "blur", "nausea", "photophobia", "neck pain", "dizziness", "aura", "vomiting"],
    relief: ["rest", "sleep", "dark room", "NSAID", "acetaminophen", "caffeine"],
    aggravating: ["reading", "computer", "bright light", "stress", "near work", "end of day", "noise"],
    nlpTerm: "headache",
  },

  "Neck pain": {
    location: ["bilateral", "left", "right", "posterior", "base of skull", "upper trap"],
    association: ["HA", "eyestrain", "dizziness", "stiffness", "shoulder pain"],
    relief: ["rest", "heat", "stretching", "massage", "NSAID"],
    aggravating: ["computer", "reading", "prolonged posture", "driving", "stress"],
    nlpTerm: "neck pain",
  },

  Photophobia: {
    location: ["OD", "OS", "OU"],
    association: ["HA", "tearing", "redness", "pain", "nausea", "blur"],
    relief: ["dark room", "sunglasses", "hat", "dim lighting", "closing eyes"],
    aggravating: ["bright light", "fluorescent", "sunlight", "screens", "driving"],
    nlpTerm: "photophobia",
  },

  Pain: {
    location: ["OD", "OS", "OU", "retro-orbital", "periorbital", "surface", "deep", "sharp", "dull", "throbbing"],
    association: ["redness", "photophobia", "tearing", "blur", "HA", "nausea", "lid swelling"],
    relief: ["NSAID", "acetaminophen", "cold compress", "rest", "dark room", "closing eye"],
    aggravating: ["eye movement", "bright light", "touch", "blinking", "reading"],
    nlpTerm: "eye pain",
  },

  // ── Ocular Surface ──
  "Red eye": {
    location: ["OD", "OS", "OU", "nasal", "temporal", "superior", "inferior", "diffuse", "sectoral", "limbal", "interpalpebral"],
    association: ["pain", "discharge", "itching", "photophobia", "tearing", "FB sensation", "blur", "lid swelling"],
    relief: ["artificial tears", "cold compress", "allergy drop", "steroid drop"],
    aggravating: ["wind", "allergens", "CL wear", "rubbing", "smoke", "dust"],
    nlpTerm: "redness",
  },

  Dryness: {
    location: ["OD", "OS", "OU"],
    association: ["FB sensation", "irritation", "redness", "tearing", "blur", "burning", "stinging"],
    relief: ["artificial tears", "warm compress", "humidifier", "blinking", "omega-3"],
    aggravating: ["computer", "reading", "wind", "dry environment", "AC/heat", "CL wear", "end of day"],
    nlpTerm: "dry eye",
  },

  Irritation: {
    location: ["OD", "OS", "OU", "lid margins", "inner canthi"],
    association: ["dryness", "redness", "tearing", "FB sensation", "burning", "itching"],
    relief: ["artificial tears", "cold compress", "warm compress", "removing CL"],
    aggravating: ["wind", "smoke", "CL wear", "reading", "computer", "end of day"],
    nlpTerm: "irritation",
  },

  "FB sensation": {
    location: ["OD", "OS", "OU", "upper lid", "lower lid", "medial", "lateral"],
    association: ["tearing", "redness", "pain", "irritation", "dryness", "scratching"],
    relief: ["artificial tears", "blinking", "removing CL", "flushing"],
    aggravating: ["blinking", "eye movement", "CL wear", "wind"],
    nlpTerm: "foreign body sensation",
  },

  Tearing: {
    location: ["OD", "OS", "OU"],
    association: ["irritation", "dryness", "redness", "FB sensation", "burning", "blur"],
    relief: ["wiping", "artificial tears", "warm compress", "indoors"],
    aggravating: ["wind", "cold air", "reading", "bright light", "allergens"],
    nlpTerm: "tearing",
  },

  Discharge: {
    location: ["OD", "OS", "OU"],
    association: ["redness", "crusting", "mattering", "lid sticking", "itching", "tearing"],
    relief: ["warm compress", "lid scrubs", "antibiotic drop"],
    aggravating: ["waking", "CL wear", "rubbing"],
    nlpTerm: "discharge",
  },

  Itching: {
    location: ["OD", "OS", "OU", "lids", "inner canthi", "periorbital"],
    association: ["redness", "tearing", "swelling", "rhinitis", "sneezing", "seasonal"],
    relief: ["allergy drop", "cold compress", "avoiding allergen", "oral antihistamine"],
    aggravating: ["allergens", "pollen", "dust", "pets", "rubbing", "spring/fall"],
    nlpTerm: "itching",
  },

  // ── Posterior segment ──
  Floaters: {
    location: ["OD", "OS", "OU", "central", "paracentral", "peripheral", "diffuse"],
    association: ["flashes", "blur", "curtain/veil", "cobwebs", "spots", "rings"],
    relief: ["none", "looking away", "time"],
    aggravating: ["bright background", "white surfaces", "blue sky", "reading"],
    nlpTerm: "floaters",
  },

  Flashes: {
    location: ["OD", "OS", "temporal VF", "nasal VF", "superior VF", "inferior VF", "central", "arc-shaped"],
    association: ["floaters", "curtain/veil", "blur", "HA", "aura"],
    relief: ["none", "rest", "dark room", "time"],
    aggravating: ["dark room", "eye movement", "head movement"],
    nlpTerm: "photopsia",
  },

  Distortion: {
    location: ["OD", "OS", "OU", "central", "paracentral"],
    association: ["blur", "metamorphopsia", "micropsia", "macropsia", "scotoma"],
    relief: ["none", "closing one eye"],
    aggravating: ["reading", "faces", "straight lines"],
    nlpTerm: "metamorphopsia",
  },

  "Reduced night vision": {
    location: ["OD", "OS", "OU"],
    association: ["glare", "halos", "blur", "difficulty driving", "slow adaptation"],
    relief: ["brighter lighting", "avoiding night driving"],
    aggravating: ["dim light", "night driving", "sudden dark"],
    nlpTerm: "night blindness",
  },

  // ── BV / Neuro ──
  "Motion sensitivity": {
    location: ["bilateral"],
    association: ["dizziness", "nausea", "HA", "vertigo", "balance issues", "anxiety"],
    relief: ["rest", "sitting", "fixating", "closing eyes"],
    aggravating: ["scrolling", "busy patterns", "crowds", "driving", "head movement"],
    nlpTerm: "motion sensitivity",
  },

  "Reading difficulty": {
    location: ["OD", "OS", "OU"],
    association: ["blur", "eyestrain", "HA", "words moving", "skipping lines", "fatigue", "diplopia"],
    relief: ["rest", "breaks", "larger text", "reading glasses", "finger tracking"],
    aggravating: ["small print", "prolonged reading", "fatigue", "poor lighting"],
    nlpTerm: "reading difficulty",
  },

  "Computer discomfort": {
    location: ["OD", "OS", "OU"],
    association: ["eyestrain", "blur", "dryness", "HA", "neck pain"],
    relief: ["breaks", "20-20-20 rule", "screen adjustment", "artificial tears"],
    aggravating: ["prolonged screen", "small text", "multiple monitors", "glare on screen"],
    nlpTerm: "computer vision syndrome",
  },

  Dizziness: {
    location: ["bilateral"],
    association: ["nausea", "vertigo", "HA", "balance issues", "motion sensitivity", "lightheadedness"],
    relief: ["rest", "sitting", "dark room", "fixating"],
    aggravating: ["standing", "head movement", "busy environments", "looking up"],
    nlpTerm: "dizziness",
  },

  "Vertigo with gaze shift": {
    location: ["bilateral"],
    association: ["nausea", "dizziness", "oscillopsia", "motion sensitivity", "imbalance"],
    relief: ["rest", "fixation", "slow movements", "sitting"],
    aggravating: ["rapid gaze shifts", "head turns", "looking up", "busy environments"],
    nlpTerm: "vertigo",
  },
};

// ── Config builder ───────────────────────────────────────────

export function getFOLDARQConfig(symptom: string): SymptomFOLDARQConfig {
  const override = symptomConfigs[symptom] ?? {};
  return {
    frequency: override.frequency ?? defaultFrequency,
    onset: override.onset ?? defaultOnset,
    location: override.location ?? defaultLaterality,
    duration: override.duration ?? defaultDuration,
    association: override.association ?? [],
    relief: override.relief ?? [],
    aggravating: override.aggravating ?? [],
    quantify: override.quantify ?? defaultQuantify,
    nlpTerm: override.nlpTerm,
  };
}

// ── Ring metadata ────────────────────────────────────────────

export const FOLDARQ_KEYS = ["F", "O", "L", "D", "A", "R", "Q"] as const;
export const FOLDARQ_LABELS = [
  "Frequency", "Onset", "Location", "Duration",
  "Association", "Relief", "Quantify",
];
export const FOLDARQ_COLORS = [
  "#8b5cf6", // F purple
  "#3b82f6", // O blue
  "#06b6d4", // L cyan
  "#10b981", // D green
  "#f59e0b", // A amber
  "#ef4444", // R red
  "#ec4899", // Q pink
];

// Rings that support multi-select (L=Location, A=Association, R=Relief)
export const MULTI_SELECT_RINGS = new Set([2, 4, 5]);
